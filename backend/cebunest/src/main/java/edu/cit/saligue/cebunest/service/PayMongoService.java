package edu.cit.saligue.cebunest.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wraps the PayMongo Checkout API.
 * Docs: https://developers.paymongo.com/docs/checkout-api
 */
@Service
@RequiredArgsConstructor
public class PayMongoService {

    @Value("${paymongo.secret-key}")
    private String secretKey;

    @Value("${paymongo.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${paymongo.cancel-url:http://localhost:5173/my-rentals?payment=cancelled}")
    private String cancelUrl;

    private static final String BASE_URL = "https://api.paymongo.com/v1";
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Creates a PayMongo Checkout Session and returns { checkoutUrl, paymentLinkId }.
     *
     * @param amountPhp   Amount in PHP (will be converted to centavos).
     * @param description Description shown on the checkout page.
     * @param referenceId Our internal reference (e.g. "payment-42").
     * @param paymentId   Our RentalPayment PK — embedded in the success redirect URL
     *                    so RentalDetail can auto-verify on return.
     * @param requestId   The rental request ID — success URL lands back on the rental detail page.
     */
    public Map<String, String> createPaymentLink(
            double amountPhp,
            String description,
            String referenceId,
            Long paymentId,
            Long requestId) {  // FIX: was (propertyId), now (requestId)

        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Basic " + auth);

        long amountCentavos = Math.round(amountPhp * 100);

        // FIX: redirect to /my-rentals/:requestId so RentalDetail's auto-verify
        // useEffect fires correctly on return from PayMongo.
        // Previously pointed to /properties/:propertyId which has no verify logic.
        String successUrl = frontendUrl
                + "/my-rentals/" + requestId
                + "?payment_id=" + paymentId
                + "&payment=success";

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("send_email_receipt", true);
        attributes.put("show_description", true);
        attributes.put("show_line_items", true);
        attributes.put("description", description);
        attributes.put("reference_number", referenceId);
        attributes.put("success_url", successUrl);
        attributes.put("cancel_url", cancelUrl);
        attributes.put("payment_method_types",
                List.of("gcash", "paymaya", "card", "billease"));

        Map<String, Object> lineItem = new HashMap<>();
        lineItem.put("currency", "PHP");
        lineItem.put("amount", amountCentavos);
        lineItem.put("name", "Rental Payment");
        lineItem.put("description", description);
        lineItem.put("quantity", 1);
        attributes.put("line_items", List.of(lineItem));

        Map<String, Object> data = new HashMap<>();
        data.put("attributes", attributes);
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("data", data);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    BASE_URL + "/checkout_sessions", HttpMethod.POST, entity, Map.class);

            Map<?, ?> responseData       = (Map<?, ?>) response.getBody().get("data");
            Map<?, ?> responseAttributes = (Map<?, ?>) responseData.get("attributes");
            String    checkoutUrl        = (String) responseAttributes.get("checkout_url");
            String    sessionId          = (String) responseData.get("id");

            Map<String, String> result = new HashMap<>();
            result.put("checkoutUrl", checkoutUrl);
            result.put("paymentLinkId", sessionId);
            return result;

        } catch (Exception e) {
            throw new RuntimeException("PayMongo checkout session creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves a checkout session to check if it has been paid.
     *
     * @return "paid" | "unpaid" | "unknown"
     */
    public String getPaymentLinkStatus(String sessionId) {
        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + auth);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    BASE_URL + "/checkout_sessions/" + sessionId, HttpMethod.GET, entity, Map.class);

            Map<?, ?> data       = (Map<?, ?>) response.getBody().get("data");
            Map<?, ?> attributes = (Map<?, ?>) data.get("attributes");

            List<Map<?, ?>> payments = (List<Map<?, ?>>) attributes.get("payments");
            if (payments != null) {
                for (Map<?, ?> payment : payments) {
                    Map<?, ?> paymentAttributes = (Map<?, ?>) payment.get("attributes");
                    if ("paid".equals(paymentAttributes.get("status"))) {
                        return "paid";
                    }
                }
            }

            return "unpaid";
        } catch (Exception e) {
            return "unknown";
        }
    }
}