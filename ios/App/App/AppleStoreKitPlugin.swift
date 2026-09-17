import Capacitor
import StoreKit

// Stage 1: Actor-isolated mutable state for StoreKit transactions.
// This prevents purchase, update, restore and finish from racing on the
// shared dictionaries and the "purchase in progress" flag.
private actor StoreKitState {
    var isPurchasing = false
    var pendingTransactions: [String: [String: Any]] = [:]
    var transactionObjects: [String: Transaction] = [:]
    var transactionUpdatesTask: Task<Void, Never>?

    func startPurchase() -> Bool {
        if isPurchasing { return false }
        isPurchasing = true
        return true
    }

    func endPurchase() {
        isPurchasing = false
    }

    func setPendingTransaction(_ id: String, _ data: [String: Any]) {
        pendingTransactions[id] = data
    }

    func setTransactionObject(_ id: String, _ transaction: Transaction) {
        transactionObjects[id] = transaction
    }

    func getTransactionObject(_ id: String) -> Transaction? {
        return transactionObjects[id]
    }

    func removeTransaction(_ id: String) {
        pendingTransactions.removeValue(forKey: id)
        transactionObjects.removeValue(forKey: id)
    }

    func cancelAndSetUpdatesTask(_ task: Task<Void, Never>?) {
        transactionUpdatesTask?.cancel()
        transactionUpdatesTask = task
    }
}

