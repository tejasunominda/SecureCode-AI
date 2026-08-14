package ai.securecode.assessment.service;

import ai.securecode.assessment.dto.CreateQuestionRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class QuestionBankImportMapper {

    public enum SourceFormat {
        HACKERRANK,
        CODESIGNAL,
        CODILITY,
        METTL,
        GENERIC_JSON
    }

    public List<CreateQuestionRequest> mapFromHackerRank(String json) {
        List<CreateQuestionRequest> results = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(json);
            com.fasterxml.jackson.databind.JsonNode questions = root.has("questions") ? root.get("questions") : root;
            if (questions.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode q : questions) {
                    String type = mapHackerRankType(q.path("type").asText("mcq"));
                    String body = q.path("question").asText(q.path("body").asText(""));
                    String optionA = q.path("options").path(0).asText("");
                    String optionB = q.path("options").path(1).asText("");
                    String optionC = q.path("options").path(2).asText("");
                    String optionD = q.path("options").path(3).asText("");
                    String correctOption = mapCorrectIndex(q.path("correctAnswer").asInt(-1));
                    String difficulty = mapDifficulty(q.path("difficulty").asText("easy"));
                    String testCases = q.path("testCases").asText("");
                    String hiddenTestCases = q.path("hiddenTestCases").asText("");
                    results.add(new CreateQuestionRequest(type, body, optionA, optionB, optionC, optionD,
                            correctOption, difficulty, null, testCases, hiddenTestCases, null, null));
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse HackerRank format: " + e.getMessage());
        }
        return results;
    }

    public List<CreateQuestionRequest> mapFromCodeSignal(String json) {
        List<CreateQuestionRequest> results = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(json);
            com.fasterxml.jackson.databind.JsonNode questions = root.has("tasks") ? root.get("tasks") : root;
            if (questions.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode q : questions) {
                    String type = "coding";
                    String body = q.path("description").asText("");
                    String testCases = q.path("testCases").asText("");
                    String hiddenTestCases = q.path("hiddenTestCases").asText("");
                    String difficulty = mapDifficulty(q.path("level").asText("easy"));
                    results.add(new CreateQuestionRequest(type, body, null, null, null, null,
                            null, difficulty, null, testCases, hiddenTestCases, null, null));
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse CodeSignal format: " + e.getMessage());
        }
        return results;
    }

    public List<CreateQuestionRequest> mapFromCodility(String json) {
        List<CreateQuestionRequest> results = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(json);
            com.fasterxml.jackson.databind.JsonNode questions = root.has("tasks") ? root.get("tasks") : root;
            if (questions.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode q : questions) {
                    String type = "coding";
                    String body = q.path("taskDescription").asText("");
                    String testCases = q.path("testCases").asText("");
                    String hiddenTestCases = q.path("hiddenTestCases").asText("");
                    String difficulty = mapDifficulty(q.path("difficulty").asText("easy"));
                    results.add(new CreateQuestionRequest(type, body, null, null, null, null,
                            null, difficulty, null, testCases, hiddenTestCases, null, null));
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse Codility format: " + e.getMessage());
        }
        return results;
    }

    public List<CreateQuestionRequest> mapFromMettl(String json) {
        List<CreateQuestionRequest> results = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(json);
            com.fasterxml.jackson.databind.JsonNode questions = root.has("questions") ? root.get("questions") : root;
            if (questions.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode q : questions) {
                    String type = mapMettlType(q.path("questionType").asText("mcq"));
                    String body = q.path("questionText").asText("");
                    com.fasterxml.jackson.databind.JsonNode opts = q.path("options");
                    String optionA = opts.path(0).path("text").asText("");
                    String optionB = opts.path(1).path("text").asText("");
                    String optionC = opts.path(2).path("text").asText("");
                    String optionD = opts.path(3).path("text").asText("");
                    String correctOption = mapCorrectIndex(q.path("correctOptionIndex").asInt(-1));
                    String difficulty = mapDifficulty(q.path("difficultyLevel").asText("easy"));
                    results.add(new CreateQuestionRequest(type, body, optionA, optionB, optionC, optionD,
                            correctOption, difficulty, null, null, null, null, null));
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse Mettl format: " + e.getMessage());
        }
        return results;
    }

    public List<CreateQuestionRequest> mapFromGenericJson(String json) {
        List<CreateQuestionRequest> results = new ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        try {
            List<CreateQuestionRequest> parsed = mapper.readValue(json,
                    mapper.getTypeFactory().constructCollectionType(List.class, CreateQuestionRequest.class));
            results.addAll(parsed);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse generic JSON format: " + e.getMessage());
        }
        return results;
    }

    public List<CreateQuestionRequest> map(String json, SourceFormat format) {
        return switch (format) {
            case HACKERRANK -> mapFromHackerRank(json);
            case CODESIGNAL -> mapFromCodeSignal(json);
            case CODILITY -> mapFromCodility(json);
            case METTL -> mapFromMettl(json);
            case GENERIC_JSON -> mapFromGenericJson(json);
        };
    }

    private String mapHackerRankType(String hrType) {
        return switch (hrType.toLowerCase()) {
            case "mcq", "multiple_choice" -> "aptitude";
            case "coding", "programming" -> "coding";
            case "sql" -> "sql";
            default -> "aptitude";
        };
    }

    private String mapMettlType(String mettlType) {
        return switch (mettlType.toLowerCase()) {
            case "mcq", "multiple_choice" -> "aptitude";
            case "coding", "programming" -> "coding";
            case "sql" -> "sql";
            default -> "aptitude";
        };
    }

    private String mapCorrectIndex(int idx) {
        return switch (idx) {
            case 0 -> "A";
            case 1 -> "B";
            case 2 -> "C";
            case 3 -> "D";
            default -> null;
        };
    }

    private String mapDifficulty(String diff) {
        if (diff == null || diff.isBlank()) return "easy";
        return switch (diff.toLowerCase()) {
            case "hard", "difficult", "advanced", "3" -> "hard";
            case "medium", "intermediate", "moderate", "2" -> "medium";
            default -> "easy";
        };
    }
}
