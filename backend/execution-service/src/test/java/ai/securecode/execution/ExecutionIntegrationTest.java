package ai.securecode.execution;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import ai.securecode.execution.service.DockerCodeExecutor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExecutionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DockerCodeExecutor dockerCodeExecutor;

    @MockBean
    private ai.securecode.execution.service.ExecutionQueue executionQueue;

    @Test
    void runCodeSync_validRequest_returns200() throws Exception {
        ExecuteRequest req = new ExecuteRequest("java", "System.out.println(42);", null, "42", null, null);
        ExecuteResponse mockResp = ExecuteResponse.success("42\n", "", 0, 100);

        when(dockerCodeExecutor.execute(any())).thenReturn(mockResp);

        mockMvc.perform(post("/api/v1/execution/run/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stdout").value("42\n"))
                .andExpect(jsonPath("$.exitCode").value(0))
                .andExpect(jsonPath("$.status").value("completed"));
    }

    @Test
    void runCodeSync_blankLanguage_returns400() throws Exception {
        ExecuteRequest req = new ExecuteRequest("", "print('hello')", null, null, null, null);

        mockMvc.perform(post("/api/v1/execution/run/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void runCodeSync_blankCode_returns400() throws Exception {
        ExecuteRequest req = new ExecuteRequest("python", "", null, null, null, null);

        mockMvc.perform(post("/api/v1/execution/run/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void runCodeSync_timeoutResponse_returns200() throws Exception {
        ExecuteRequest req = new ExecuteRequest("python", "while True: pass", null, null, null, null);
        ExecuteResponse mockResp = ExecuteResponse.timeout("Execution timed out after 5000ms");

        when(dockerCodeExecutor.execute(any())).thenReturn(mockResp);

        mockMvc.perform(post("/api/v1/execution/run/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("timeout"));
    }

    @Test
    void runCodeSync_errorResponse_returns200() throws Exception {
        ExecuteRequest req = new ExecuteRequest("java", "throw new RuntimeException();", null, null, null, null);
        ExecuteResponse mockResp = ExecuteResponse.error("Runtime exception");

        when(dockerCodeExecutor.execute(any())).thenReturn(mockResp);

        mockMvc.perform(post("/api/v1/execution/run/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("error"))
                .andExpect(jsonPath("$.error").value("Runtime exception"));
    }
}
