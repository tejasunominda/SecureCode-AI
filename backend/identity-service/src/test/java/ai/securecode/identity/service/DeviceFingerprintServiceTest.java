package ai.securecode.identity.service;

import ai.securecode.identity.entity.DeviceFingerprint;
import ai.securecode.identity.repository.DeviceFingerprintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DeviceFingerprintServiceTest {

    private DeviceFingerprintRepository fingerprintRepo;
    private AuditLogService auditLogService;
    private DeviceFingerprintService service;

    @BeforeEach
    void setUp() {
        fingerprintRepo = mock(DeviceFingerprintRepository.class);
        auditLogService = mock(AuditLogService.class);
        service = new DeviceFingerprintService(fingerprintRepo, auditLogService);
    }

    @Test
    void computeHash_sameInputs_producesSameHash() {
        String hash1 = service.computeHash("Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");
        String hash2 = service.computeHash("Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");
        assertEquals(hash1, hash2);
        assertEquals(32, hash1.length());
    }

    @Test
    void computeHash_differentInputs_producesDifferentHash() {
        String hash1 = service.computeHash("Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");
        String hash2 = service.computeHash("Firefox", "Win32", "1920x1080", "Asia/Kolkata", "en-US");
        assertNotEquals(hash1, hash2);
    }

    @Test
    void recordOrUpdate_newFingerprint_createsNew() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        String hash = service.computeHash("Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");

        when(fingerprintRepo.findByUserIdAndFingerprintHash(userId, hash)).thenReturn(Optional.empty());
        when(fingerprintRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DeviceFingerprint result = service.recordOrUpdate(userId, orgId, hash, "Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");

        assertNotNull(result);
        assertEquals(userId, result.getUserId());
        assertEquals(hash, result.getFingerprintHash());
        assertFalse(result.isTrusted());
        verify(auditLogService).log(eq(orgId), eq(userId), eq("DEVICE_FINGERPRINT_RECORDED"), eq("device_fingerprint"), any());
    }

    @Test
    void recordOrUpdate_existingFingerprint_updatesLastSeen() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        String hash = service.computeHash("Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");

        DeviceFingerprint existing = new DeviceFingerprint();
        existing.setId(UUID.randomUUID());
        existing.setUserId(userId);
        existing.setOrgId(orgId);
        existing.setFingerprintHash(hash);
        existing.setTrusted(true);

        when(fingerprintRepo.findByUserIdAndFingerprintHash(userId, hash)).thenReturn(Optional.of(existing));
        when(fingerprintRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DeviceFingerprint result = service.recordOrUpdate(userId, orgId, hash, "Chrome", "Win32", "1920x1080", "Asia/Kolkata", "en-US");

        assertTrue(result.isTrusted());
        assertNotNull(result.getLastSeen());
    }

    @Test
    void findOtherUsersWithSameDevice_filtersCurrentUser() {
        UUID currentUser = UUID.randomUUID();
        UUID otherUser = UUID.randomUUID();
        String hash = "abc123";

        DeviceFingerprint fp1 = new DeviceFingerprint();
        fp1.setUserId(currentUser);

        DeviceFingerprint fp2 = new DeviceFingerprint();
        fp2.setUserId(otherUser);

        when(fingerprintRepo.findByFingerprintHash(hash)).thenReturn(List.of(fp1, fp2));

        List<DeviceFingerprint> others = service.findOtherUsersWithSameDevice(hash, currentUser);

        assertEquals(1, others.size());
        assertEquals(otherUser, others.get(0).getUserId());
    }
}
