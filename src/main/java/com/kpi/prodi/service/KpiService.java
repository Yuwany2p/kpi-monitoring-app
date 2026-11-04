package com.kpi.prodi.service;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import com.kpi.prodi.model.enums.KpiStatus;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.DetailKpiRepository;
import com.kpi.prodi.repository.KaryawanRepository;
import com.kpi.prodi.repository.KpiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@Transactional
public class KpiService {

    private final KpiRepository kpiRepository;
    private final DetailKpiRepository detailKpiRepository;
    private final KaryawanRepository karyawanRepository;
    private final IdGeneratorService idGeneratorService;

    public KpiService(KpiRepository kpiRepository,
                      DetailKpiRepository detailKpiRepository,
                      KaryawanRepository karyawanRepository,
                      IdGeneratorService idGeneratorService) {
        this.kpiRepository = kpiRepository;
        this.detailKpiRepository = detailKpiRepository;
        this.karyawanRepository = karyawanRepository;
        this.idGeneratorService = idGeneratorService;
    }

    @Transactional(readOnly = true)
    public List<Kpi> findAll() {
        return kpiRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Kpi> findByUserRole(Karyawan user) {
        if (user.getRole() == RoleEnum.KAPROD) {
            return kpiRepository.findAll();
        } else if (user.getRole() == RoleEnum.SEKPROD || user.getRole() == RoleEnum.KAUPT) {
            return kpiRepository.findByStatusAndPenanggungJawab(KpiStatus.PUBLISHED, user);
        } else {
            // PIC sees published KPIs
            return kpiRepository.findByStatus(KpiStatus.PUBLISHED);
        }
    }

    @Transactional(readOnly = true)
    public Optional<Kpi> findById(String idKpi) {
        return kpiRepository.findById(idKpi);
    }

    public Kpi create(Kpi kpi, List<String> pjNpks, Karyawan dibuatOleh) {
        if (kpi.getIdKpi() == null || kpi.getIdKpi().trim().isEmpty()) {
            kpi.setIdKpi(idGeneratorService.generateKpiId());
        }
        kpi.setDibuatOleh(dibuatOleh);
        kpi.setPersentaseProgres(BigDecimal.ZERO);

        if (pjNpks != null && !pjNpks.isEmpty()) {
            Set<Karyawan> pjs = new HashSet<>(karyawanRepository.findAllById(pjNpks));
            kpi.setPenanggungJawabList(pjs);
        }

        return kpiRepository.save(kpi);
    }

    public Kpi update(Kpi kpi, List<String> pjNpks) {
        Kpi existing = kpiRepository.findById(kpi.getIdKpi())
            .orElseThrow(() -> new IllegalArgumentException("KPI tidak ditemukan"));

        existing.setNamaKpi(kpi.getNamaKpi());
        existing.setPersentaseBobot(kpi.getPersentaseBobot());
        existing.setLevel(kpi.getLevel());
        existing.setKategori(kpi.getKategori());
        existing.setPeriode(kpi.getPeriode());
        existing.setStatus(kpi.getStatus());

        if (pjNpks != null) {
            Set<Karyawan> pjs = new HashSet<>(karyawanRepository.findAllById(pjNpks));
            existing.setPenanggungJawabList(pjs);
        }

        return kpiRepository.save(existing);
    }

    public void updateStatus(String idKpi, KpiStatus status) {
        Kpi kpi = kpiRepository.findById(idKpi)
            .orElseThrow(() -> new IllegalArgumentException("KPI tidak ditemukan"));
        kpi.setStatus(status);
        kpiRepository.save(kpi);
    }

    public void delete(String idKpi) {
        long activityCount = detailKpiRepository.countByKpiId(idKpi);
        if (activityCount > 0) {
            throw new IllegalStateException("KPI ini memiliki " + activityCount + " aktivitas detail terkait dan tidak boleh dihapus. Anda dapat mengubah statusnya menjadi CLOSED.");
        }
        kpiRepository.deleteById(idKpi);
    }

    public void recalculateProgress(String idKpi) {
        Kpi kpi = kpiRepository.findById(idKpi).orElse(null);
        if (kpi == null) return;

        List<DetailKpi> activities = detailKpiRepository.findByKpiIdKpi(idKpi);
        BigDecimal totalScore = BigDecimal.ZERO;

        for (DetailKpi act : activities) {
            if (act.getStatus() == DetailKpiStatus.DONE) {
                BigDecimal bobot = act.getPersentaseBobot() != null ? act.getPersentaseBobot() : BigDecimal.ZERO;
                BigDecimal progres = act.getPersentaseProgres() != null ? act.getPersentaseProgres() : BigDecimal.ZERO;
                totalScore = totalScore.add(bobot.multiply(progres));
            }
        }

        BigDecimal finalProgress = totalScore.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        kpi.setPersentaseProgres(finalProgress);
        kpiRepository.save(kpi);
    }

    @Transactional(readOnly = true)
    public List<String> getAllPeriodes() {
        return kpiRepository.findDistinctPeriodes();
    }
}

