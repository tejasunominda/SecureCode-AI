package ai.securecode.assessment.dto;

import java.time.Instant;
import java.util.UUID;

public record QuestionResponse(
        UUID id,
        String type,
        String body,
        String optionA,
        String optionB,
        String optionC,
        String optionD,
        String correctOption,
        String difficulty,
        String tags,
        String testCases,
        String status,
        int version,
        Instant createdAt
) {}
