package com.kpi.prodi.service;

import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.enums.RoleEnum;
import com.kpi.prodi.repository.KaryawanRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class KaryawanService {

    private final KaryawanRepository karyawanRepository;
    private final PasswordEncoder passwordEncoder;

    public KaryawanService(KaryawanRepository karyawanRepository, PasswordEncoder passwordEncoder) {
        this.karyawanRepository = karyawanRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<Karyawan> findAll() {
        return karyawanRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Karyawan> findByNpk(String npk) {
        return karyawanRepository.findById(npk);
    }

    @Transactional(readOnly = true)
    public Optional<Karyawan> findByUsername(String username) {
        return karyawanRepository.findByUsername(username);
    }

    @Transactional(readOnly = true)
    public List<Karyawan> findPenanggungJawabCandidates() {
        return karyawanRepository.findByRoleIn(Arrays.asList(RoleEnum.SEKPROD, RoleEnum.KAUPT));
    }

    public Karyawan save(Karyawan karyawan, boolean isNew) {
        if (isNew) {
            if (karyawanRepository.existsByNpk(karyawan.getNpk())) {
                throw new IllegalArgumentException("NPK '" + karyawan.getNpk() + "' sudah terdaftar.");
            }
            if (karyawanRepository.existsByUsername(karyawan.getUsername())) {
                throw new IllegalArgumentException("Username '" + karyawan.getUsername() + "' sudah digunakan.");
            }
            karyawan.setPassword(passwordEncoder.encode(karyawan.getPassword()));
            if (karyawan.getStatusAktif() == null) {
                karyawan.setStatusAktif(true);
            }
            return karyawanRepository.save(karyawan);
        } else {
            Karyawan existing = karyawanRepository.findById(karyawan.getNpk())
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan"));

            // Check if username changed and is unique
            if (!existing.getUsername().equalsIgnoreCase(karyawan.getUsername()) &&
                karyawanRepository.existsByUsername(karyawan.getUsername())) {
                throw new IllegalArgumentException("Username '" + karyawan.getUsername() + "' sudah digunakan.");
            }

            existing.setNamaKaryawan(karyawan.getNamaKaryawan());
            existing.setGender(karyawan.getGender());
            existing.setBagian(karyawan.getBagian());
            existing.setRole(karyawan.getRole());
            existing.setUsername(karyawan.getUsername());
            existing.setStatusAktif(karyawan.getStatusAktif());

            if (karyawan.getPassword() != null && !karyawan.getPassword().trim().isEmpty()) {
                existing.setPassword(passwordEncoder.encode(karyawan.getPassword()));
            }

            return karyawanRepository.save(existing);
        }
    }

    public void toggleStatus(String npk) {
        Karyawan karyawan = karyawanRepository.findById(npk)
            .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan"));
        karyawan.setStatusAktif(!Boolean.TRUE.equals(karyawan.getStatusAktif()));
        karyawanRepository.save(karyawan);
    }

    public void delete(String npk) {
        karyawanRepository.deleteById(npk);
    }
}

