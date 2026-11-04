package com.kpi.prodi.controller;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.Kpi;
import com.kpi.prodi.model.enums.KpiStatus;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.security.CustomUserDetails;
import com.kpi.prodi.service.DetailKpiService;
import com.kpi.prodi.service.KaryawanService;
import com.kpi.prodi.service.KpiService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/kpi")
public class KpiController {

    private final KpiService kpiService;
    private final KaryawanService karyawanService;
    private final DetailKpiService detailKpiService;

    public KpiController(KpiService kpiService, KaryawanService karyawanService, DetailKpiService detailKpiService) {
        this.kpiService = kpiService;
        this.karyawanService = karyawanService;
        this.detailKpiService = detailKpiService;
    }

    @GetMapping
    public String index(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        Karyawan user = userDetails.getKaryawan();
        List<Kpi> kpis = kpiService.findByUserRole(user);
        model.addAttribute("kpis", kpis);
        return "kpi/index";
    }

    @GetMapping("/create")
    @PreAuthorize("hasRole('KAPROD')")
    public String createForm(Model model) {
        model.addAttribute("kpi", new Kpi());
        model.addAttribute("pjCandidates", karyawanService.findPenanggungJawabCandidates());
        model.addAttribute("statuses", KpiStatus.values());
        model.addAttribute("isNew", true);
        return "kpi/form";
    }

    @PostMapping("/create")
    @PreAuthorize("hasRole('KAPROD')")
    public String createSubmit(@ModelAttribute Kpi kpi,
                               @RequestParam(value = "penanggungJawabNpks", required = false) List<String> pjNpks,
                               @AuthenticationPrincipal CustomUserDetails userDetails,
                               RedirectAttributes redirectAttributes,
                               Model model) {
        try {
            kpiService.create(kpi, pjNpks, userDetails.getKaryawan());
            redirectAttributes.addFlashAttribute("successMessage", "Header KPI " + kpi.getNamaKpi() + " berhasil dibuat.");
            return "redirect:/kpi";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("pjCandidates", karyawanService.findPenanggungJawabCandidates());
            model.addAttribute("statuses", KpiStatus.values());
            model.addAttribute("isNew", true);
            return "kpi/form";
        }
    }

    @GetMapping("/edit/{idKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String editForm(@PathVariable("idKpi") String idKpi, Model model) {
        Kpi kpi = kpiService.findById(idKpi)
            .orElseThrow(() -> new IllegalArgumentException("KPI tidak ditemukan"));

        List<String> selectedPjNpks = kpi.getPenanggungJawabList().stream()
            .map(Karyawan::getNpk)
            .collect(Collectors.toList());

        model.addAttribute("kpi", kpi);
        model.addAttribute("selectedPjNpks", selectedPjNpks);
        model.addAttribute("pjCandidates", karyawanService.findPenanggungJawabCandidates());
        model.addAttribute("statuses", KpiStatus.values());
        model.addAttribute("isNew", false);
        return "kpi/form";
    }

    @PostMapping("/edit/{idKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String editSubmit(@PathVariable("idKpi") String idKpi,
                             @ModelAttribute Kpi kpi,
                             @RequestParam(value = "penanggungJawabNpks", required = false) List<String> pjNpks,
                             RedirectAttributes redirectAttributes,
                             Model model) {
        try {
            kpi.setIdKpi(idKpi);
            kpiService.update(kpi, pjNpks);
            redirectAttributes.addFlashAttribute("successMessage", "Header KPI berhasil diperbarui.");
            return "redirect:/kpi";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("pjCandidates", karyawanService.findPenanggungJawabCandidates());
            model.addAttribute("statuses", KpiStatus.values());
            model.addAttribute("isNew", false);
            return "kpi/form";
        }
    }

    @GetMapping("/detail/{idKpi}")
    public String detail(@PathVariable("idKpi") String idKpi,
                         @AuthenticationPrincipal CustomUserDetails userDetails,
                         Model model) {
        Kpi kpi = kpiService.findById(idKpi)
            .orElseThrow(() -> new IllegalArgumentException("KPI tidak ditemukan"));

        Karyawan user = userDetails.getKaryawan();
        boolean canManageActivity = (user.getRole() == RoleEnum.KAPROD) ||
            ((user.getRole() == RoleEnum.SEKPROD || user.getRole() == RoleEnum.KAUPT) && kpi.getPenanggungJawabList().contains(user));

        model.addAttribute("kpi", kpi);
        model.addAttribute("activities", detailKpiService.findByKpiId(idKpi));
        model.addAttribute("canManageActivity", canManageActivity);
        model.addAttribute("availableBobot", detailKpiService.getAvailableBobot(idKpi, null));
        return "kpi/detail";
    }

    @PostMapping("/status/{idKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String updateStatus(@PathVariable("idKpi") String idKpi,
                               @RequestParam("status") KpiStatus status,
                               RedirectAttributes redirectAttributes) {
        try {
            kpiService.updateStatus(idKpi, status);
            redirectAttributes.addFlashAttribute("successMessage", "Status KPI berhasil diubah menjadi " + status);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/kpi";
    }

    @PostMapping("/delete/{idKpi}")
    @PreAuthorize("hasRole('KAPROD')")
    public String delete(@PathVariable("idKpi") String idKpi, RedirectAttributes redirectAttributes) {
        try {
            kpiService.delete(idKpi);
            redirectAttributes.addFlashAttribute("successMessage", "KPI berhasil dihapus.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/kpi";
    }
}

