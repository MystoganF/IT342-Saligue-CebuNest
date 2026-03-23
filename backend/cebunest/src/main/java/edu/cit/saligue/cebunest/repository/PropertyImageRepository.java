package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.PropertyImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PropertyImageRepository extends JpaRepository<PropertyImage, Long> {

    // Direct JPQL delete — bypasses entity lifecycle but works reliably
    // for cases where orphanRemoval on the parent collection isn't firing
    @Modifying
    @Query("DELETE FROM PropertyImage i WHERE i.id = :imageId AND i.property.id = :propertyId")
    void deleteByIdAndPropertyId(@Param("imageId") Long imageId,
                                 @Param("propertyId") Long propertyId);
}