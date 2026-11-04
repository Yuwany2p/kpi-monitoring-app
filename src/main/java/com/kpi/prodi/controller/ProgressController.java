package com.kpi.prodi.controller;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.security.CustomUserDetails;
import com.kpi.prodi.service.DetailKpiService;
import com.kpi.prodi.service.UploadProgressService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;

@Controller
@RequestMapping("/progress")
@PreAuthorize("hasRole('PIC_ACTIVITY')")
public class ProgressController {

    private final UploadProgressService uploadProgressService;
    private final DetailKpiService detailKpiService;

    public ProgressController(UploadProgressService uploadProgressService, DetailKpiService detailKpiService) {
        this.uploadProgressService = uploadProgressService;
        this.detailKpiService = detailKpiService;
    }

    @GetMapping("/upload/{idDetailKpi}")
    public String uploadForm(@PathVariable("idDetailKpi") String idDetailKpi,
                             @AuthenticationPrincipal CustomUserDetails userDetails,
                             Model model) {
        DetailKpi activity = detailKpiService.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        if (activity.getPic() == null || !activity.getPic().getNpk().equals(userDetails.getKaryawan().getNpk())) {
            throw new SecurityException("Anda hanya dapat mengunggah progres untuk aktivitas yang Anda ambil sendiri.");
        }

        model.addAttribute("activity", activity);
        model.addAttribute("uploadHistory", uploadProgressService.getHistory(idDetailKpi));
        return "progress/upload";
    }

    @PostMapping("/upload/{idDetailKpi}")
    public String uploadSubmit(@PathVariable("idDetailKpi") String idDetailKpi,
                               @RequestParam("persentaseProgres") BigDecimal persentaseProgres,
                               @RequestParam("catatan") String catatan,
                               @RequestParam("file") MultipartFile file,
                               @AuthenticationPrincipal CustomUserDetails userDetails,
                               RedirectAttributes redirectAttributes,
                               Model model) {
        try {
            uploadProgressService.uploadProgress(idDetailKpi, persentaseProgres, catatan, file, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Progres berhasil diunggah! Status aktivitas kini menjadi SUBMITTED.");
            return "redirect:/activity/my-activities";
        } catch (Exception e) {
            DetailKpi activity = detailKpiService.findById(idDetailKpi).orElse(null);
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("activity", activity);
            model.addAttribute("uploadHistory", uploadProgressService.getHistory(idDetailKpi));
            return "progress/upload";
        }
    }
}

