package com.kpi.prodi.controller;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.enums.ApprovalAction;
import com.kpi.prodi.security.CustomUserDetails;
import com.kpi.prodi.service.ApprovalService;
import com.kpi.prodi.service.DetailKpiService;
import com.kpi.prodi.service.UploadProgressService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/approval")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final DetailKpiService detailKpiService;
    private final UploadProgressService uploadProgressService;

    public ApprovalController(ApprovalService approvalService,
                              DetailKpiService detailKpiService,
                              UploadProgressService uploadProgressService) {
        this.approvalService = approvalService;
        this.detailKpiService = detailKpiService;
        this.uploadProgressService = uploadProgressService;
    }

    // ==========================================
    // APPROVAL LEVEL 1 (SEKPROD / KAUPT)
    // ==========================================
    @GetMapping("/l1")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String listL1(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("pendingList", approvalService.findPendingL1(userDetails.getKaryawan()));
        return "approval/list-l1";
    }

    @GetMapping("/l1/review/{idDetailKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String reviewL1(@PathVariable("idDetailKpi") String idDetailKpi, Model model) {
        DetailKpi activity = detailKpiService.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        model.addAttribute("activity", activity);
        model.addAttribute("uploadHistory", uploadProgressService.getHistory(idDetailKpi));
        model.addAttribute("approvalLogs", approvalService.getLogs(idDetailKpi));
        model.addAttribute("approvalLevel", "L1");
        return "approval/review";
    }

    @PostMapping("/l1/review/{idDetailKpi}")
    @PreAuthorize("hasAnyRole('SEKPROD', 'KAUPT', 'KAPROD')")
    public String submitL1(@PathVariable("idDetailKpi") String idDetailKpi,
                           @RequestParam("action") ApprovalAction action,
                           @RequestParam(value = "catatan", required = false) String catatan,
                           @AuthenticationPrincipal CustomUserDetails userDetails,
                           RedirectAttributes redirectAttributes) {
        try {
            approvalService.processApprovalL1(idDetailKpi, action, catatan, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Approval Level 1 berhasil diproses (" + action + ").");
            return "redirect:/approval/l1";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/approval/l1/review/" + idDetailKpi;
        }
    }

    // ==========================================
    // APPROVAL FINAL (KAPROD)
    // ==========================================
    @GetMapping("/final")
    @PreAuthorize("hasRole('KAPROD')")
    public String listFinal(Model model) {
        model.addAttribute("pendingList", approvalService.findPendingFinal());
        return "approval/list-final";
    }

    @GetMapping("/final/review/{idDetailKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String reviewFinal(@PathVariable("idDetailKpi") String idDetailKpi, Model model) {
        DetailKpi activity = detailKpiService.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        model.addAttribute("activity", activity);
        model.addAttribute("uploadHistory", uploadProgressService.getHistory(idDetailKpi));
        model.addAttribute("approvalLogs", approvalService.getLogs(idDetailKpi));
        model.addAttribute("approvalLevel", "FINAL");
        return "approval/review";
    }

    @PostMapping("/final/review/{idDetailKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String submitFinal(@PathVariable("idDetailKpi") String idDetailKpi,
                             @RequestParam("action") ApprovalAction action,
                             @RequestParam(value = "catatan", required = false) String catatan,
                             @AuthenticationPrincipal CustomUserDetails userDetails,
                             RedirectAttributes redirectAttributes) {
        try {
            approvalService.processApprovalFinal(idDetailKpi, action, catatan, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Approval Final berhasil diproses (" + action + "). Aktivitas sekarang DONE.");
            return "redirect:/approval/final";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
            return "redirect:/approval/final/review/" + idDetailKpi;
        }
    }
}

