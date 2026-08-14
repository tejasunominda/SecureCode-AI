package ai.securecode.common.audit;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AuditHashChainTest {

    @Test
    void computeEntryHash_returnsConsistentResult() {
        String prevHash = "abc123";
        String payload = "org1|user1|LOGIN|app_user|uuid1|2024-01-01T00:00:00Z";

        String hash1 = AuditHashChain.computeEntryHash(prevHash, payload);
        String hash2 = AuditHashChain.computeEntryHash(prevHash, payload);

        assertNotNull(hash1);
        assertEquals(64, hash1.length(), "SHA-256 hash should be 64 hex chars");
        assertEquals(hash1, hash2, "Same inputs should produce same hash");
    }

    @Test
    void computeEntryHash_differsForDifferentPayloads() {
        String prevHash = "abc123";

        String hash1 = AuditHashChain.computeEntryHash(prevHash, "payload_a");
        String hash2 = AuditHashChain.computeEntryHash(prevHash, "payload_b");

        assertNotEquals(hash1, hash2, "Different payloads should produce different hashes");
    }

    @Test
    void computeEntryHash_differsForDifferentPrevHash() {
        String payload = "same_payload";

        String hash1 = AuditHashChain.computeEntryHash("hash_a", payload);
        String hash2 = AuditHashChain.computeEntryHash("hash_b", payload);

        assertNotEquals(hash1, hash2, "Different prevHash should produce different hashes");
    }

    @Test
    void genesisHash_isAllZeros() {
        assertEquals("0".repeat(64), AuditHashChain.GENESIS_HASH);
        assertEquals(64, AuditHashChain.GENESIS_HASH.length());
    }

    @Test
    void computeEntryHash_worksWithGenesisHash() {
        String hash = AuditHashChain.computeEntryHash(AuditHashChain.GENESIS_HASH, "first_entry");
        assertNotNull(hash);
        assertEquals(64, hash.length());
        assertNotEquals(AuditHashChain.GENESIS_HASH, hash, "First entry hash should differ from genesis");
    }
}
