package com.kpi.prodi.repository;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.KpiStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KpiRepository extends JpaRepository<Kpi, String> {

    List<Kpi> findByStatus(KpiStatus status);

    List<Kpi> findByPeriode(String periode);

    @Query("SELECT k FROM Kpi k WHERE :karyawan MEMBER OF k.penanggungJawabList")
    List<Kpi> findByPenanggungJawab(@Param("karyawan") Karyawan karyawan);

    @Query("SELECT k FROM Kpi k WHERE k.status = :status AND :karyawan MEMBER OF k.penanggungJawabList")
    List<Kpi> findByStatusAndPenanggungJawab(@Param("status") KpiStatus status, @Param("karyawan") Karyawan karyawan);

    @Query("SELECT DISTINCT k.periode FROM Kpi k WHERE k.periode IS NOT NULL ORDER BY k.periode DESC")
    List<String> findDistinctPeriodes();
}

