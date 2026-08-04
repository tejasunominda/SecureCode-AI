package ai.securecode.proctoring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "ai.securecode")
public class ProctoringServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProctoringServiceApplication.class, args);
    }
}
