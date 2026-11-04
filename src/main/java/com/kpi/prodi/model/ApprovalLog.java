package com.kpi.prodi.model;

import com.kpi.prodi.model.enums.ApprovalAction;
import com.kpi.prodi.model.enums.ApprovalLevel;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "approval_log")
public class ApprovalLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long idLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_detail_kpi", nullable = false)
    private DetailKpi detailKpi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "npk", nullable = false)
    private Karyawan karyawan;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", length = 10, nullable = false)
    private ApprovalLevel level;

    @Enumerated(EnumType.STRING)
    @Column(name = "aksi", length = 10, nullable = false)
    private ApprovalAction aksi;

    @Column(name = "catatan", columnDefinition = "TEXT")
    private String catatan;

    @Column(name = "tanggal", nullable = false)
    private LocalDateTime tanggal = LocalDateTime.now();

    public ApprovalLog() {
    }

    public ApprovalLog(DetailKpi detailKpi, Karyawan karyawan, ApprovalLevel level, ApprovalAction aksi, String catatan) {
        this.detailKpi = detailKpi;
        this.karyawan = karyawan;
        this.level = level;
        this.aksi = aksi;
        this.catatan = catatan;
        this.tanggal = LocalDateTime.now();
    }

    public Long getIdLog() {
        return idLog;
    }

    public void setIdLog(Long idLog) {
        this.idLog = idLog;
    }

    public DetailKpi getDetailKpi() {
        return detailKpi;
    }

    public void setDetailKpi(DetailKpi detailKpi) {
        this.detailKpi = detailKpi;
    }

    public Karyawan getKaryawan() {
        return karyawan;
    }

    public void setKaryawan(Karyawan karyawan) {
        this.karyawan = karyawan;
    }

    public ApprovalLevel getLevel() {
        return level;
    }

    public void setLevel(ApprovalLevel level) {
        this.level = level;
    }

    public ApprovalAction getAksi() {
        return aksi;
    }

    public void setAksi(ApprovalAction aksi) {
        this.aksi = aksi;
    }

    public String getCatatan() {
        return catatan;
    }

    public void setCatatan(String catatan) {
        this.catatan = catatan;
    }

    public LocalDateTime getTanggal() {
        return tanggal;
    }

    public void setTanggal(LocalDateTime tanggal) {
        this.tanggal = tanggal;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ApprovalLog that = (ApprovalLog) o;
        return Objects.equals(idLog, that.idLog);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idLog);
    }
}

