package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    @Query(value = """
        SELECT * FROM properties
        WHERE status = 'AVAILABLE'
        AND (:search IS NULL OR LOWER(title::text) LIKE LOWER(CONCAT('%', :search, '%'))
                             OR LOWER(location::text) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:type IS NULL OR type = :type)
        AND (:minPrice IS NULL OR price >= :minPrice)
        AND (:maxPrice IS NULL OR price <= :maxPrice)
        ORDER BY created_at DESC
    """, nativeQuery = true)
    List<Property> findFiltered(
            @Param("search") String search,
            @Param("type") String type,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );
}