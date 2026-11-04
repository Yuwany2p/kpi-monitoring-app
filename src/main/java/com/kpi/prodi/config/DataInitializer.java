package com.kpi.prodi.config;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.KaryawanRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final KaryawanRepository karyawanRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(KaryawanRepository karyawanRepository, PasswordEncoder passwordEncoder) {
        this.karyawanRepository = karyawanRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Automatically ensure default test users exist and have valid BCrypt passwords
        updateOrCreateUser("K001", "Kaprod Contoh", "Laki-laki", "Prodi", RoleEnum.KAPROD, "kaprod", "password123");
        updateOrCreateUser("S001", "Sekprod Contoh", "Perempuan", "Prodi", RoleEnum.SEKPROD, "sekprod", "password123");
        updateOrCreateUser("U001", "Kaupt Contoh", "Laki-laki", "UPT", RoleEnum.KAUPT, "kaupt", "password123");
        updateOrCreateUser("P001", "PIC Contoh", "Perempuan", "Prodi", RoleEnum.PIC_ACTIVITY, "pic", "password123");
    }

    private void updateOrCreateUser(String npk, String nama, String gender, String bagian, RoleEnum role, String username, String rawPassword) {
        Karyawan k = karyawanRepository.findById(npk).orElse(null);
        if (k == null) {
            k = new Karyawan(npk, nama, gender, bagian, role, username, passwordEncoder.encode(rawPassword), true);
            karyawanRepository.save(k);
        } else {
            // Verify BCrypt match, otherwise re-encode with valid BCrypt hash
            if (!passwordEncoder.matches(rawPassword, k.getPassword())) {
                k.setPassword(passwordEncoder.encode(rawPassword));
            }
            k.setStatusAktif(true);
            karyawanRepository.save(k);
        }
    }
}

