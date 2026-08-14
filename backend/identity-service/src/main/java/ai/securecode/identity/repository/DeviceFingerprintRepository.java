package ai.securecode.identity.repository;

import ai.securecode.identity.entity.DeviceFingerprint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceFingerprintRepository extends JpaRepository<DeviceFingerprint, UUID> {
    Optional<DeviceFingerprint> findByUserIdAndFingerprintHash(UUID userId, String fingerprintHash);
    List<DeviceFingerprint> findByUserId(UUID userId);
    List<DeviceFingerprint> findByFingerprintHash(String fingerprintHash);
}
