package ai.securecode.assessment.dto;

import java.util.Map;
import java.util.UUID;

public record AutoSaveRequest(
        String currentSection,
        Integer currentQuestionIndex,
        String code,
        String language,
        Map<String, String> answers
) {}
