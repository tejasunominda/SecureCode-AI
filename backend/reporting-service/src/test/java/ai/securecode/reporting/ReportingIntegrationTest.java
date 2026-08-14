package ai.securecode.reporting;

import ai.securecode.reporting.entity.OrgAnalytics;
import ai.securecode.reporting.repository.OrgAnalyticsRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrgAnalyticsRepository orgAnalyticsRepo;

    private UUID orgId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
    }

    @Test
    void getOrgAnalytics_noData_returnsZeros() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orgId").value(orgId.toString()))
                .andExpect(jsonPath("$.totalSessions").value(0))
                .andExpect(jsonPath("$.completedSessions").value(0));
    }

    @Test
    void getOrgAnalytics_withData_returnsValues() throws Exception {
        OrgAnalytics analytics = new OrgAnalytics();
        analytics.setOrgId(orgId);
        analytics.setTotalSessions(100);
        analytics.setCompletedSessions(80);
        analytics.setTerminatedSessions(5);
        analytics.setAvgScore(new BigDecimal("75.50"));
        analytics.setPassRate(new BigDecimal("80.00"));
        analytics.setTotalViolations(30);
        analytics.setConfirmedViolations(10);
        analytics.setHiringShortlisted(40);
        analytics.setHiringRejected(20);
        orgAnalyticsRepo.save(analytics);

        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(100))
                .andExpect(jsonPath("$.completedSessions").value(80))
                .andExpect(jsonPath("$.terminatedSessions").value(5))
                .andExpect(jsonPath("$.avgScore").value(75.50))
                .andExpect(jsonPath("$.passRate").value(80.00));
    }

    @Test
    void getQuestionAnalytics_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/questions/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getSkillGapAnalysis_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics/skill-gap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void refreshAnalytics_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/reporting/orgs/" + orgId + "/analytics/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orgId").value(orgId.toString()));
    }

    @Test
    void getCheatingInsights_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/cheating-insights"))
                .andExpect(status().isOk());
    }

    @Test
    void exportOrgAnalytics_csv_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics/export")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void exportOrgAnalytics_pdf_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics/export")
                        .param("format", "pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    void exportQuestionAnalytics_csv_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/questions/analytics/export")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void exportSkillGap_csv_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/analytics/skill-gap/export")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    @Test
    void exportCheatingInsights_csv_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/orgs/" + orgId + "/cheating-insights/export")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder post(String url, Object... uriVars) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url, uriVars);
    }
}
