package ai.securecode.identity.config;

import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class Argon2PasswordEncoder {

    private static final int ITERATIONS = 3;
    private static final int MEMORY = 65536;
    private static final int PARALLELISM = 1;
    private static final int HASH_LENGTH = 32;
    private static final int SALT_LENGTH = 16;

    public String encode(String rawPassword) {
        byte[] salt = new byte[SALT_LENGTH];
        new java.security.SecureRandom().nextBytes(salt);
        byte[] hash = hash(rawPassword, salt);
        return "$argon2id$v=19$m=" + MEMORY + ",t=" + ITERATIONS + ",p=" + PARALLELISM +
                "$" + Base64.getEncoder().withoutPadding().encodeToString(salt) +
                "$" + Base64.getEncoder().withoutPadding().encodeToString(hash);
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        try {
            String[] parts = encodedPassword.split("\\$");
            if (parts.length != 6) return false;
            String params = parts[3];
            byte[] salt = Base64.getDecoder().decode(parts[4]);
            byte[] expectedHash = Base64.getDecoder().decode(parts[5]);

            int m = parseParam(params, 'm');
            int t = parseParam(params, 't');
            int p = parseParam(params, 'p');

            byte[] actualHash = hash(rawPassword, salt, t, m, p);
            return java.util.Arrays.equals(expectedHash, actualHash);
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] hash(String password, byte[] salt) {
        return hash(password, salt, ITERATIONS, MEMORY, PARALLELISM);
    }

    private byte[] hash(String password, byte[] salt, int iterations, int memory, int parallelism) {
        Argon2Parameters params = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withSalt(salt)
                .withIterations(iterations)
                .withMemoryAsKB(memory)
                .withParallelism(parallelism)
                .build();
        Argon2BytesGenerator gen = new Argon2BytesGenerator();
        gen.init(params);
        byte[] output = new byte[HASH_LENGTH];
        gen.generateBytes(password.getBytes(StandardCharsets.UTF_8), output);
        return output;
    }

    private int parseParam(String params, char key) {
        for (String p : params.split(",")) {
            if (p.charAt(0) == key) {
                return Integer.parseInt(p.substring(2));
            }
        }
        throw new IllegalArgumentException("Missing param: " + key);
    }
}
