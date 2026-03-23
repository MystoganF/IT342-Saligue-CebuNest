package edu.cit.saligue.cebunest.service;

import lombok.RequiredArgsConstructor;
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
        String fileName = "properties/" + propertyId + "-" + UUID.randomUUID() + "." + getExtension(file);
        return upload(fileName, file);
    }

    // ── Shared upload logic ───────────────────────────────────────────────
    private String upload(String fileName, MultipartFile file) throws IOException {
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + fileName;

        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey",        supabaseAnonKey);
        headers.set("Authorization", "Bearer " + supabaseServiceKey);
        headers.setContentType(MediaType.parseMediaType(file.getContentType()));
        headers.set("x-upsert", "true");

        HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
        restTemplate.exchange(uploadUrl, HttpMethod.POST, entity, String.class);

        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + fileName;
    }

    private String getExtension(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null || !name.contains(".")) return "jpg";
        return name.substring(name.lastIndexOf(".") + 1);
    }
}