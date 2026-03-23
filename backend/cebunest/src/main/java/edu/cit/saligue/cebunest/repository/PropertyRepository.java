package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {

    // ── Public listing — available only, filter by type name via JOIN ──
    @Query(value = """
        SELECT p.* FROM properties p
        JOIN property_types pt ON p.type_id = pt.id
        WHERE p.status = 'AVAILABLE'
        AND (:search   IS NULL OR LOWER(p.title::text)    LIKE LOWER(CONCAT('%', :search, '%'))
                               OR LOWER(p.location::text) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:type     IS NULL OR pt.name = :type)
        AND (:minPrice IS NULL OR p.price >= :minPrice)
        AND (:maxPrice IS NULL OR p.price <= :maxPrice)
        ORDER BY p.created_at DESC
    """, nativeQuery = true)
    List<Property> findFiltered(
            @Param("search")   String search,
            @Param("type")     String type,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );

    // ── Owner's own properties (all statuses) ──
    @Query(value = """
        SELECT p.* FROM properties p
        WHERE p.owner_id = :ownerId
        AND (:search   IS NULL OR LOWER(p.title::text)    LIKE LOWER(CONCAT('%', :search, '%'))
                               OR LOWER(p.location::text) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:minPrice IS NULL OR p.price >= :minPrice)
        AND (:maxPrice IS NULL OR p.price <= :maxPrice)
        ORDER BY p.created_at DESC
    """, nativeQuery = true)
    List<Property> findByOwnerFiltered(
            @Param("ownerId")   Long ownerId,
            @Param("search")    String search,
            @Param("minPrice")  Double minPrice,
            @Param("maxPrice")  Double maxPrice
    );
}