package edu.cit.saligue.cebunest.config;

import edu.cit.saligue.cebunest.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── Public auth endpoints ──────────────────────────
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/google"
                        ).permitAll()

                        // ── Public property reads ──────────────────────────
                        // NOTE: specific sub-paths must come BEFORE the wildcard {id} matcher
                        .requestMatchers(HttpMethod.GET, "/api/properties/types").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/properties").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/properties/{id}").permitAll()

                        // ── Everything else requires a valid JWT ───────────
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new SkipPublicEndpointsFilter(jwtAuthFilter),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /* ── Skip JWT filter for public endpoints ── */
    static class SkipPublicEndpointsFilter extends org.springframework.web.filter.OncePerRequestFilter {

        private final JwtAuthFilter jwtAuthFilter;

        SkipPublicEndpointsFilter(JwtAuthFilter jwtAuthFilter) {
            this.jwtAuthFilter = jwtAuthFilter;
        }

        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            String path   = request.getServletPath();
            String method = request.getMethod();

            // Skip JWT for public auth endpoints
            if (path.equals("/api/auth/google")
                    || path.equals("/api/auth/login")
                    || path.equals("/api/auth/register")) {
                return true;
            }

            // Skip JWT for public GET property endpoints
            if ("GET".equalsIgnoreCase(method)) {
                if (path.equals("/api/properties"))          return true;
                if (path.equals("/api/properties/types"))    return true;
                if (path.matches("/api/properties/\\d+"))    return true;
            }

            return false;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        jakarta.servlet.http.HttpServletResponse response,
                                        jakarta.servlet.FilterChain filterChain)
                throws jakarta.servlet.ServletException, java.io.IOException {
            jwtAuthFilter.doFilter(request, response, filterChain);
        }
    }
}