@objc(AppleStoreKitPlugin)
public class AppleStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleStoreKitPlugin"
    public let jsName = "AppleStoreKitPlugin"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(
            name: "getProducts",
            returnType: CAPPluginReturnPromise
        ),
        CAPPluginMethod(
            name: "purchase",
            returnType: CAPPluginReturnPromise
        ),
        CAPPluginMethod(
            name: "finishTransaction",
            returnType: CAPPluginReturnPromise
        ),
        CAPPluginMethod(
            name: "restorePurchases",
            returnType: CAPPluginReturnPromise
        ),
    ]

    private let monthlyProductId = "com.SiteNear.pro.monthly"
    private let yearlyProductId = "com.SiteNear.pro.yearly"
    private let state = StoreKitState()

    private var expectedProductIds: [String] {
        [monthlyProductId, yearlyProductId]
    }

    public override func load() {
        print("[AppleStoreKit] Plugin loaded, setting up transaction updates listener")
        setupTransactionUpdatesListener()
    }

    public func unload() {
        // Stage 1: Cancel transaction updates listener when plugin is released
        print("[AppleStoreKit] Plugin unloading, cancelling transaction updates listener")
        Task { [weak self] in
            await self?.state.cancelAndSetUpdatesTask(nil)
        }
    }

    public func setupTransactionUpdatesListener() {
        // Cancel existing listener if any
        Task { [weak self] in
            await self?.state.cancelAndSetUpdatesTask(nil)
        }

        // Create new listener
        Task { [weak self] in
            guard let self else { return }

            let task = Task { [weak self] in
                for await result in Transaction.updates {
                    if let self {
                        await self.handleTransactionUpdate(result)
                    }
                }
            }

            await state.cancelAndSetUpdatesTask(task)
            print("[AppleStoreKit] Transaction updates listener established")
        }
    }

    private func handleTransactionUpdate(_ verificationResult: VerificationResult<Transaction>) async {
        switch verificationResult {
        case .verified(let transaction):
            await handleVerifiedTransaction(transaction, verificationResult: verificationResult)
        case .unverified(let transaction, let error):
            print("[AppleStoreKit] Unverified transaction received: \(transaction), error: \(error)")
            // Do not grant permissions for unverified transactions
        @unknown default:
            print("[AppleStoreKit] Unknown verification result")
        }
    }

    private func handleVerifiedTransaction(_ transaction: Transaction, verificationResult: VerificationResult<Transaction>) async {
        let transactionId = String(transaction.id)
        let originalTransactionId = String(transaction.originalID)
        let productId = transaction.productID

        print("[AppleStoreKit] Verified transaction received: \(transactionId), productId: \(productId)")

        // Store transaction object for later finishing
        await state.setTransactionObject(transactionId, transaction)

        // Stage 1: Extract JWS from verification result
        // Note: jwsRepresentation is available on VerificationResult<Transaction> in iOS 15+ for StoreKit 2
        #if compiler(>=5.5)
        if #available(iOS 15.0, *) {
            // Try to extract JWS from verification result
            let transactionJws = verificationResult.jwsRepresentation

            let transactionData: [String: Any] = [
                "transactionId": transactionId,
                "originalTransactionId": originalTransactionId,
                "productId": productId,
                "transactionJws": transactionJws,
                "result": "verified",
            ]

            // Stage 1: Store in pending transactions on the isolated actor
            await state.setPendingTransaction(transactionId, transactionData)

            // Notify JavaScript via Capacitor event
            notifyTransactionUpdated(transactionData)
        } else {
            // Fallback for iOS < 15 - should not happen for StoreKit 2
            print("[AppleStoreKit] iOS 15+ required for JWS representation")
            let transactionData: [String: Any] = [
                "transactionId": transactionId,
                "originalTransactionId": originalTransactionId,
                "productId": productId,
                "result": "unverified",
                "error": "iOS 15+ required for JWS representation",
            ]
            notifyTransactionUpdated(transactionData)
        }
        #else
        let transactionData: [String: Any] = [
            "transactionId": transactionId,
            "originalTransactionId": originalTransactionId,
            "productId": productId,
            "result": "unverified",
            "error": "iOS 15+ required for JWS representation",
        ]
        notifyTransactionUpdated(transactionData)
        #endif

        // Do NOT finish transaction yet - will be done after backend verification
        // Do NOT grant Pro permissions yet - will be done after backend verification
    }

    private func notifyTransactionUpdated(_ transactionData: [String: Any]) {
        // Stage 1: Use the Capacitor notifyListeners retainUntilConsumed parameter
        // so events are held until the JavaScript listener consumes them.
        notifyListeners(
            "transactionUpdated",
            data: transactionData,
            retainUntilConsumed: true
        )
        print("[AppleStoreKit] Notified JavaScript of transaction update: \(transactionData["transactionId"] ?? "unknown")")
    }

    private struct ProductDiagnostics {
        let expectedProductIds: [String]
        let returnedProductIds: [String]
        let missingProductIds: [String]
        let duplicateProductIds: [String]
        let unexpectedProductIds: [String]

        var hasIssues: Bool {
            !missingProductIds.isEmpty || !duplicateProductIds.isEmpty || !unexpectedProductIds.isEmpty
        }

        var dictionary: [String: Any] {
            [
                "expectedProductIds": expectedProductIds,
                "returnedProductIds": returnedProductIds,
                "missingProductIds": missingProductIds,
                "duplicateProductIds": duplicateProductIds,
                "unexpectedProductIds": unexpectedProductIds,
            ]
        }
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        print("[AppleStoreKit] getProducts called")
        print("[AppleStoreKit] expected IDs: \(expectedProductIds)")

        Task { [weak self] in
            guard let self else {
                call.reject("Plugin released before products could be loaded")
                return
            }

            do {
                let products = try await Product.products(for: expectedProductIds)
                print("[AppleStoreKit] returned IDs: \(products.map { $0.id })")

                let diagnostics = self.buildDiagnostics(products: products)

                if diagnostics.hasIssues || products.count != expectedProductIds.count {
                    print("[AppleStoreKit] getProducts failed: \(self.makeDiagnosticErrorMessage(diagnostics: diagnostics))")
                    call.reject(self.makeDiagnosticErrorMessage(diagnostics: diagnostics))
                    return
                }

                let introEligibility = await self.loadIntroEligibility(products: products)
                let orderedProducts = expectedProductIds.compactMap { productId in
                    products.first { $0.id == productId }
                }

                let payload = orderedProducts.map { product in
                    var item: [String: Any] = [
                        "productId": product.id,
                        "displayName": product.displayName,
                        "displayDescription": product.description,
                        "displayPrice": product.displayPrice,
                    ]

                    if let period = product.subscription?.subscriptionPeriod {
                        item["subscriptionPeriod"] = [
                            "value": period.value,
                            "unit": self.mapSubscriptionPeriodUnit(period.unit),
                        ]
                    }

                    if let subscription = product.subscription {
                        item["subscriptionGroupId"] = subscription.subscriptionGroupID
                        item["isEligibleForIntroOffer"] = introEligibility[subscription.subscriptionGroupID] ?? false

                        if #available(iOS 15.4, *), let introductoryOffer = subscription.introductoryOffer {
                            item["introductoryOffer"] = self.mapIntroductoryOffer(introductoryOffer)
                        }
                    }

                    return item
                }

                call.resolve([
                    "products": payload,
                    "diagnostics": diagnostics.dictionary,
                ])
            } catch {
                print("[AppleStoreKit] getProducts failed: \(error)")
                call.reject("Failed to load StoreKit products: \(error.localizedDescription)")
            }
        }
    }

    private func buildDiagnostics(products: [Product]) -> ProductDiagnostics {
        let returnedProductIds = products.map { $0.id }
        let expectedProductIdSet = Set(expectedProductIds)
        let returnedProductIdSet = Set(returnedProductIds)
        let duplicateProductIds = returnedProductIds
            .reduce(into: [String: Int]()) { counts, productId in
                counts[productId, default: 0] += 1
            }
            .filter { $0.value > 1 }
            .map { $0.key }
            .sorted()

        let missingProductIds = expectedProductIds.filter { !returnedProductIdSet.contains($0) }
        let unexpectedProductIds = returnedProductIds.filter { !expectedProductIdSet.contains($0) }

        return ProductDiagnostics(
            expectedProductIds: expectedProductIds,
            returnedProductIds: returnedProductIds,
            missingProductIds: missingProductIds,
            duplicateProductIds: duplicateProductIds,
            unexpectedProductIds: unexpectedProductIds
        )
    }

    private func makeDiagnosticErrorMessage(diagnostics: ProductDiagnostics) -> String {
        var details: [String] = []

        if !diagnostics.missingProductIds.isEmpty {
            details.append("missing=\(diagnostics.missingProductIds.joined(separator: ","))")
        }

        if !diagnostics.duplicateProductIds.isEmpty {
            details.append("duplicate=\(diagnostics.duplicateProductIds.joined(separator: ","))")
        }

        if !diagnostics.unexpectedProductIds.isEmpty {
            details.append("unexpected=\(diagnostics.unexpectedProductIds.joined(separator: ","))")
        }

        let suffix = details.isEmpty ? "" : " (\(details.joined(separator: "; "))"
        return "StoreKit product load validation failed\(suffix)"
    }

    private func loadIntroEligibility(products: [Product]) async -> [String: Bool] {
        let groupIds = Set(products.compactMap { $0.subscription?.subscriptionGroupID })
        var eligibilityByGroupId: [String: Bool] = [:]

        for groupId in groupIds {
            if #available(iOS 15.4, *) {
                eligibilityByGroupId[groupId] = await Product.SubscriptionInfo.isEligibleForIntroOffer(for: groupId)
            } else {
                eligibilityByGroupId[groupId] = false
            }
        }

        return eligibilityByGroupId
    }

    private func mapIntroductoryOffer(_ offer: Product.SubscriptionOffer) -> [String: Any] {
        [
            "displayPrice": offer.displayPrice,
            "period": [
                "value": offer.period.value,
                "unit": self.mapSubscriptionPeriodUnit(offer.period.unit),
            ],
            "periodCount": offer.periodCount,
        ]
    }

    private func mapSubscriptionPeriodUnit(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day:
            return "day"
        case .week:
            return "week"
        case .month:
            return "month"
        case .year:
            return "year"
        @unknown default:
            return "month"
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }

        guard expectedProductIds.contains(productId) else {
            call.reject("Invalid productId: \(productId)")
            return
        }

        Task { [weak self] in
            guard let self else { return }

            let canStart = await state.startPurchase()
            guard canStart else {
                call.reject("Purchase already in progress")
                return
            }

            // Ensure the flag is always cleared when the task completes
            defer {
                Task { [weak self] in
                    await self?.state.endPurchase()
                }
            }

            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()

                switch result {
                case .success(let verificationResult):
                    // Stage 1: Only accept verified transactions and return JWS
                    switch verificationResult {
                    case .verified(let transaction):
                        let transactionId = String(transaction.id)
                        let originalTransactionId = String(transaction.originalID)

                        // Stage 1: Extract JWS from verification result
                        var transactionJws: String? = nil
                        #if compiler(>=5.5)
                        if #available(iOS 15.0, *) {
                            transactionJws = verificationResult.jwsRepresentation
                        }
                        #endif

                        guard let jws = transactionJws, !jws.isEmpty else {
                            call.resolve([
                                "result": "unverified",
                                "productId": productId,
                                "error": "JWS representation not available (iOS 15+ required)",
                            ])
                            return
                        }

                        // Store in pending transactions for later finishing
                        let transactionData: [String: Any] = [
                            "transactionId": transactionId,
                            "originalTransactionId": originalTransactionId,
                            "productId": productId,
                            "transactionJws": jws,
                            "result": "verified",
                        ]
                        await state.setPendingTransaction(transactionId, transactionData)

                        // Store transaction object for finishTransaction
                        await state.setTransactionObject(transactionId, transaction)

                        // Do NOT finish transaction yet - will be done after backend verification

                        call.resolve([
                            "result": "success",
                            "transactionId": transactionId,
                            "originalTransactionId": originalTransactionId,
                            "productId": productId,
                            "transactionJws": jws,
                        ])

                    case .unverified:
                        call.resolve([
                            "result": "unverified",
                            "productId": productId,
                            "error": "Transaction could not be verified",
                        ])
                    }

                case .pending:
                    call.resolve([
                        "result": "pending",
                        "productId": productId,
                    ])

                case .userCancelled:
                    call.resolve([
                        "result": "userCancelled",
                        "productId": productId,
                    ])

                @unknown default:
                    call.resolve([
                        "result": "unknown",
                        "productId": productId,
                        "error": "Unknown purchase result",
                    ])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func finishTransaction(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId") else {
            call.reject("transactionId is required")
            return
        }

        // Find transaction object from saved transactions
        Task { [weak self] in
            guard let self else { return }

            guard let transaction = await state.getTransactionObject(transactionId) else {
                // Transaction already finished or not found - this is idempotent
                print("[AppleStoreKit] Transaction already finished or not found: \(transactionId)")
                call.resolve()
                return
            }

            // Finish the transaction
            await transaction.finish()
            print("[AppleStoreKit] Transaction finished: \(transactionId)")

            // Remove from saved transactions
            await state.removeTransaction(transactionId)

            call.resolve()
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task { [weak self] in
            guard let self else { return }

            // Stage 2: Foreground sync no longer calls AppStore.sync() to avoid
            // repeated user authorization prompts. Transaction.currentEntitlements
            // provides the local entitlement state for StoreKit 2.

            // Iterate through current entitlements
            var restoredTransactions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    let transactionId = String(transaction.id)
                    let originalTransactionId = String(transaction.originalID)
                    let productId = transaction.productID

                    // Check if transaction is revoked
                    let revocationDate = transaction.revocationDate
                    let isRevoked = revocationDate != nil

                    // Check if subscription is expired
                    let expirationDate = transaction.expirationDate
                    let isExpired = expirationDate != nil && expirationDate! < Date()

                    // Only accept verified, non-revoked, and active subscriptions
                    if !isRevoked && !isExpired {
                        // Stage 1: Extract JWS from verification result
                        var transactionJws: String? = nil
                        #if compiler(>=5.5)
                        if #available(iOS 15.0, *) {
                            transactionJws = result.jwsRepresentation
                        }
                        #endif

                        guard let jws = transactionJws, !jws.isEmpty else {
                            print("[AppleStoreKit] Skipping transaction without JWS: \(transactionId)")
                            continue
                        }

                        let transactionData: [String: Any] = [
                            "transactionId": transactionId,
                            "originalTransactionId": originalTransactionId,
                            "productId": productId,
                            "transactionJws": jws,
                            "result": "verified",
                            "isRevoked": isRevoked,
                            "isExpired": isExpired,
                        ]
                        restoredTransactions.append(transactionData)

                        // Store transaction object for potential finishing
                        await state.setTransactionObject(transactionId, transaction)
                    }

                case .unverified:
                    // Skip unverified transactions
                    continue
                }
            }

            call.resolve([
                "result": "success",
                "restoredTransactions": restoredTransactions,
            ])
        }
    }
}
