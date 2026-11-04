package com.kpi.prodi.model;

import com.kpi.prodi.model.enums.DetailKpiStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "detail_kpi")
public class DetailKpi {

    @Id
    @Column(name = "id_detail_kpi", length = 10, nullable = false)
    private String idDetailKpi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_kpi", nullable = false)
    private Kpi kpi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "npk_pic")
    private Karyawan pic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dibuat_oleh", nullable = false)
    private Karyawan dibuatOleh;

    @Column(name = "nama_aktivitas_kpi", length = 250, nullable = false)
    private String namaAktivitasKpi;

    @Column(name = "persentase_bobot", precision = 5, scale = 2, nullable = false)
    private BigDecimal persentaseBobot = BigDecimal.ZERO;

    @Column(name = "persentase_progres", precision = 5, scale = 2, nullable = false)
    private BigDecimal persentaseProgres = BigDecimal.ZERO;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private DetailKpiStatus status = DetailKpiStatus.OPEN;

    @OneToMany(mappedBy = "detailKpi", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("tanggalUpload DESC")
    private List<UploadFile> uploadFileList = new ArrayList<>();

    @OneToMany(mappedBy = "detailKpi", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("tanggal DESC")
    private List<ApprovalLog> approvalLogList = new ArrayList<>();

    public DetailKpi() {
    }

    public String getIdDetailKpi() {
        return idDetailKpi;
    }

    public void setIdDetailKpi(String idDetailKpi) {
        this.idDetailKpi = idDetailKpi;
    }

    public Kpi getKpi() {
        return kpi;
    }

    public void setKpi(Kpi kpi) {
        this.kpi = kpi;
    }

    public Karyawan getPic() {
        return pic;
    }

    public void setPic(Karyawan pic) {
        this.pic = pic;
    }

    public Karyawan getDibuatOleh() {
        return dibuatOleh;
    }

    public void setDibuatOleh(Karyawan dibuatOleh) {
        this.dibuatOleh = dibuatOleh;
    }

    public String getNamaAktivitasKpi() {
        return namaAktivitasKpi;
    }

    public void setNamaAktivitasKpi(String namaAktivitasKpi) {
        this.namaAktivitasKpi = namaAktivitasKpi;
    }

    public BigDecimal getPersentaseBobot() {
        return persentaseBobot;
    }

    public void setPersentaseBobot(BigDecimal persentaseBobot) {
        this.persentaseBobot = persentaseBobot;
    }

    public BigDecimal getPersentaseProgres() {
        return persentaseProgres;
    }

    public void setPersentaseProgres(BigDecimal persentaseProgres) {
        this.persentaseProgres = persentaseProgres;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public DetailKpiStatus getStatus() {
        return status;
    }

    public void setStatus(DetailKpiStatus status) {
        this.status = status;
    }

    public List<UploadFile> getUploadFileList() {
        return uploadFileList;
    }

    public void setUploadFileList(List<UploadFile> uploadFileList) {
        this.uploadFileList = uploadFileList;
    }

    public List<ApprovalLog> getApprovalLogList() {
        return approvalLogList;
    }

    public void setApprovalLogList(List<ApprovalLog> approvalLogList) {
        this.approvalLogList = approvalLogList;
    }

    public UploadFile getLatestUpload() {
        if (uploadFileList != null && !uploadFileList.isEmpty()) {
            return uploadFileList.get(0);
        }
        return null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DetailKpi that = (DetailKpi) o;
        return Objects.equals(idDetailKpi, that.idDetailKpi);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idDetailKpi);
    }
}

