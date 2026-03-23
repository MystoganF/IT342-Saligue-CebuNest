package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.RentalPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalPaymentRepository extends JpaRepository<RentalPayment, Long> {

    List<RentalPayment> findByRentalRequestIdOrderByInstallmentNumberAsc(Long rentalRequestId);

    Optional<RentalPayment> findByPaymongoPaymentId(String paymongoPaymentId);

    boolean existsByRentalRequestId(Long rentalRequestId);
}