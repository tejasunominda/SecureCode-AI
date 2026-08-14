package ai.securecode.identity.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "device_fingerprint")
public class DeviceFingerprint {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "fingerprint_hash", nullable = false)
    private String fingerprintHash;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "platform")
    private String platform;

    @Column(name = "screen_resolution")
    private String screenResolution;

    @Column(name = "timezone")
    private String timezone;

    @Column(name = "language")
    private String language;

    @Column(name = "first_seen", nullable = false, updatable = false)
    private Instant firstSeen = Instant.now();

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen = Instant.now();

    @Column(name = "is_trusted", nullable = false)
    private boolean trusted = false;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public String getFingerprintHash() { return fingerprintHash; }
    public void setFingerprintHash(String fingerprintHash) { this.fingerprintHash = fingerprintHash; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getScreenResolution() { return screenResolution; }
    public void setScreenResolution(String screenResolution) { this.screenResolution = screenResolution; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Instant getFirstSeen() { return firstSeen; }
    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }
    public boolean isTrusted() { return trusted; }
    public void setTrusted(boolean trusted) { this.trusted = trusted; }
}
