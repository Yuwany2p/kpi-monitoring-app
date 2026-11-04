package com.kpi.prodi.controller;

import com.kpi.prodi.model.UploadFile;
import com.kpi.prodi.service.UploadProgressService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.io.IOException;
import java.net.URLConnection;

@Controller
public class FileDownloadController {

    private final UploadProgressService uploadProgressService;

    public FileDownloadController(UploadProgressService uploadProgressService) {
        this.uploadProgressService = uploadProgressService;
    }

    @GetMapping("/files/download/{idUpload}")
    public ResponseEntity<Resource> downloadFile(@PathVariable("idUpload") String idUpload) {
        UploadFile upload = uploadProgressService.findById(idUpload);
        Resource resource = uploadProgressService.loadFileAsResource(idUpload);

        String mimeType = URLConnection.guessContentTypeFromName(upload.getNamaFile());
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(mimeType))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + upload.getNamaFile() + "\"")
            .body(resource);
    }
}

