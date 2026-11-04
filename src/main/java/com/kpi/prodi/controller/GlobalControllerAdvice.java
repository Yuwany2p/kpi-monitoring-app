package com.kpi.prodi.controller;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.security.CustomUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalControllerAdvice {

    @ModelAttribute("currentUser")
    public Karyawan getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            return userDetails.getKaryawan();
        }
        return null;
    }
}

