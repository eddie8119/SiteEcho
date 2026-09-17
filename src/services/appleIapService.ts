import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import type {
  StoreKitPurchaseSuccess,
  StoreKitRestoredTransaction,
  StoreKitTransactionUpdate,
  StoreKitVerifiedTransaction,
} from '@/types/billing';

import { billingApi } from '@/api/billing';
import { AppleStoreKit } from '@/plugins/appleStoreKit';

type ProcessableTransaction =
  | StoreKitPurchaseSuccess
  | StoreKitVerifiedTransaction
  | StoreKitRestoredTransaction;

/**
 * Stage 2: Singleton service for Apple IAP
 * Centralizes all transaction processing and prevents duplicate backend calls
 */
class AppleIapService {
  private static instance: AppleIapService | null = null;
  private isInitialized = false;
  private isNative = Capacitor.isNativePlatform();
  private isIOS = Capacitor.getPlatform() === 'ios';
  private transactionListenerRef: { remove: () => void } | null = null;
  private appStateListenerRef: { remove: () => void } | null = null;
  private processingTransactions = new Set<string>();
  private completedTransactions = new Set<string>();
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncingEntitlements = false;
  private static readonly COMPLETED_TRANSACTIONS_KEY = 'iap_completed_transactions';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AppleIapService {
    if (!AppleIapService.instance) {
      AppleIapService.instance = new AppleIapService();
    }
    return AppleIapService.instance;
  }

  isAvailable(): boolean {
    return this.isNative && this.isIOS;
  }

  /**
   * Initialize the IAP service - should be called once at app startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isAvailable()) {
      return;
    }

    await this.loadCompletedTransactions();
    await this.setupTransactionListener();
    await this.setupAppStateListener();
    this.isInitialized = true;
  }

  /**
   * Cleanup the IAP service
   */
  async cleanup(): Promise<void> {
    await this.removeTransactionListener();
    await this.removeAppStateListener();
    this.isInitialized = false;
  }

  private async loadCompletedTransactions(): Promise<void> {
    try {
      const { value } = await Preferences.get({
        key: AppleIapService.COMPLETED_TRANSACTIONS_KEY,
      });
      if (value) {
        const parsed = JSON.parse(value) as string[];
        this.completedTransactions = new Set(parsed);
      }
    } catch {
      return;
    }
  }

  private async saveCompletedTransactions(): Promise<void> {
    try {
      await Preferences.set({
        key: AppleIapService.COMPLETED_TRANSACTIONS_KEY,
        value: JSON.stringify([...this.completedTransactions]),
      });
    } catch {
      return;
    }
  }

  private async setupTransactionListener(): Promise<void> {
    if (this.transactionListenerRef) {
      return;
    }

    try {
      const listener = await AppleStoreKit.addListener('transactionUpdated', (data) => {
        void this.handleTransactionUpdate(data);
      });
      this.transactionListenerRef = listener;
    } catch {
      return;
    }
  }

  private async removeTransactionListener(): Promise<void> {
    if (this.transactionListenerRef) {
      await this.transactionListenerRef.remove();
      this.transactionListenerRef = null;
    }
  }

  private async setupAppStateListener(): Promise<void> {
    if (this.appStateListenerRef) {
      return;
    }

    try {
      const listener = await CapacitorApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          return;
        }

        if (this.syncDebounceTimer) {
          clearTimeout(this.syncDebounceTimer);
        }

        this.syncDebounceTimer = setTimeout(() => {
          void this.syncCurrentEntitlements();
        }, 1000);
      });
      this.appStateListenerRef = listener;
    } catch {
      return;
    }
  }

  private async removeAppStateListener(): Promise<void> {
    if (this.appStateListenerRef) {
      await this.appStateListenerRef.remove();
      this.appStateListenerRef = null;
    }
  }

  /**
   * Stage 2: Single entry for all verified/success transaction paths
   */
  async processTransaction(
    data: ProcessableTransaction
  ): Promise<{ success: boolean; transactionId: string; error?: string }> {
    const transactionId = String(data.transactionId);

    if (this.completedTransactions.has(transactionId)) {
      return { success: true, transactionId };
    }

    if (this.processingTransactions.has(transactionId)) {
      return { success: false, transactionId, error: 'Transaction already being processed' };
    }

    if (!data.transactionJws) {
      return { success: false, transactionId, error: 'Missing transactionJws' };
    }

    this.processingTransactions.add(transactionId);

    try {
      await billingApi.verifyAppleReceipt({ transactionJws: data.transactionJws });

      await this.finishTransaction(transactionId);
      this.completedTransactions.add(transactionId);
      await this.saveCompletedTransactions();

      return { success: true, transactionId };
    } catch (verificationError) {
      return {
        success: false,
        transactionId,
        error:
          verificationError instanceof Error
            ? verificationError.message
            : 'Backend verification failed',
      };
    } finally {
      this.processingTransactions.delete(transactionId);
    }
  }

  /**
   * Stage 2: Read current entitlements on foreground with debounce and dedup
   */
  private async syncCurrentEntitlements(): Promise<void> {
    if (!this.isAvailable() || this.isSyncingEntitlements) {
      return;
    }

    this.isSyncingEntitlements = true;

    try {
      const res = await AppleStoreKit.restorePurchases();

      if (res.result !== 'success' || !res.restoredTransactions) {
        return;
      }

      for (const transaction of res.restoredTransactions) {
        await this.processTransaction(transaction);
      }
    } catch {
      return;
    } finally {
      this.isSyncingEntitlements = false;
    }
  }

  private async handleTransactionUpdate(data: StoreKitTransactionUpdate): Promise<void> {
    if (data.result === 'verified') {
      await this.processTransaction(data);
    } else {
      return;
    }
  }

  private async finishTransaction(transactionId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Apple IAP is not available');
    }

    await AppleStoreKit.finishTransaction({ transactionId });
  }
}

// Export singleton instance
export const appleIapService = AppleIapService.getInstance();
