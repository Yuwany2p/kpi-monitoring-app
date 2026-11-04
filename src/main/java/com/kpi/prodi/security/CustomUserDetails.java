package com.kpi.prodi.security;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.enums.RoleEnum;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private final Karyawan karyawan;

    public CustomUserDetails(Karyawan karyawan) {
        this.karyawan = karyawan;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + karyawan.getRole().name()));
    }

    @Override
    public String getPassword() {
        return karyawan.getPassword();
    }

    @Override
    public String getUsername() {
        return karyawan.getUsername();
    }

    public String getNpk() {
        return karyawan.getNpk();
    }

    public String getNamaKaryawan() {
        return karyawan.getNamaKaryawan();
    }

    public String getBagian() {
        return karyawan.getBagian();
    }

    public RoleEnum getRole() {
        return karyawan.getRole();
    }

    public Karyawan getKaryawan() {
        return karyawan;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(karyawan.getStatusAktif());
    }
}

