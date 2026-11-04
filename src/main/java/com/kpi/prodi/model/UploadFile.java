package com.kpi.prodi.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "upload_file")
public class UploadFile {

    @Id
    @Column(name = "id_upload", length = 10, nullable = false)
    private String idUpload;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_detail_kpi", nullable = false)
    private DetailKpi detailKpi;

    @Column(name = "nama_file", length = 100)
    private String namaFile;

    @Column(name = "path", length = 255)
    private String path;

    @Column(name = "persentase_progres", precision = 5, scale = 2, nullable = false)
    private BigDecimal persentaseProgres;

    @Column(name = "catatan", columnDefinition = "TEXT")
    private String catatan;

    @Column(name = "tanggal_upload", nullable = false)
    private LocalDateTime tanggalUpload = LocalDateTime.now();

    public UploadFile() {
    }

    public String getIdUpload() {
        return idUpload;
    }

    public void setIdUpload(String idUpload) {
        this.idUpload = idUpload;
    }

    public DetailKpi getDetailKpi() {
        return detailKpi;
    }

    public void setDetailKpi(DetailKpi detailKpi) {
        this.detailKpi = detailKpi;
    }

    public String getNamaFile() {
        return namaFile;
    }

    public void setNamaFile(String namaFile) {
        this.namaFile = namaFile;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public BigDecimal getPersentaseProgres() {
        return persentaseProgres;
    }

    public void setPersentaseProgres(BigDecimal persentaseProgres) {
        this.persentaseProgres = persentaseProgres;
    }

    public String getCatatan() {
        return catatan;
    }

    public void setCatatan(String catatan) {
        this.catatan = catatan;
    }

    public LocalDateTime getTanggalUpload() {
        return tanggalUpload;
    }

    public void setTanggalUpload(LocalDateTime tanggalUpload) {
        this.tanggalUpload = tanggalUpload;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UploadFile that = (UploadFile) o;
        return Objects.equals(idUpload, that.idUpload);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idUpload);
    }
}

