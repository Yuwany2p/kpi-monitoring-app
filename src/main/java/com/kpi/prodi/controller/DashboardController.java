package com.kpi.prodi.controller;

import com.kpi.prodi.security.CustomUserDetails;
import com.kpi.prodi.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@Controller
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal CustomUserDetails userDetails,
                            @RequestParam(value = "periode", required = false) String periode,
                            Model model) {
        if (userDetails == null) {
            return "redirect:/login";
        }

        Map<String, Object> data = dashboardService.getDashboardData(userDetails.getKaryawan(), periode);
        model.addAllAttributes(data);
        return "dashboard/index";
    }
}

