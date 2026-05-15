package edu.cit.saligue.cebunest.users.shared;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
    List<User> findAllByOrderByCreatedAtDesc();
    List<User> findByRoleNameInAndActiveTrue(List<String> roleNames);
}