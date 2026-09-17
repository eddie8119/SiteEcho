<template>
  <MobilePageLayout :title="t('title.terms')">
    <div class="space-y-6">
      <H1Title :title="t('title.terms')" />
      <p class="text-sm text-gray-500">Last updated: August 19, 2026</p>

      <p class="text-gray-700">
        Please read these Terms of Use ("Terms", "EULA") carefully before using the SiteNear mobile
        application and related services ("Service", "App"). By downloading, installing, accessing,
        or using the App, you agree to be bound by these Terms. If you do not agree, do not use the
        App.
      </p>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">1. License</h2>
        <p class="text-gray-700">
          SiteNear grants you a limited, non-exclusive, non-transferable, revocable license to use
          the App for your personal or business use, subject to these Terms and all applicable laws.
          We reserve all rights not expressly granted to you.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">2. Accounts</h2>
        <p class="text-gray-700">
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activities that occur under your account. You agree to provide accurate and
          complete information when creating an account and to update it as necessary. SiteNear is
          not liable for any loss or damage arising from your failure to keep your account secure.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          3. Subscriptions, Payments, and Auto-Renewal
        </h2>

        <div class="space-y-2">
          <h3 class="text-base font-semibold text-gray-900">3.1 Subscription terms</h3>
          <p class="text-gray-700">
            SiteNear offers auto-renewable subscriptions that grant access to premium features.
            Subscription periods and pricing are displayed in the App and may vary by region or
            promotion. By selecting a subscription, you authorize us or Apple (as the applicable
            payment processor) to charge the applicable fee.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-semibold text-gray-900">3.2 Auto-renewal and cancellation</h3>
          <p class="text-gray-700">
            All subscriptions automatically renew for the same period unless you cancel at least 24
            hours before the end of the current billing period. You can manage or cancel your
            subscription at any time through your Apple ID subscription settings (Settings > [your
            name] > Subscriptions on iOS).
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-semibold text-gray-900">3.3 Price changes</h3>
          <p class="text-gray-700">
            Subscription prices may change. If the price of your subscription changes, we will
            notify you in advance where required, and the change will take effect upon your next
            renewal. You may cancel before the renewal to avoid the new price.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-semibold text-gray-900">3.4 Refunds</h3>
          <p class="text-gray-700">
            Payments are generally non-refundable. Refund requests are handled by Apple according to
            Apple's refund policies. We do not directly process refunds for purchases made through
            the App Store.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-semibold text-gray-900">3.5 Free trial</h3>
          <p class="text-gray-700">
            When a free trial is offered, the subscription will automatically convert to a paid
            subscription at the end of the trial period unless you cancel at least 24 hours before
            the trial expires.
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">4. Acceptable Use</h2>
        <p class="text-gray-700">You agree not to:</p>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>use the App for any unlawful purpose;</li>
          <li>
            upload, store, or share content that violates intellectual property or privacy rights;
          </li>
          <li>attempt to interfere with, disrupt, or reverse-engineer the App or its services;</li>
          <li>use the App to transmit malware, spam, or other harmful material.</li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">5. Content and Intellectual Property</h2>
        <p class="text-gray-700">
          You retain ownership of any content you create or upload using the App. You grant SiteNear
          a limited license to host, process, and store your content solely for the purpose of
          providing the Service. All App design, code, trademarks, and non-user content are the
          property of SiteNear or its licensors.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">6. Termination</h2>
        <p class="text-gray-700">
          We may suspend or terminate your access to the App at any time if you violate these Terms
          or for any other reason, with or without notice. You may stop using the App and cancel
          your subscription at any time.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          7. Disclaimers and Limitation of Liability
        </h2>
        <p class="text-gray-700">
          The App is provided "as is" and "as available" without warranties of any kind. SiteNear
          does not guarantee that the App will be uninterrupted, error-free, or secure. To the
          fullest extent permitted by law, SiteNear shall not be liable for any indirect,
          incidental, special, or consequential damages arising out of or in connection with your
          use of the App.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">8. Governing Law</h2>
        <p class="text-gray-700">
          These Terms shall be governed by and construed in accordance with the laws of Taiwan,
          without regard to its conflict-of-law principles.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">9. Changes to These Terms</h2>
        <p class="text-gray-700">
          We may update these Terms from time to time. The updated version will be posted at this
          URL and will be effective as of the date stated at the top. Your continued use of the App
          after changes means you accept the revised Terms.
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">10. Contact Us</h2>
        <p class="text-gray-700">
          If you have any questions about these Terms, please contact us at:
        </p>
        <p class="text-gray-700">
          Email:
          <a :href="`mailto:${BRAND_LINK.email}`" class="text-brand-primary underline">{{
            BRAND_LINK.email
          }}</a>
        </p>
        <p class="text-gray-700">
          Website:
          <a
            :href="BRAND_LINK.production"
            target="_blank"
            rel="noopener noreferrer"
            class="text-brand-primary underline"
            >{{ BRAND_LINK.production }}</a
          >
        </p>
      </div>
    </div>
  </MobilePageLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import H1Title from '@/components/core/title/H1Title.vue';
import { BRAND_LINK } from '@/constants/link';
import MobilePageLayout from '@/layouts/MobilePageLayout.vue';

const { t } = useI18n();
</script>

<style scoped>
ul {
  list-style-type: disc;
}

li {
  list-style-type: inherit;
}
</style>
