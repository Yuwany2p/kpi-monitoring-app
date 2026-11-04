package com.kpi.prodi.service;

import com.kpi.prodi.model.DetailKpi;
import com.kpi.prodi.model.Karyawan;
import com.kpi.prodi.model.UploadFile;
import com.kpi.prodi.model.enums.DetailKpiStatus;
import com.kpi.prodi.repository.DetailKpiRepository;
import com.kpi.prodi.repository.UploadFileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class UploadProgressService {

    private final UploadFileRepository uploadFileRepository;
    private final DetailKpiRepository detailKpiRepository;
    private final IdGeneratorService idGeneratorService;

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "docx", "xlsx", "png", "jpg", "jpeg");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    public UploadProgressService(UploadFileRepository uploadFileRepository,
                                 DetailKpiRepository detailKpiRepository,
                                 IdGeneratorService idGeneratorService) {
        this.uploadFileRepository = uploadFileRepository;
        this.detailKpiRepository = detailKpiRepository;
        this.idGeneratorService = idGeneratorService;
    }

    public UploadFile uploadProgress(String idDetailKpi,
                                     BigDecimal persentaseProgres,
                                     String catatan,
                                     MultipartFile file,
                                     Karyawan pic) throws IOException {

        DetailKpi activity = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));

        // Rule: PIC hanya bisa upload progres untuk activity yang dia ambil sendiri
        if (activity.getPic() == null || !activity.getPic().getNpk().equals(pic.getNpk())) {
            throw new SecurityException("Anda hanya dapat mengunggah progres untuk aktivitas yang Anda ambil sendiri.");
        }

        // Must be in PICKED or REVISION
        if (activity.getStatus() != DetailKpiStatus.PICKED && activity.getStatus() != DetailKpiStatus.REVISION) {
            throw new IllegalStateException("Aktivitas saat ini berstatus " + activity.getStatus() + ", tidak dapat mengunggah progres baru.");
        }

        // Validate percentage
        if (persentaseProgres == null || persentaseProgres.compareTo(BigDecimal.ZERO) < 0 || persentaseProgres.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Persentase progres harus berada di rentang 0 hingga 100.");
        }

        // Validate file
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Berkas bukti progress wajib diunggah.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Ukuran berkas melebihi batas maksimal 5 MB.");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Tipe berkas tidak diizinkan. Tipe yang didukung: PDF, DOCX, XLSX, PNG, JPG.");
        }

        // Save file to disk
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String storedFileName = UUID.randomUUID().toString() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
        Path destination = uploadPath.resolve(storedFileName);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

        // Record in DB
        UploadFile upload = new UploadFile();
        upload.setIdUpload(idGeneratorService.generateUploadId());
        upload.setDetailKpi(activity);
        upload.setNamaFile(originalFilename);
        upload.setPath(uploadDir + (uploadDir.endsWith("/") ? "" : "/") + storedFileName);
        upload.setPersentaseProgres(persentaseProgres);
        upload.setCatatan(catatan);
        upload.setTanggalUpload(LocalDateTime.now());

        UploadFile savedUpload = uploadFileRepository.save(upload);

        // Update activity status to SUBMITTED
        activity.setStatus(DetailKpiStatus.SUBMITTED);
        detailKpiRepository.save(activity);

        return savedUpload;
    }

    @Transactional(readOnly = true)
    public List<UploadFile> getHistory(String idDetailKpi) {
        DetailKpi detailKpi = detailKpiRepository.findById(idDetailKpi)
            .orElseThrow(() -> new IllegalArgumentException("Aktivitas tidak ditemukan"));
        return uploadFileRepository.findByDetailKpiOrderByTanggalUploadDesc(detailKpi);
    }

    @Transactional(readOnly = true)
    public Resource loadFileAsResource(String idUpload) {
        UploadFile upload = uploadFileRepository.findById(idUpload)
            .orElseThrow(() -> new IllegalArgumentException("Berkas tidak ditemukan"));

        try {
            Path filePath = Paths.get(upload.getPath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Berkas fisik tidak ditemukan di server: " + upload.getPath());
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Path berkas tidak valid: " + upload.getPath(), ex);
        }
    }

    @Transactional(readOnly = true)
    public UploadFile findById(String idUpload) {
        return uploadFileRepository.findById(idUpload)
            .orElseThrow(() -> new IllegalArgumentException("Data upload tidak ditemukan"));
    }
}

