package ai.securecode.identity.service;

import ai.securecode.common.audit.AuditLogEntry;
import ai.securecode.identity.entity.AuditLogEntity;
import ai.securecode.identity.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository repo;

    @InjectMocks
    private AuditLogService service;

    private UUID orgId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void append_firstEntry_usesGenesisHash() {
        when(repo.findLatestHashByOrgId(orgId)).thenReturn(null);
        when(repo.save(any(AuditLogEntity.class))).thenAnswer(inv -> {
            AuditLogEntity e = inv.getArgument(0);
            e.setId(1L);
            return e;
        });

        AuditLogEntry entry = new AuditLogEntry(
                orgId, userId, "USER_LOGIN", "app_user", userId,
                null, null, Instant.now());

        AuditLogEntry result = service.append(entry);

        assertNotNull(result.entryHash());
        assertNotNull(result.prevHash());
        assertNotEquals(result.entryHash(), result.prevHash());
        verify(repo).save(any());
    }

    @Test
    void append_chainsToPreviousHash() {
        String prevHash = "abc123def456";
        when(repo.findLatestHashByOrgId(orgId)).thenReturn(prevHash);
        when(repo.save(any(AuditLogEntity.class))).thenAnswer(inv -> {
            AuditLogEntity e = inv.getArgument(0);
            e.setId(2L);
            return e;
        });

        AuditLogEntry entry = new AuditLogEntry(
                orgId, userId, "PASSWORD_CHANGED", "app_user", userId,
                null, null, Instant.now());

        AuditLogEntry result = service.append(entry);

        assertEquals(prevHash, result.prevHash());
        assertNotNull(result.entryHash());
        assertNotEquals(prevHash, result.entryHash());
    }

    @Test
    void log_createsAndAppendsEntry() {
        when(repo.findLatestHashByOrgId(orgId)).thenReturn(null);
        when(repo.save(any(AuditLogEntity.class))).thenAnswer(inv -> {
            AuditLogEntity e = inv.getArgument(0);
            e.setId(1L);
            return e;
        });

        service.log(orgId, userId, "USER_REGISTERED", "app_user", userId);

        verify(repo).save(any(AuditLogEntity.class));
    }

    @Test
    void findByOrg_returnsEntriesInOrder() {
        Instant now = Instant.now();
        AuditLogEntity e1 = new AuditLogEntity();
        e1.setId(1L);
        e1.setOrgId(orgId);
        e1.setAction("LOGIN");
        e1.setEntryHash("hash1");
        e1.setCreatedAt(now.minusSeconds(60));

        AuditLogEntity e2 = new AuditLogEntity();
        e2.setId(2L);
        e2.setOrgId(orgId);
        e2.setAction("LOGOUT");
        e2.setEntryHash("hash2");
        e2.setCreatedAt(now);

        when(repo.findByOrgIdAndCreatedAtBetweenOrderByCreatedAtAsc(eq(orgId), any(), any()))
                .thenReturn(List.of(e1, e2));

        List<AuditLogEntry> results = service.findByOrg(orgId, null, null, null);

        assertEquals(2, results.size());
        assertEquals("LOGIN", results.get(0).action());
        assertEquals("LOGOUT", results.get(1).action());
    }

    @Test
    void findByEntity_filtersByEntityTypeAndId() {
        UUID entityId = UUID.randomUUID();
        AuditLogEntity e = new AuditLogEntity();
        e.setId(1L);
        e.setOrgId(orgId);
        e.setAction("CREATED");
        e.setEntityType("assessment");
        e.setEntityId(entityId);
        e.setEntryHash("hash1");
        e.setCreatedAt(Instant.now());

        when(repo.findByOrgIdAndEntityTypeAndEntityIdOrderByCreatedAtAsc(orgId, "assessment", entityId))
                .thenReturn(List.of(e));

        List<AuditLogEntry> results = service.findByEntity(orgId, "assessment", entityId);

        assertEquals(1, results.size());
        assertEquals("assessment", results.get(0).entityType());
        assertEquals(entityId, results.get(0).entityId());
    }
}
