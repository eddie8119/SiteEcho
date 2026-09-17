package com.SiteNear.fieldalbum;

import android.net.Uri;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin {
    private static final String TAG = "GooglePlayBilling";
    private static final String GOOGLE_PLAY_SUBSCRIPTION_ID = "SiteNear_pro";
    private static final String MONTHLY_BASE_PLAN_ID = "monthly";
    private static final String YEARLY_BASE_PLAN_ID = "yearly";

    private BillingClient billingClient;
    private final List<ProductDetails> productDetailsList = new ArrayList<>();
    private final Map<String, Purchase> purchaseCache = new HashMap<>();
    private boolean isBillingClientReady = false;
    private final Object lock = new Object();
    private String pendingRestoreCallbackId = null;

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        if (billingClient != null) {
            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        isBillingClientReady = true;
                        queryPurchasesAsync();
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    isBillingClientReady = false;
                    // Automatic reconnection will be attempted
                }
            });
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null && billingClient.isReady()) {
            billingClient.endConnection();
            billingClient = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        if (billingClient != null) {
            call.resolve(new JSObject().put("alreadyInitialized", true));
            return;
        }

        getActivity().runOnUiThread(() -> {
            billingClient = BillingClient.newBuilder(getContext())
                    .setListener(purchasesUpdatedListener)
                    .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                    .build();

            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        isBillingClientReady = true;
                        JSObject result = new JSObject();
                        result.put("success", true);
                        result.put("connected", true);
                        call.resolve(result);
                        queryPurchasesAsync();
                    } else {
                        isBillingClientReady = false;
                        call.reject("Billing setup failed: " + billingResult.getDebugMessage());
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    isBillingClientReady = false;
                    notifyBillingConnectionChanged(false, "SERVICE_DISCONNECTED");
                }
            });
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        if (!assertBillingClientReady(call)) return;

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(GOOGLE_PLAY_SUBSCRIPTION_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, detailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query product details: " + billingResult.getDebugMessage());
                return;
            }

            List<ProductDetails> detailsList = detailsResult != null && detailsResult.getProductDetailsList() != null
                    ? detailsResult.getProductDetailsList()
                    : Collections.<ProductDetails>emptyList();

            synchronized (lock) {
                productDetailsList.clear();
                productDetailsList.addAll(detailsList);
            }

            JSObject result = new JSObject();
            JSArray productsArray = new JSArray();
            try {
                for (ProductDetails details : detailsList) {
                    productsArray.put(productDetailsToJson(details));
                }
            } catch (JSONException e) {
                Log.e(TAG, "Error converting product details to JSON", e);
            }
            result.put("products", productsArray);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (!assertBillingClientReady(call)) return;

        String basePlanId = call.getString("basePlanId", MONTHLY_BASE_PLAN_ID);
        String obfuscatedAccountId = call.getString("obfuscatedAccountId");

        ProductDetails product = findProductForBasePlan(basePlanId);
        if (product == null) {
            call.reject("Product not found for base plan: " + basePlanId);
            return;
        }

        ProductDetails.SubscriptionOfferDetails offerDetails = findBestOffer(product, basePlanId);
        if (offerDetails == null) {
            call.reject("Offer not found for base plan: " + basePlanId);
            return;
        }

        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList =
                Collections.singletonList(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(product)
                                .setOfferToken(offerDetails.getOfferToken())
                                .build()
                );

        BillingFlowParams.Builder flowParamsBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList);

        if (obfuscatedAccountId != null && !obfuscatedAccountId.isEmpty()) {
            flowParamsBuilder.setObfuscatedAccountId(obfuscatedAccountId);
        }

        BillingFlowParams flowParams = flowParamsBuilder.build();
        BillingResult billingResult = billingClient.launchBillingFlow(getActivity(), flowParams);

        JSObject result = new JSObject();
        result.put("billingFlowStarted", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
        result.put("responseCode", billingResult.getResponseCode());
        result.put("debugMessage", billingResult.getDebugMessage());
        call.resolve(result);
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!assertBillingClientReady(call)) return;

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                return;
            }

            synchronized (lock) {
                purchaseCache.clear();
                if (purchases != null) {
                    for (Purchase purchase : purchases) {
                        purchaseCache.put(purchase.getPurchaseToken(), purchase);
                    }
                }
            }

            JSObject result = new JSObject();
            JSArray purchasesArray = new JSArray();
            try {
                for (Purchase purchase : purchases != null ? purchases : Collections.<Purchase>emptyList()) {
                    purchasesArray.put(purchaseToJson(purchase));
                }
            } catch (JSONException e) {
                Log.e(TAG, "Error converting purchase to JSON", e);
            }
            result.put("purchases", purchasesArray);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void openSubscriptionManagement(PluginCall call) {
        String packageName = getContext().getPackageName();
        Uri uri = Uri.parse("https://play.google.com/store/account/subscriptions?package=" + packageName);
        if (getActivity() != null) {
            androidx.browser.customtabs.CustomTabsIntent intent = new androidx.browser.customtabs.CustomTabsIntent.Builder().build();
            intent.launchUrl(getActivity(), uri);
        }
        call.resolve(new JSObject().put("opened", true));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (!assertBillingClientReady(call)) return;

        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required");
            return;
        }

        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            JSObject result = new JSObject();
            result.put("success", billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
            result.put("responseCode", billingResult.getResponseCode());
            result.put("debugMessage", billingResult.getDebugMessage());
            call.resolve(result);
        });
    }

    private final PurchasesUpdatedListener purchasesUpdatedListener = new PurchasesUpdatedListener() {
        @Override
        public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
            if (purchases != null) {
                synchronized (lock) {
                    for (Purchase purchase : purchases) {
                        purchaseCache.put(purchase.getPurchaseToken(), purchase);
                    }
                }

                JSObject data = new JSObject();
                JSArray purchasesArray = new JSArray();
                try {
                    for (Purchase purchase : purchases) {
                        purchasesArray.put(purchaseToJson(purchase));
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error converting purchase to JSON", e);
                }
                data.put("purchases", purchasesArray);
                data.put("responseCode", billingResult.getResponseCode());
                data.put("debugMessage", billingResult.getDebugMessage());
                notifyListeners("purchaseUpdated", data);
            }

            notifyBillingConnectionChanged(isBillingClientReady, billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK ? "OK" : billingResult.getDebugMessage());
        }
    };

    private void queryPurchasesAsync() {
        if (billingClient == null || !billingClient.isReady()) return;

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                synchronized (lock) {
                    purchaseCache.clear();
                    for (Purchase purchase : purchases) {
                        purchaseCache.put(purchase.getPurchaseToken(), purchase);
                    }
                }

                JSObject data = new JSObject();
                JSArray purchasesArray = new JSArray();
                try {
                    for (Purchase purchase : purchases) {
                        purchasesArray.put(purchaseToJson(purchase));
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Error converting purchase to JSON", e);
                }
                data.put("purchases", purchasesArray);
                notifyListeners("purchaseUpdated", data);
            }
        });
    }

    private boolean assertBillingClientReady(PluginCall call) {
        if (billingClient == null) {
            call.reject("BillingClient not initialized. Call initialize() first.");
            return false;
        }
        if (!isBillingClientReady) {
            call.reject("BillingClient is not connected to Google Play.");
            return false;
        }
        return true;
    }

    private ProductDetails findProductForBasePlan(String basePlanId) {
        synchronized (lock) {
            for (ProductDetails product : productDetailsList) {
                if (GOOGLE_PLAY_SUBSCRIPTION_ID.equals(product.getProductId())) {
                    return product;
                }
            }
        }
        return null;
    }

    private ProductDetails.SubscriptionOfferDetails findBestOffer(ProductDetails product, String basePlanId) {
        List<ProductDetails.SubscriptionOfferDetails> offers = product.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;

        // Prefer 14-day free trial if available and base plan matches
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            String offerBasePlanId = offer.getBasePlanId();
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            if (phases != null && !phases.isEmpty()) {
                ProductDetails.PricingPhase firstPhase = phases.get(0);
                if (offerBasePlanId.equals(basePlanId) && firstPhase.getRecurrenceMode() == ProductDetails.RecurrenceMode.FINITE_RECURRING && firstPhase.getBillingCycleCount() == 1) {
                    return offer;
                }
            }
        }

        // Fallback to the first offer with matching base plan
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (basePlanId.equals(offer.getBasePlanId())) {
                return offer;
            }
        }

        return null;
    }

    private JSONObject productDetailsToJson(ProductDetails details) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("productId", details.getProductId());
        json.put("productType", details.getProductType());
        json.put("name", details.getName());
        json.put("title", details.getTitle());
        json.put("description", details.getDescription());

        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        JSONArray offersArray = new JSONArray();
        if (offers != null) {
            for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                JSONObject offerJson = new JSONObject();
                offerJson.put("offerId", offer.getOfferId());
                offerJson.put("offerToken", offer.getOfferToken());
                offerJson.put("basePlanId", offer.getBasePlanId());

                JSONArray phasesArray = new JSONArray();
                List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                if (phases != null) {
                    for (ProductDetails.PricingPhase phase : phases) {
                        JSONObject phaseJson = new JSONObject();
                        phaseJson.put("formattedPrice", phase.getFormattedPrice());
                        phaseJson.put("priceAmountMicros", phase.getPriceAmountMicros());
                        phaseJson.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                        phaseJson.put("billingPeriod", phase.getBillingPeriod());
                        phaseJson.put("billingCycleCount", phase.getBillingCycleCount());
                        phaseJson.put("recurrenceMode", phase.getRecurrenceMode());
                        phasesArray.put(phaseJson);
                    }
                }
                offerJson.put("pricingPhases", phasesArray);
                offersArray.put(offerJson);
            }
        }
        json.put("offers", offersArray);
        return json;
    }

    private JSONObject purchaseToJson(Purchase purchase) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("purchaseToken", purchase.getPurchaseToken());
        json.put("productIds", new JSONArray(purchase.getProducts()));
        json.put("packageName", purchase.getPackageName());
        json.put("purchaseState", purchase.getPurchaseState());
        json.put("acknowledged", purchase.isAcknowledged());
        json.put("autoRenewing", purchase.isAutoRenewing());
        json.put("purchaseTime", purchase.getPurchaseTime());
        json.put("orderId", purchase.getOrderId());
        json.put("obfuscatedAccountId", purchase.getAccountIdentifiers() != null ? purchase.getAccountIdentifiers().getObfuscatedAccountId() : null);
        return json;
    }

    private void notifyBillingConnectionChanged(boolean connected, String status) {
        JSObject data = new JSObject();
        data.put("connected", connected);
        data.put("status", status);
        notifyListeners("billingConnectionChanged", data);
    }
}
