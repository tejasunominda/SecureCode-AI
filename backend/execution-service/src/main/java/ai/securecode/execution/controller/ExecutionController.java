package ai.securecode.execution.controller;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import ai.securecode.execution.service.DockerCodeExecutor;
import ai.securecode.execution.service.ExecutionQueue;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * SECURITY NOTE: all code-execution paths in this controller MUST run through
 * {@link DockerCodeExecutor} (network-isolated, resource-limited container).
 * The raw host-process {@code CodeExecutor} must never be reachable directly
 * from an inbound HTTP request — it exists only as an explicitly opt-in,
 * fail-closed fallback inside {@code ExecutionWorkerPool}, never as a
 * default execution path, since it executes untrusted candidate code
 * directly on the service host with no sandboxing (FR-EDIT-03).
 */
@RestController
@RequestMapping("/api/v1/execution")
public class ExecutionController {

    private final DockerCodeExecutor dockerCodeExecutor;
    private final ExecutionQueue executionQueue;

    public ExecutionController(DockerCodeExecutor dockerCodeExecutor, ExecutionQueue executionQueue) {
        this.dockerCodeExecutor = dockerCodeExecutor;
        this.executionQueue = executionQueue;
    }

    @PostMapping("/run")
    public ResponseEntity<ExecuteResponse> runCode(@Valid @RequestBody ExecuteRequest req) {
        String requestId = executionQueue.enqueue(req);
        ExecuteResponse response = executionQueue.waitForResult(requestId, 30000);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/run/sync")
    public ResponseEntity<ExecuteResponse> runCodeSync(@Valid @RequestBody ExecuteRequest req) {
        return ResponseEntity.ok(dockerCodeExecutor.execute(req));
    }
}
