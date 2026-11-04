package com.kpi.prodi.security;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.repository.KaryawanRepository;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final KaryawanRepository karyawanRepository;

    public CustomUserDetailsService(KaryawanRepository karyawanRepository) {
        this.karyawanRepository = karyawanRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrNpk) throws UsernameNotFoundException {
        Karyawan karyawan = karyawanRepository.findByUsernameOrNpk(usernameOrNpk)
            .orElseThrow(() -> new UsernameNotFoundException("Karyawan tidak ditemukan dengan Username/NPK: " + usernameOrNpk));

        if (Boolean.FALSE.equals(karyawan.getStatusAktif())) {
            throw new DisabledException("Akun karyawan nonaktif. Hubungi KAPROD.");
        }

        return new CustomUserDetails(karyawan);
    }
}

