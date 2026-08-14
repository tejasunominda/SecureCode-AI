package ai.securecode.identity.service;

import ai.securecode.identity.entity.DeviceFingerprint;
import ai.securecode.identity.repository.DeviceFingerprintRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DeviceFingerprintService {

    private final DeviceFingerprintRepository fingerprintRepo;
    private final AuditLogService auditLogService;

    public DeviceFingerprintService(DeviceFingerprintRepository fingerprintRepo,
                                    AuditLogService auditLogService) {
        this.fingerprintRepo = fingerprintRepo;
        this.auditLogService = auditLogService;
    }

    public String computeHash(String userAgent, String platform, String screenResolution,
                              String timezone, String language) {
        try {
            String raw = userAgent + "|" + platform + "|" + screenResolution + "|" + timezone + "|" + language;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.substring(0, 32);
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    public DeviceFingerprint recordOrUpdate(UUID userId, UUID orgId, String fingerprintHash,
                                             String userAgent, String platform,
                                             String screenResolution, String timezone, String language) {
        DeviceFingerprint fp = fingerprintRepo.findByUserIdAndFingerprintHash(userId, fingerprintHash)
                .orElseGet(() -> {
                    DeviceFingerprint newFp = new DeviceFingerprint();
                    newFp.setUserId(userId);
                    newFp.setOrgId(orgId);
                    newFp.setFingerprintHash(fingerprintHash);
                    newFp.setUserAgent(userAgent);
                    newFp.setPlatform(platform);
                    newFp.setScreenResolution(screenResolution);
                    newFp.setTimezone(timezone);
                    newFp.setLanguage(language);
                    newFp.setTrusted(false);
                    return newFp;
                });

        fp.setLastSeen(Instant.now());
        fp.setUserAgent(userAgent);
        fp.setPlatform(platform);
        fp.setScreenResolution(screenResolution);
        fp.setTimezone(timezone);
        fp.setLanguage(language);

        DeviceFingerprint saved = fingerprintRepo.save(fp);
        auditLogService.log(orgId, userId, "DEVICE_FINGERPRINT_RECORDED", "device_fingerprint", saved.getId());
        return saved;
    }

    public List<DeviceFingerprint> getDevicesForUser(UUID userId) {
        return fingerprintRepo.findByUserId(userId);
    }

    public List<DeviceFingerprint> findOtherUsersWithSameDevice(String fingerprintHash, UUID currentUserId) {
        return fingerprintRepo.findByFingerprintHash(fingerprintHash).stream()
                .filter(fp -> !fp.getUserId().equals(currentUserId))
                .toList();
    }

    public DeviceFingerprint setTrusted(UUID fingerprintId, boolean trusted) {
        DeviceFingerprint fp = fingerprintRepo.findById(fingerprintId)
                .orElseThrow(() -> new IllegalArgumentException("Fingerprint not found"));
        fp.setTrusted(trusted);
        return fingerprintRepo.save(fp);
    }
}
