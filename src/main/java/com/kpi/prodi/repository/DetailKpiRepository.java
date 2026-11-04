package com.kpi.prodi.repository;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface DetailKpiRepository extends JpaRepository<DetailKpi, String> {

    List<DetailKpi> findByKpi(Kpi kpi);

    List<DetailKpi> findByKpiIdKpi(String idKpi);

    List<DetailKpi> findByStatus(DetailKpiStatus status);

    List<DetailKpi> findByStatusIn(List<DetailKpiStatus> statuses);

    List<DetailKpi> findByPic(Karyawan pic);

    List<DetailKpi> findByPicAndStatus(Karyawan pic, DetailKpiStatus status);

    @Query("SELECT d FROM DetailKpi d WHERE d.kpi IN :kpis")
    List<DetailKpi> findByKpiIn(@Param("kpis") List<Kpi> kpis);

    @Query("SELECT d FROM DetailKpi d WHERE d.kpi IN :kpis AND d.status = :status")
    List<DetailKpi> findByKpiInAndStatus(@Param("kpis") List<Kpi> kpis, @Param("status") DetailKpiStatus status);

    @Query("SELECT COALESCE(SUM(d.persentaseBobot), 0) FROM DetailKpi d WHERE d.kpi.idKpi = :idKpi")
    BigDecimal sumBobotByKpiId(@Param("idKpi") String idKpi);

    @Query("SELECT COALESCE(SUM(d.persentaseBobot), 0) FROM DetailKpi d WHERE d.kpi.idKpi = :idKpi AND d.idDetailKpi != :excludeId")
    BigDecimal sumBobotByKpiIdExclude(@Param("idKpi") String idKpi, @Param("excludeId") String excludeId);

    @Query("SELECT d FROM DetailKpi d WHERE d.status != 'DONE' AND d.deadline < :currentDate")
    List<DetailKpi> findOverdueActivities(@Param("currentDate") LocalDate currentDate);

    @Query("SELECT d FROM DetailKpi d WHERE d.pic = :pic AND d.status != 'DONE' AND d.deadline < :currentDate")
    List<DetailKpi> findOverdueActivitiesByPic(@Param("pic") Karyawan pic, @Param("currentDate") LocalDate currentDate);

    @Query("SELECT COUNT(d) FROM DetailKpi d WHERE d.kpi.idKpi = :idKpi")
    long countByKpiId(@Param("idKpi") String idKpi);
}

