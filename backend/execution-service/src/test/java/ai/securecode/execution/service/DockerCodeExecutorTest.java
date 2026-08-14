package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DockerCodeExecutorTest {

    private DockerCodeExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new DockerCodeExecutor();
    }

    @Test
    void executeRequest_recordFieldsAreAccessible() {
        ExecuteRequest req = new ExecuteRequest("python", "print('hello')", null, null, null, null);
        assertEquals("python", req.language());
        assertEquals("print('hello')", req.code());
        assertNull(req.stdin());
    }

    @Test
    void executeResponse_successFactory() {
        ExecuteResponse resp = ExecuteResponse.success("hello\n", "", 0, 50);
        assertEquals("completed", resp.status());
        assertEquals("hello\n", resp.stdout());
        assertEquals(0, resp.exitCode());
        assertEquals(50, resp.runtimeMs());
        assertNull(resp.error());
    }

    @Test
    void executeResponse_timeoutFactory() {
        ExecuteResponse resp = ExecuteResponse.timeout("Process exceeded 5000ms wall-clock limit");
        assertEquals("timeout", resp.status());
        assertEquals(-1, resp.exitCode());
        assertNotNull(resp.error());
    }

    @Test
    void executeResponse_errorFactory() {
        ExecuteResponse resp = ExecuteResponse.error("Compilation failed");
        assertEquals("error", resp.status());
        assertEquals(-1, resp.exitCode());
        assertEquals("Compilation failed", resp.error());
    }
}
