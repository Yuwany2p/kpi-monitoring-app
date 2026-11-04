package com.kpi.prodi.controller;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.service.KaryawanService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/karyawan")
@PreAuthorize("hasRole('KAPROD')")
public class KaryawanController {

    private final KaryawanService karyawanService;

    public KaryawanController(KaryawanService karyawanService) {
        this.karyawanService = karyawanService;
    }

    @GetMapping
    public String index(Model model) {
        model.addAttribute("karyawanList", karyawanService.findAll());
        return "karyawan/index";
    }

    @GetMapping("/create")
    public String createForm(Model model) {
        model.addAttribute("karyawan", new Karyawan());
        model.addAttribute("roles", RoleEnum.values());
        model.addAttribute("isNew", true);
        return "karyawan/form";
    }

    @PostMapping("/create")
    public String createSubmit(@ModelAttribute Karyawan karyawan,
                               RedirectAttributes redirectAttributes,
                               Model model) {
        try {
            karyawanService.save(karyawan, true);
            redirectAttributes.addFlashAttribute("successMessage", "Data karyawan " + karyawan.getNamaKaryawan() + " berhasil ditambahkan.");
            return "redirect:/karyawan";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("roles", RoleEnum.values());
            model.addAttribute("isNew", true);
            return "karyawan/form";
        }
    }

    @GetMapping("/edit/{npk}")
    public String editForm(@PathVariable("npk") String npk, Model model) {
        Karyawan karyawan = karyawanService.findByNpk(npk)
            .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan"));
        model.addAttribute("karyawan", karyawan);
        model.addAttribute("roles", RoleEnum.values());
        model.addAttribute("isNew", false);
        return "karyawan/form";
    }

    @PostMapping("/edit/{npk}")
    public String editSubmit(@PathVariable("npk") String npk,
                             @ModelAttribute Karyawan karyawan,
                             RedirectAttributes redirectAttributes,
                             Model model) {
        try {
            karyawan.setNpk(npk);
            karyawanService.save(karyawan, false);
            redirectAttributes.addFlashAttribute("successMessage", "Data karyawan " + karyawan.getNamaKaryawan() + " berhasil diperbarui.");
            return "redirect:/karyawan";
        } catch (Exception e) {
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("roles", RoleEnum.values());
            model.addAttribute("isNew", false);
            return "karyawan/form";
        }
    }

    @PostMapping("/toggle/{npk}")
    public String toggleStatus(@PathVariable("npk") String npk, RedirectAttributes redirectAttributes) {
        try {
            karyawanService.toggleStatus(npk);
            redirectAttributes.addFlashAttribute("successMessage", "Status aktif karyawan berhasil diubah.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }
        return "redirect:/karyawan";
    }

    @PostMapping("/delete/{npk}")
    public String delete(@PathVariable("npk") String npk, RedirectAttributes redirectAttributes) {
        try {
            karyawanService.delete(npk);
            redirectAttributes.addFlashAttribute("successMessage", "Data karyawan berhasil dihapus.");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menghapus karyawan: " + e.getMessage());
        }
        return "redirect:/karyawan";
    }
}

