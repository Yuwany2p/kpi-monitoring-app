package com.kpi.prodi.repository;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.UploadFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadFileRepository extends JpaRepository<UploadFile, String> {

    List<UploadFile> findByDetailKpiOrderByTanggalUploadDesc(DetailKpi detailKpi);

    Optional<UploadFile> findFirstByDetailKpiOrderByTanggalUploadDesc(DetailKpi detailKpi);
}

