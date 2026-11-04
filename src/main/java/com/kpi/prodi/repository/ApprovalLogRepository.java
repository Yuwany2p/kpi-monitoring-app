package com.kpi.prodi.repository;

import com.kpi.prodi.model.ApprovalLog;
import com.kpi.prodi.model.DetailKpi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalLogRepository extends JpaRepository<ApprovalLog, Long> {

    List<ApprovalLog> findByDetailKpiOrderByTanggalDesc(DetailKpi detailKpi);
}

