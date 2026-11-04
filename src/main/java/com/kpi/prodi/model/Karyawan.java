package com.kpi.prodi.model;

import com.kpi.prodi.model.enums.RoleEnum;
import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "karyawan")
public class Karyawan {

    @Id
    @Column(name = "npk", length = 10, nullable = false)
    private String npk;

    @Column(name = "nama_karyawan", length = 100, nullable = false)
    private String namaKaryawan;

    @Column(name = "gender", length = 25)
    private String gender;

    @Column(name = "bagian", length = 100)
    private String bagian;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, nullable = false)
    private RoleEnum role;

    @Column(name = "username", length = 50, nullable = false, unique = true)
    private String username;

    @Column(name = "password", length = 100, nullable = false)
    private String password;

    @Column(name = "status_aktif", nullable = false)
    private Boolean statusAktif = true;

    public Karyawan() {
    }

    public Karyawan(String npk, String namaKaryawan, String gender, String bagian, RoleEnum role, String username, String password, Boolean statusAktif) {
        this.npk = npk;
        this.namaKaryawan = namaKaryawan;
        this.gender = gender;
        this.bagian = bagian;
        this.role = role;
        this.username = username;
        this.password = password;
        this.statusAktif = statusAktif != null ? statusAktif : true;
    }

    public String getNpk() {
        return npk;
    }

    public void setNpk(String npk) {
        this.npk = npk;
    }

    public String getNamaKaryawan() {
        return namaKaryawan;
    }

    public void setNamaKaryawan(String namaKaryawan) {
        this.namaKaryawan = namaKaryawan;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getBagian() {
        return bagian;
    }

    public void setBagian(String bagian) {
        this.bagian = bagian;
    }

    public RoleEnum getRole() {
        return role;
    }

    public void setRole(RoleEnum role) {
        this.role = role;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean getStatusAktif() {
        return statusAktif;
    }

    public void setStatusAktif(Boolean statusAktif) {
        this.statusAktif = statusAktif;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Karyawan karyawan = (Karyawan) o;
        return Objects.equals(npk, karyawan.npk);
    }

    @Override
    public int hashCode() {
        return Objects.hash(npk);
    }
}

