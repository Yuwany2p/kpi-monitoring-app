package com.kpi.prodi.repository;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.enums.RoleEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KaryawanRepository extends JpaRepository<Karyawan, String> {

    Optional<Karyawan> findByUsername(String username);

    @Query("SELECT k FROM Karyawan k WHERE k.username = :loginOrNpk OR k.npk = :loginOrNpk")
    Optional<Karyawan> findByUsernameOrNpk(@Param("loginOrNpk") String loginOrNpk);

    boolean existsByUsername(String username);

    boolean existsByNpk(String npk);

    List<Karyawan> findByRole(RoleEnum role);

    List<Karyawan> findByRoleIn(List<RoleEnum> roles);

    List<Karyawan> findByStatusAktifTrue();
}

