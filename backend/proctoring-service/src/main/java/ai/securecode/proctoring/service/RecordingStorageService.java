package ai.securecode.proctoring.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.BucketExistsArgs;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.UUID;

/**
 * Stores proctoring session recordings (webcam, mic, screen) to MinIO object
 * storage (FR-PROC-08). Each recording is stored under a session-scoped path.
 */
@Service
public class RecordingStorageService {

    private static final Logger log = LoggerFactory.getLogger(RecordingStorageService.class);
    private static final String BUCKET = "securecode-recordings";

    @Value("${proctoring.minio-endpoint:http://localhost:9000}")
    private String minioEndpoint;

    @Value("${proctoring.minio-access-key:minioadmin}")
    private String minioAccessKey;

    @Value("${proctoring.minio-secret-key:minioadmin}")
    private String minioSecretKey;

    private MinioClient minioClient;

    @PostConstruct
    void init() {
        minioClient = MinioClient.builder()
                .endpoint(minioEndpoint)
                .credentials(minioAccessKey, minioSecretKey)
                .build();
        ensureBucket();
    }

    private void ensureBucket() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(BUCKET).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(BUCKET).build());
                log.info("Created MinIO bucket: {}", BUCKET);
            }
        } catch (Exception e) {
            log.warn("Failed to ensure MinIO bucket exists: {}", e.getMessage());
        }
    }

    public String storeRecording(UUID sessionId, String recordingType, InputStream data, long size, String contentType) {
        String objectName = String.format("%s/%s_%s_%d", sessionId, recordingType, UUID.randomUUID(), System.currentTimeMillis());
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(BUCKET)
                    .object(objectName)
                    .stream(data, size, -1)
                    .contentType(contentType)
                    .build());
            log.info("Stored recording: {}/{}", BUCKET, objectName);
            return String.format("%s/%s/%s", minioEndpoint, BUCKET, objectName);
        } catch (Exception e) {
            log.error("Failed to store recording for session {}: {}", sessionId, e.getMessage());
            throw new RuntimeException("Failed to store recording", e);
        }
    }

    public String storeScreenshot(UUID sessionId, InputStream data, long size) {
        return storeRecording(sessionId, "screenshot", data, size, "image/png");
    }

    public String storeWebcamClip(UUID sessionId, InputStream data, long size) {
        return storeRecording(sessionId, "webcam", data, size, "video/webm");
    }

    public String storeScreenClip(UUID sessionId, InputStream data, long size) {
        return storeRecording(sessionId, "screen", data, size, "video/webm");
    }

    public String storeAudioClip(UUID sessionId, InputStream data, long size) {
        return storeRecording(sessionId, "audio", data, size, "audio/webm");
    }
}
