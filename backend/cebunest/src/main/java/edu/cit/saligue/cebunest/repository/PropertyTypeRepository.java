package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.PropertyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PropertyTypeRepository extends JpaRepository<PropertyType, Long> {
    Optional<PropertyType> findByName(String name);
}