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
 * Wraps the PayMongo Payment Links API.
 * Docs: https://developers.paymongo.com/reference/create-a-payment-link
 *
 * Add to application.properties:
 *   paymongo.secret-key=sk_test_XXXX
 *   paymongo.success-url=http://localhost:5173/my-rentals?payment=success
 *   paymongo.cancel-url=http://localhost:5173/my-rentals?payment=cancelled
 */
@Service
@RequiredArgsConstructor
public class PayMongoService {

    @Value("${paymongo.secret-key}")
    private String secretKey;

    @Value("${paymongo.success-url:http://localhost:5173/my-rentals?payment=success}")
    private String successUrl;

    @Value("${paymongo.cancel-url:http://localhost:5173/my-rentals?payment=cancelled}")
    private String cancelUrl;

    private static final String BASE_URL = "https://api.paymongo.com/v1";
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Creates a PayMongo Payment Link and returns { checkoutUrl, paymentLinkId }.
     *
     * @param amountPhp  Amount in PHP (e.g. 3500.00)
     * @param description e.g. "Monthly rent #1 – cozy mojave"
     * @param referenceId  Your internal ID (e.g. "payment-42") for webhook matching
     */
    public Map<String, String> createPaymentLink(
            double amountPhp, String description, String referenceId) {

        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Basic " + auth);

        // PayMongo amounts are in centavos
        long amountCentavos = Math.round(amountPhp * 100);

        Map<String, Object> attributes = new HashMap<>();
        attributes.put("amount",       amountCentavos);
        attributes.put("currency",     "PHP");
        attributes.put("description",  description);
        attributes.put("reference_number", referenceId);
        attributes.put("success_url",  successUrl);
        attributes.put("cancel_url",   cancelUrl);
        // Allow GCash, Maya, credit card
        attributes.put("payment_method_allowed",
                List.of("gcash", "paymaya", "card", "billease"));

        Map<String, Object> data       = new HashMap<>();
        data.put("attributes", attributes);
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("data", data);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    BASE_URL + "/links", HttpMethod.POST, entity, Map.class);

            Map<?, ?> responseData       = (Map<?, ?>) response.getBody().get("data");
            Map<?, ?> responseAttributes = (Map<?, ?>) responseData.get("attributes");
            String    checkoutUrl        = (String) responseAttributes.get("checkout_url");
            String    linkId             = (String) responseData.get("id");

            Map<String, String> result = new HashMap<>();
            result.put("checkoutUrl", checkoutUrl);
            result.put("paymentLinkId", linkId);
            return result;

        } catch (Exception e) {
            throw new RuntimeException("PayMongo payment link creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves a payment link to check if it has been paid.
     * Returns "paid" | "unpaid" | "expired"
     */
    public String getPaymentLinkStatus(String linkId) {
        String auth = Base64.getEncoder().encodeToString((secretKey + ":").getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + auth);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    BASE_URL + "/links/" + linkId, HttpMethod.GET, entity, Map.class);

            Map<?, ?> data       = (Map<?, ?>) response.getBody().get("data");
            Map<?, ?> attributes = (Map<?, ?>) data.get("attributes");
            return (String) attributes.get("status");
        } catch (Exception e) {
            return "unknown";
        }
    }
}