package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    @Query("""
    SELECT p FROM Property p
    WHERE p.status = :status
    AND (:search IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%'))
                         OR LOWER(p.location) LIKE LOWER(CONCAT('%', :search, '%')))
    AND (:type IS NULL OR p.type = :type)
    AND (:minPrice IS NULL OR p.price >= :minPrice)
    AND (:maxPrice IS NULL OR p.price <= :maxPrice)
    ORDER BY p.createdAt DESC
""")
    List<Property> findFiltered(
            @Param("status") Property.PropertyStatus status,
            @Param("search") String search,
            @Param("type") String type,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );
}