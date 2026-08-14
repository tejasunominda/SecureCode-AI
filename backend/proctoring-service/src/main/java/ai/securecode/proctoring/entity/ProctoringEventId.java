package ai.securecode.proctoring.entity;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public class ProctoringEventId implements Serializable {
    private UUID id;
    private Instant occurredAt;

    public ProctoringEventId() {}

    public ProctoringEventId(UUID id, Instant occurredAt) {
        this.id = id;
        this.occurredAt = occurredAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProctoringEventId that)) return false;
        return java.util.Objects.equals(id, that.id) && java.util.Objects.equals(occurredAt, that.occurredAt);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id, occurredAt);
    }
}
