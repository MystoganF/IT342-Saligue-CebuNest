package edu.cit.saligue.cebunest.config;

import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        List<String> roles = List.of("TENANT", "OWNER", "ADMIN");
        for (String roleName : roles) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(new Role(null, roleName));
                System.out.println("Seeded role: " + roleName);
            }
        }
    }
}