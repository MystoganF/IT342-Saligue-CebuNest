package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.AdminBroadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminBroadcastRepository extends JpaRepository<AdminBroadcast, Long> {

    // All broadcasts, newest first
    List<AdminBroadcast> findAllByOrderBySentAtDesc();
}