package ai.securecode.assessment.dto;

import java.time.Instant;
import java.util.Map;

public record AutoSaveResponse(
        String currentSection,
        Integer currentQuestionIndex,
        String code,
        String language,
        Map<String, String> answers,
        Instant savedAt
) {}
