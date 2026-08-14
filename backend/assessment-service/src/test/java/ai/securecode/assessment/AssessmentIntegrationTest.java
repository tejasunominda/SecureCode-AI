package ai.securecode.assessment;

import ai.securecode.assessment.dto.CreateApplicantRequest;
import ai.securecode.assessment.dto.CreateAssessmentRequest;
import ai.securecode.assessment.dto.CreateQuestionRequest;
import ai.securecode.assessment.config.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AssessmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @MockBean
    private org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory redisConnectionFactory;

    private UUID orgId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void createApplicant_returns201_andPersists() throws Exception {
        CreateApplicantRequest req = new CreateApplicantRequest("John Doe", "john.doe@example.com", null);

        mockMvc.perform(post("/api/v1/assessment/applicants")
                        .header("X-Org-Id", orgId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("John Doe"))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"));
    }

    @Test
    void createApplicant_withBlankName_returns400() throws Exception {
        CreateApplicantRequest req = new CreateApplicantRequest("", "bad@example.com", null);

        mockMvc.perform(post("/api/v1/assessment/applicants")
                        .header("X-Org-Id", orgId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listApplicants_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/assessment/applicants")
                        .header("X-Org-Id", orgId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void createQuestion_returns201() throws Exception {
        CreateQuestionRequest req = new CreateQuestionRequest(
                "MCQ", "What is 2+2?", "1", "2", "3", "4", "D",
                "easy", "math", null, null, null, null);

        mockMvc.perform(post("/api/v1/assessment/questions")
                        .header("X-Org-Id", orgId.toString())
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("MCQ"))
                .andExpect(jsonPath("$.body").value("What is 2+2?"));
    }

    @Test
    void listQuestions_publicEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/assessment/questions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void createAssessment_returns201() throws Exception {
        CreateAssessmentRequest req = new CreateAssessmentRequest(
                "Java Assessment", null, null, null);

        mockMvc.perform(post("/api/v1/assessment/assessments")
                        .header("X-Org-Id", orgId.toString())
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Java Assessment"))
                .andExpect(jsonPath("$.proctoringLevel").value("standard"));
    }

    @Test
    void bulkImportQuestions_withinLimit_returns201() throws Exception {
        var questions = java.util.List.of(
                new CreateQuestionRequest("MCQ", "Q1", "A", "B", "C", "D", "A", "easy", "tag1", null, null, null, null),
                new CreateQuestionRequest("MCQ", "Q2", "A", "B", "C", "D", "B", "easy", "tag2", null, null, null, null)
        );

        mockMvc.perform(post("/api/v1/assessment/questions/bulk-import")
                        .header("X-Org-Id", orgId.toString())
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(questions)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void exportQuestions_returnsCsv() throws Exception {
        mockMvc.perform(get("/api/v1/assessment/questions/export")
                        .header("X-Org-Id", orgId.toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void fullAssessmentWorkflow_createLockAndList() throws Exception {
        // Create assessment
        CreateAssessmentRequest req = new CreateAssessmentRequest("Workflow Test", null, null, null);
        MvcResult createResult = mockMvc.perform(post("/api/v1/assessment/assessments")
                        .header("X-Org-Id", orgId.toString())
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseJson = createResult.getResponse().getContentAsString();
        String assessmentId = objectMapper.readTree(responseJson).get("id").asText();

        // Lock assessment
        mockMvc.perform(put("/api/v1/assessment/assessments/" + assessmentId + "/lock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lockedAt").isNotEmpty());

        // List assessments
        mockMvc.perform(get("/api/v1/assessment/assessments")
                        .header("X-Org-Id", orgId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
