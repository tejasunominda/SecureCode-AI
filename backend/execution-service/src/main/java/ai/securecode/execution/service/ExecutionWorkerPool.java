package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Worker pool that polls the Redis execution queue and dispatches requests
 * to the DockerCodeExecutor. Scales horizontally by adding more service instances
 * (FR-EDIT-04: "queue execution requests and scale worker pools horizontally").
 */
@Service
public class ExecutionWorkerPool {

    private static final Logger log = LoggerFactory.getLogger(ExecutionWorkerPool.class);

    @Value("${execution.worker-pool-size:4}")
    private int workerPoolSize;

    private final ExecutionQueue queue;
    private final DockerCodeExecutor dockerExecutor;
    private final CodeExecutor fallbackExecutor;
    private final ExecutorService executor;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public ExecutionWorkerPool(ExecutionQueue queue, DockerCodeExecutor dockerExecutor, CodeExecutor fallbackExecutor) {
        this.queue = queue;
        this.dockerExecutor = dockerExecutor;
        this.fallbackExecutor = fallbackExecutor;
        this.executor = Executors.newFixedThreadPool(workerPoolSize);
    }

    @PostConstruct
    void start() {
        running.set(true);
        for (int i = 0; i < workerPoolSize; i++) {
            executor.submit(this::workerLoop);
        }
        log.info("Started {} execution workers", workerPoolSize);
    }

    @PreDestroy
    void stop() {
        running.set(false);
        executor.shutdownNow();
    }

    private void workerLoop() {
        while (running.get()) {
            try {
                ExecutionQueue.QueuedRequest queued = queue.dequeue(5);
                if (queued == null) continue;

                ExecuteResponse response;
                try {
                    response = dockerExecutor.execute(queued.request());
                } catch (Exception dockerEx) {
                    log.warn("Docker execution failed, falling back to subprocess: {}", dockerEx.getMessage());
                    response = fallbackExecutor.execute(queued.request());
                }

                queue.publishResult(queued.requestId(), response);
            } catch (Exception e) {
                log.error("Worker error", e);
            }
        }
    }
}
