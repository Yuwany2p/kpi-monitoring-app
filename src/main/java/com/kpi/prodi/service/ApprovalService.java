package com.kpi.prodi.service;

import com.kpi.prodi.model.ApprovalLog;
import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.UploadFile;
import com.kpi.prodi.model.enums.ApprovalAction;
import com.kpi.prodi.model.enums.ApprovalLevel;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.ApprovalLogRepository;
import com.kpi.prodi.repository.DetailKpiRepository;
import com.kpi.prodi.repository.UploadFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class ApprovalService {

    private final DetailKpiRepository detailKpiRepository;
    private final ApprovalLogRepository approvalLogRepository;
    private final UploadFileRepository uploadFileRepository;
    private final KpiService kpiService;

    public ApprovalService(DetailKpiRepository detailKpiRepository,
                           ApprovalLogRepository approvalLogRepository,
                           UploadFileRepository uploadFileRepository,
                           KpiService kpiService) {
        this.detailKpiRepository = detailKpiRepository;
        this.approvalLogRepository = approvalLogRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.kpiService = kpiService;
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findPendingL1(Karyawan reviewer) {
        return detailKpiRepository.findAll().stream()
            .filter(d -> d.getStatus() == DetailKpiStatus.SUBMITTED)
            .filter(d -> d.getKpi().getPenanggungJawabList().contains(reviewer) || reviewer.getRole() == RoleEnum.KAPROD)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<DetailKpi> findPendingFinal() {
        return detailKpiRepository.findByStatus(DetailKpiStatus.APPROVED_L1);
    }

    public void processApprovalL1(String idDetailKpi, ApprovalAction action, String catatan, Karyawan reviewer) {
        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        if (!activity.getKpi().getPenanggungJawabList().contains(reviewer) && reviewer.getRole() != RoleEnum.KAPROD) {
            throw new SecurityException("Hanya penanggung jawab KPI yang ditugaskan yang dapat melakukan approval Level 1.");
        }

        if (activity.getStatus() != DetailKpiStatus.SUBMITTED) {
            throw new IllegalStateException("Hanya aktivitas berstatus SUBMITTED yang dapat diproses pada Approval Level 1.");
        }

        if (action == ApprovalAction.REJECT && (catatan == null || catatan.trim().isEmpty())) {
            throw new IllegalArgumentException("Catatan wajib diisi saat melakukan REJECT / Permintaan Revisi.");
        }

        if (action == ApprovalAction.APPROVE) {
            activity.setStatus(DetailKpiStatus.APPROVED_L1);
        } else {
            activity.setStatus(DetailKpiStatus.REVISION);
        }
        detailKpiRepository.save(activity);

        // Record log
        ApprovalLog log = new ApprovalLog(activity, reviewer, ApprovalLevel.L1, action, catatan);
        approvalLogRepository.save(log);
    }

    public void processApprovalFinal(String idDetailKpi, ApprovalAction action, String catatan, Karyawan kaprod) {
        if (kaprod.getRole() != RoleEnum.KAPROD) {
            throw new SecurityException("Hanya KAPROD yang berhak melakukan Approval Final.");
        }

        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        if (activity.getStatus() != DetailKpiStatus.APPROVED_L1) {
            throw new IllegalStateException("Hanya aktivitas berstatus APPROVED_L1 yang dapat diproses pada Approval Final.");
        }

        if (action == ApprovalAction.REJECT && (catatan == null || catatan.trim().isEmpty())) {
            throw new IllegalArgumentException("Catatan wajib diisi saat melakukan REJECT / Permintaan Revisi.");
        }

        if (action == ApprovalAction.APPROVE) {
            activity.setStatus(DetailKpiStatus.DONE);

            // Perhitungan otomatis progres Detail KPI = progres dari upload terakhir
            UploadFile latestUpload = uploadFileRepository.findFirstByDetailKpiOrderByTanggalUploadDesc(activity)
                .orElse(null);
            if (latestUpload != null && latestUpload.getPersentaseProgres() != null) {
                activity.setPersentaseProgres(latestUpload.getPersentaseProgres());
            } else {
                activity.setPersentaseProgres(BigDecimal.valueOf(100.00));
            }
            detailKpiRepository.save(activity);

            // Dihitung ulang progres KPI
            kpiService.recalculateProgress(activity.getKpi().getIdKpi());
        } else {
            activity.setStatus(DetailKpiStatus.REVISION);
            detailKpiRepository.save(activity);
        }

        // Record log
        ApprovalLog log = new ApprovalLog(activity, kaprod, ApprovalLevel.FINAL, action, catatan);
        approvalLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<ApprovalLog> getLogs(String idDetailKpi) {
        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));
        return approvalLogRepository.findByDetailKpiOrderByTanggalDesc(activity);
    }
}

