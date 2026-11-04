package com.kpi.prodi.service;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.DetailKpiRepository;
import com.kpi.prodi.repository.KpiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class DetailKpiService {

    private final DetailKpiRepository detailKpiRepository;
    private final KpiRepository kpiRepository;
    private final IdGeneratorService idGeneratorService;
    private final KpiService kpiService;

    public DetailKpiService(DetailKpiRepository detailKpiRepository,
                            KpiRepository kpiRepository,
                            IdGeneratorService idGeneratorService,
                            KpiService kpiService) {
        this.detailKpiRepository = detailKpiRepository;
        this.kpiRepository = kpiRepository;
        this.idGeneratorService = idGeneratorService;
        this.kpiService = kpiService;
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findAll() {
        return detailKpiRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findByKpiId(String idKpi) {
        return detailKpiRepository.findByKpiIdKpi(idKpi);
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findOpenActivities() {
        return detailKpiRepository.findByStatus(DetailKpiStatus.OPEN);
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findByPic(Karyawan pic) {
        return detailKpiRepository.findByPic(pic);
    }

    @Transactional(readOnly = true)
    public Optional<DetailKpi> findById(String idDetailKpi) {
        return detailKpiRepository.findById(idDetailKpi);
    }

    @Transactional(readOnly = true)
    public BigDecimal getAvailableBobot(String idKpi, String currentDetailId) {
        BigDecimal used;
        if (currentDetailId != null && !currentDetailId.trim().isEmpty()) {
            used = detailKpiRepository.sumBobotByKpiIdExclude(idKpi, currentDetailId);
        } else {
            used = detailKpiRepository.sumBobotByKpiId(idKpi);
        }
        return BigDecimal.valueOf(100.00).subtract(used);
    }

    public DetailKpi save(DetailKpi detailKpi, String idKpi, Karyawan user) {
        Kpi kpi = kpiRepository.findById(idKpi)
            .orElseThrow(() -> new IllegalArgumentException("KPI induk tidak ditemukan"));

        // Validate creator is a designated PJ or KAPROD
        if (user.getRole() != RoleEnum.KAPROD && !kpi.getPenanggungJawabList().contains(user)) {
            throw new SecurityException("Anda bukan penanggung jawab yang ditugaskan untuk KPI ini.");
        }

        boolean isNew = (detailKpi.getIdDetailKpi() == null || detailKpi.getIdDetailKpi().trim().isEmpty());
        BigDecimal currentUsed;

        if (isNew) {
            currentUsed = detailKpiRepository.sumBobotByKpiId(idKpi);
        } else {
            currentUsed = detailKpiRepository.sumBobotByKpiIdExclude(idKpi, detailKpi.getIdDetailKpi());
        }

        BigDecimal newTotal = currentUsed.add(detailKpi.getPersentaseBobot());
        if (newTotal.compareTo(BigDecimal.valueOf(100.00)) > 0) {
            BigDecimal sisa = BigDecimal.valueOf(100.00).subtract(currentUsed);
            throw new IllegalArgumentException("Total bobot aktivitas pada KPI ini melebihi 100%. Sisa bobot yang tersedia adalah: " + sisa + "%.");
        }

        if (isNew) {
            detailKpi.setIdDetailKpi(idGeneratorService.generateDetailKpiId());
            detailKpi.setKpi(kpi);
            detailKpi.setDibuatOleh(user);
            detailKpi.setStatus(DetailKpiStatus.OPEN);
            detailKpi.setPersentaseProgres(BigDecimal.ZERO);
            return detailKpiRepository.save(detailKpi);
        } else {
            DetailKpi existing = detailKpiRepository.findById(detailKpi.getIdDetailKpi())
                .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

            existing.setNamaAktivitasKpi(detailKpi.getNamaAktivitasKpi());
            existing.setPersentaseBobot(detailKpi.getPersentaseBobot());
            existing.setDeadline(detailKpi.getDeadline());
            return detailKpiRepository.save(existing);
        }
    }

    public DetailKpi pickActivity(String idDetailKpi, Karyawan pic) {
        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        if (activity.getStatus() != DetailKpiStatus.OPEN) {
            throw new IllegalStateException("Aktivitas ini sudah tidak berstatus OPEN atau telah diambil oleh PIC lain.");
        }

        if (activity.getPic() != null) {
            throw new IllegalStateException("Aktivitas ini sudah memiliki PIC (" + activity.getPic().getNamaKaryawan() + ").");
        }

        activity.setPic(pic);
        activity.setStatus(DetailKpiStatus.PICKED);
        return detailKpiRepository.save(activity);
    }

    public void delete(String idDetailKpi, Karyawan user) {
        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        if (user.getRole() != RoleEnum.KAPROD && !activity.getKpi().getPenanggungJawabList().contains(user)) {
            throw new SecurityException("Anda tidak berwenang menghapus aktivitas pada KPI ini.");
        }

        if (activity.getStatus() != DetailKpiStatus.OPEN) {
            throw new IllegalStateException("Aktivitas yang sudah berstatus " + activity.getStatus() + " tidak dapat dihapus.");
        }

        String kpiId = activity.getKpi().getIdKpi();
        detailKpiRepository.delete(activity);
        kpiService.recalculateProgress(kpiId);
    }
}

