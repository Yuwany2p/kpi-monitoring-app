package com.kpi.prodi.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public synchronized String generateKpiId() {
        return getNextPrefixedId("KPI", "seq_kpi", "kpi", "id_kpi");
    }

    @Transactional
    public synchronized String generateDetailKpiId() {
        return getNextPrefixedId("DKP", "seq_detail_kpi", "detail_kpi", "id_detail_kpi");
    }

    @Transactional
    public synchronized String generateUploadId() {
        return getNextPrefixedId("UPL", "seq_upload", "upload_file", "id_upload");
    }

    private String getNextPrefixedId(String prefix, String sequenceName, String tableName, String columnName) {
        try {
            // First attempt: use DB sequence
            Query query = entityManager.createNativeQuery("SELECT nextval('" + sequenceName + "')");
            Object result = query.getSingleResult();
            long nextVal = ((Number) result).longValue();
            return String.format("%s%07d", prefix, nextVal);
        } catch (Exception e) {
            // Fallback: calculate from max ID in table
            try {
                Query fallbackQuery = entityManager.createNativeQuery(
                    "SELECT COALESCE(MAX(CAST(SUBSTRING(" + columnName + ", 4) AS BIGINT)), 0) + 1 FROM " + tableName
                );
                Object result = fallbackQuery.getSingleResult();
                long nextVal = ((Number) result).longValue();
                return String.format("%s%07d", prefix, nextVal);
            } catch (Exception ex) {
                long timestamp = System.currentTimeMillis() % 10000000;
                return String.format("%s%07d", prefix, timestamp);
            }
        }
    }
}

