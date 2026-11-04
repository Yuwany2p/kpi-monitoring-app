package com.kpi.prodi.controller;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.security.CustomUserDetails;
import com.kpi.prodi.service.ApprovalService;
import com.kpi.prodi.service.DetailKpiService;
import com.kpi.prodi.service.KpiService;
import com.kpi.prodi.service.UploadProgressService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;

@Controller
@RequestMapping("/activity")
public class ActivityController {

    private final DetailKpiService detailKpiService;
    private final KpiService kpiService;
    private final UploadProgressService uploadProgressService;
    private final ApprovalService approvalService;

    public ActivityController(DetailKpiService detailKpiService,
                              KpiService kpiService,
                              UploadProgressService uploadProgressService,
                              ApprovalService approvalService) {
        this.detailKpiService = detailKpiService;
        this.kpiService = kpiService;
        this.uploadProgressService = uploadProgressService;
        this.approvalService = approvalService;
    }

    @GetMapping("/create/{idKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String createForm(@PathVariable("idKpi") String idKpi, Model model) {
        Kpi kpi = kpiService.findById(idKpi)
            .orElseThrow(() -> new IllegalArgumentException("KPI tidak ditemukan"));

        BigDecimal availableBobot = detailKpiService.getAvailableBobot(idKpi, null);

        DetailKpi detail = new DetailKpi();
        detail.setKpi(kpi);

        model.addAttribute("detailKpi", detail);
        model.addAttribute("kpi", kpi);
        model.addAttribute("availableBobot", availableBobot);
        model.addAttribute("isNew", true);
        return "activity/form";
    }

    @PostMapping("/create/{idKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String createSubmit(@PathVariable("idKpi") String idKpi,
                               @ModelAttribute DetailKpi detailKpi,
                               @AuthenticationPrincipal CustomUserDetails userDetails,
                               RedirectAttributes redirectAttributes,
                               Model model) {
        try {
            detailKpiService.save(detailKpi, idKpi, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Aktivitas KPI berhasil ditambahkan.");
            return "redirect:/kpi/detail/" + idKpi;
        } catch (Exception e) {
            Kpi kpi = kpiService.findById(idKpi).orElse(null);
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("kpi", kpi);
            model.addAttribute("availableBobot", detailKpiService.getAvailableBobot(idKpi, null));
            model.addAttribute("isNew", true);
            return "activity/form";
        }
    }

    @GetMapping("/edit/{idDetailKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String editForm(@PathVariable("idDetailKpi") String idDetailKpi, Model model) {
        DetailKpi detail = detailKpiService.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        BigDecimal availableBobot = detailKpiService.getAvailableBobot(detail.getKpi().getIdKpi(), idDetailKpi);

        model.addAttribute("detailKpi", detail);
        model.addAttribute("kpi", detail.getKpi());
        model.addAttribute("availableBobot", availableBobot);
        model.addAttribute("isNew", false);
        return "activity/form";
    }

    @PostMapping("/edit/{idDetailKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String editSubmit(@PathVariable("idDetailKpi") String idDetailKpi,
                             @ModelAttribute DetailKpi detailKpi,
                             @AuthenticationPrincipal CustomUserDetails userDetails,
                             RedirectAttributes redirectAttributes,
                             Model model) {
        try {
            DetailKpi existing = detailKpiService.findById(idDetailKpi)
                .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));
            detailKpi.setIdDetailKpi(idDetailKpi);
            detailKpiService.save(detailKpi, existing.getKpi().getIdKpi(), userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Aktivitas KPI berhasil diperbarui.");
            return "redirect:/kpi/detail/" + existing.getKpi().getIdKpi();
        } catch (Exception e) {
            DetailKpi existing = detailKpiService.findById(idDetailKpi).orElse(null);
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("kpi", existing != null ? existing.getKpi() : null);
            model.addAttribute("availableBobot", existing != null ? detailKpiService.getAvailableBobot(existing.getKpi().getIdKpi(), idDetailKpi) : BigDecimal.ZERO);
            model.addAttribute("isNew", false);
            return "activity/form";
        }
    }

    @PostMapping("/delete/{idDetailKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String delete(@PathVariable("idDetailKpi") String idDetailKpi,
                         @AuthenticationPrincipal CustomUserDetails userDetails,
                         RedirectAttributes redirectAttributes) {
        try {
            DetailKpi detail = detailKpiService.findById(idDetailKpi)
                .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));
            String kpiId = detail.getKpi().getIdKpi();
            detailKpiService.delete(idDetailKpi, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Aktivitas berhasil dihapus.");
            return "redirect:/kpi/detail/" + kpiId;
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/kpi";
        }
    }

    // PIC Picking View
    @GetMapping("/pick-list")
    @PreAuthorize("hasRole('PIC_ACTIVITY')")
    public String pickList(Model model) {
        model.addAttribute("openActivities", detailKpiService.findOpenActivities());
        return "activity/pick-list";
    }

    @PostMapping("/pick/{idDetailKpi}")
    @PreAuthorize("hasRole('PIC_ACTIVITY')")
    public String pickActivity(@PathVariable("idDetailKpi") String idDetailKpi,
                               @AuthenticationPrincipal CustomUserDetails userDetails,
                               RedirectAttributes redirectAttributes) {
        try {
            detailKpiService.pickActivity(idDetailKpi, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Aktivitas berhasil diambil! Silakan kerjakan dan unggah progres.");
            return "redirect:/activity/my-activities";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/activity/pick-list";
        }
    }

    // PIC My Activities
    @GetMapping("/my-activities")
    @PreAuthorize("hasRole('PIC_ACTIVITY')")
    public String myActivities(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("myActivities", detailKpiService.findByPic(userDetails.getKaryawan()));
        return "activity/my-activities";
    }

    // Detail Activity View with upload history & approval logs
    @GetMapping("/detail/{idDetailKpi}")
    public String detailActivity(@PathVariable("idDetailKpi") String idDetailKpi,
                                 @AuthenticationPrincipal CustomUserDetails userDetails,
                                 Model model) {
        DetailKpi detail = detailKpiService.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        Karyawan user = userDetails.getKaryawan();
        boolean isOwnerPic = (detail.getPic() != null && detail.getPic().getNpk().equals(user.getNpk()));

        model.addAttribute("activity", detail);
        model.addAttribute("uploadHistory", uploadProgressService.getHistory(idDetailKpi));
        model.addAttribute("approvalLogs", approvalService.getLogs(idDetailKpi));
        model.addAttribute("isOwnerPic", isOwnerPic);
        return "activity/detail";
    }
}

