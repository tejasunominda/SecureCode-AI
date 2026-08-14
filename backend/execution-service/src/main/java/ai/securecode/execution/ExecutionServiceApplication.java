package ai.securecode.execution;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "ai.securecode")
public class ExecutionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExecutionServiceApplication.class, args);
    }
}
