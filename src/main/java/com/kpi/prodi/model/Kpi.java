package com.kpi.prodi.model;

import com.kpi.prodi.model.enums.KpiStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;

@Entity
@Table(name = "kpi")
public class Kpi {

    @Id
    @Column(name = "id_kpi", length = 10, nullable = false)
    private String idKpi;

    @Column(name = "nama_kpi", length = 100, nullable = false)
    private String namaKpi;

    @Column(name = "persentase_bobot", precision = 5, scale = 2, nullable = false)
    private BigDecimal persentaseBobot = BigDecimal.ZERO;

    @Column(name = "persentase_progres", precision = 5, scale = 2, nullable = false)
    private BigDecimal persentaseProgres = BigDecimal.ZERO;

    @Column(name = "level", length = 100)
    private String level;

    @Column(name = "kategori", length = 100)
    private String kategori;

    @Column(name = "periode", length = 20)
    private String periode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private KpiStatus status = KpiStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dibuat_oleh", nullable = false)
    private Karyawan dibuatOleh;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "kpi_penanggung_jawab",
        joinColumns = @JoinColumn(name = "id_kpi"),
        inverseJoinColumns = @JoinColumn(name = "npk")
    )
    private Set<Karyawan> penanggungJawabList = new HashSet<>();

    @OneToMany(mappedBy = "kpi", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("idDetailKpi ASC")
    private List<DetailKpi> detailKpiList = new ArrayList<>();

    public Kpi() {
    }

    public String getIdKpi() {
        return idKpi;
    }

    public void setIdKpi(String idKpi) {
        this.idKpi = idKpi;
    }

    public String getNamaKpi() {
        return namaKpi;
    }

    public void setNamaKpi(String namaKpi) {
        this.namaKpi = namaKpi;
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

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getKategori() {
        return kategori;
    }

    public void setKategori(String kategori) {
        this.kategori = kategori;
    }

    public String getPeriode() {
        return periode;
    }

    public void setPeriode(String periode) {
        this.periode = periode;
    }

    public KpiStatus getStatus() {
        return status;
    }

    public void setStatus(KpiStatus status) {
        this.status = status;
    }

    public Karyawan getDibuatOleh() {
        return dibuatOleh;
    }

    public void setDibuatOleh(Karyawan dibuatOleh) {
        this.dibuatOleh = dibuatOleh;
    }

    public Set<Karyawan> getPenanggungJawabList() {
        return penanggungJawabList;
    }

    public void setPenanggungJawabList(Set<Karyawan> penanggungJawabList) {
        this.penanggungJawabList = penanggungJawabList;
    }

    public List<DetailKpi> getDetailKpiList() {
        return detailKpiList;
    }

    public void setDetailKpiList(List<DetailKpi> detailKpiList) {
        this.detailKpiList = detailKpiList;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Kpi kpi = (Kpi) o;
        return Objects.equals(idKpi, kpi.idKpi);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idKpi);
    }
}

