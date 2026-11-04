package com.kpi.prodi.service;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import com.kpi.prodi.model.enums.KpiStatus;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.DetailKpiRepository;
import com.kpi.prodi.repository.KpiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final KpiRepository kpiRepository;
    private final DetailKpiRepository detailKpiRepository;

    public DashboardService(KpiRepository kpiRepository, DetailKpiRepository detailKpiRepository) {
        this.kpiRepository = kpiRepository;
        this.detailKpiRepository = detailKpiRepository;
    }

    public Map<String, Object> getDashboardData(Karyawan currentUser, String filterPeriode) {
        Map<String, Object> data = new HashMap<>();

        List<Kpi> allKpis;
        if (filterPeriode != null && !filterPeriode.trim().isEmpty() && !"ALL".equalsIgnoreCase(filterPeriode)) {
            allKpis = kpiRepository.findByPeriode(filterPeriode);
        } else {
            allKpis = kpiRepository.findAll();
        }

        // Filter KPIs accessible by role
        List<Kpi> relevantKpis;
        if (currentUser.getRole() == RoleEnum.KAPROD) {
            relevantKpis = allKpis;
        } else if (currentUser.getRole() == RoleEnum.SEKPROD || currentUser.getRole() == RoleEnum.KAUPT) {
            relevantKpis = allKpis.stream()
                .filter(k -> k.getStatus() == KpiStatus.PUBLISHED && k.getPenanggungJawabList().contains(currentUser))
                .collect(Collectors.toList());
        } else {
            // PIC
            relevantKpis = allKpis.stream()
                .filter(k -> k.getStatus() == KpiStatus.PUBLISHED)
                .collect(Collectors.toList());
        }

        List<DetailKpi> relevantActivities;
        if (relevantKpis.isEmpty()) {
            relevantActivities = Collections.emptyList();
        } else {
            relevantActivities = detailKpiRepository.findByKpiIn(relevantKpis);
        }

        // Count stats
        long totalKpi = relevantKpis.size();
        long countOpen = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.OPEN).count();
        long countPicked = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.PICKED).count();
        long countSubmitted = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.SUBMITTED).count();
        long countRevision = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.REVISION).count();
        long countApprovedL1 = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.APPROVED_L1).count();
        long countDone = relevantActivities.stream().filter(a -> a.getStatus() == DetailKpiStatus.DONE).count();
        long totalActivities = relevantActivities.size();

        // Overdue activities
        LocalDate today = LocalDate.now();
        List<DetailKpi> overdueActivities = relevantActivities.stream()
            .filter(a -> a.getStatus() != DetailKpiStatus.DONE && a.getDeadline() != null && a.getDeadline().isBefore(today))
            .collect(Collectors.toList());

        // PIC Workload distribution
        Map<String, Long> picWorkload = relevantActivities.stream()
            .filter(a -> a.getPic() != null)
            .collect(Collectors.groupingBy(a -> a.getPic().getNamaKaryawan(), Collectors.counting()));

        // For PIC: My activities
        List<DetailKpi> myActivities = Collections.emptyList();
        if (currentUser.getRole() == RoleEnum.PIC_ACTIVITY) {
            myActivities = detailKpiRepository.findByPic(currentUser);
        }

        // Pending approvals count
        long pendingApprovalCount = 0;
        if (currentUser.getRole() == RoleEnum.SEKPROD || currentUser.getRole() == RoleEnum.KAUPT) {
            pendingApprovalCount = countSubmitted;
        } else if (currentUser.getRole() == RoleEnum.KAPROD) {
            pendingApprovalCount = countApprovedL1;
        }

        data.put("totalKpi", totalKpi);
        data.put("totalActivities", totalActivities);
        data.put("countOpen", countOpen);
        data.put("countPicked", countPicked);
        data.put("countSubmitted", countSubmitted);
        data.put("countRevision", countRevision);
        data.put("countApprovedL1", countApprovedL1);
        data.put("countDone", countDone);
        data.put("pendingApprovalCount", pendingApprovalCount);
        data.put("overdueActivities", overdueActivities);
        data.put("picWorkload", picWorkload);
        data.put("kpis", relevantKpis);
        data.put("myActivities", myActivities);
        data.put("currentPeriode", filterPeriode != null ? filterPeriode : "ALL");
        data.put("allPeriodes", kpiRepository.findDistinctPeriodes());

        return data;
    }
}

