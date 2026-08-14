package ai.securecode.execution.controller;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import ai.securecode.execution.service.CodeExecutor;
import ai.securecode.execution.service.ExecutionQueue;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/execution")
public class ExecutionController {

    private final CodeExecutor codeExecutor;
    private final ExecutionQueue executionQueue;

    public ExecutionController(CodeExecutor codeExecutor, ExecutionQueue executionQueue) {
        this.codeExecutor = codeExecutor;
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
        return ResponseEntity.ok(codeExecutor.execute(req));
    }
}
