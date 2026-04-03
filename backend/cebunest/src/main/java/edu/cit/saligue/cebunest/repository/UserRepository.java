package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.entity.User;
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