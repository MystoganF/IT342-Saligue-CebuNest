package edu.cit.saligue.cebunest.infrastructure.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.anon-key}")
    private String supabaseAnonKey;

    @Value("${supabase.bucket}")
    private String bucket;

    @Value("${supabase.service-key}")
    private String supabaseServiceKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── Upload avatar ─────────────────────────────────────────────────────
    public String uploadAvatar(Long userId, MultipartFile file) throws IOException {
        String fileName  = "avatars/" + userId + "-" + UUID.randomUUID() + "." + getExtension(file);
        return upload(fileName, file);
    }

    // ── Upload property image ─────────────────────────────────────────────
    public String uploadPropertyImage(Long propertyId, MultipartFile file) throws IOException {
        String fileName = "edu/cit/saligue/cebunest/properties/" + propertyId + "-" + UUID.randomUUID() + "." + getExtension(file);
        return upload(fileName, file);
    }

    // ── Shared upload logic ───────────────────────────────────────────────
    private String upload(String fileName, MultipartFile file) throws IOException {
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + fileName;

        HttpHeaders headers = new HttpHeaders();
        // 1. You MUST use the service_role key for server-side uploads to bypass RLS policies
        headers.set("Authorization", "Bearer " + supabaseServiceKey);

        // 2. Crucial: Do NOT manually set Content-Type to the image type here.
        // Let Spring's RestTemplate handle the multipart boundary automatically!
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("x-upsert", "true"); // Overwrite if it exists

        // 3. Wrap the bytes in a Spring Resource so RestTemplate knows how to stream it
        org.springframework.core.io.ByteArrayResource resource =
                new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return file.getOriginalFilename(); // Required for Supabase to recognize the file
                    }
                };

        // 4. Build the multipart body
        org.springframework.util.MultiValueMap<String, Object> body =
                new org.springframework.util.LinkedMultiValueMap<>();
        body.add("file", resource);

        HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity =
                new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(uploadUrl, HttpMethod.POST, requestEntity, String.class);
            return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + fileName;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // This will print the EXACT reason Supabase is rejecting it to your backend console
            System.err.println("Supabase Error Details: " + e.getResponseBodyAsString());
            throw new IOException("Supabase rejected the upload: " + e.getStatusCode());
        }
    }

    private String getExtension(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || !name.contains(".")) return "jpg";
        return name.substring(name.lastIndexOf(".") + 1);
    }
}