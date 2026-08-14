package ai.securecode.identity.service;

import ai.securecode.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern LOWER = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]");

    public void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                    "Password must be at least " + MIN_LENGTH + " characters long", "password");
        }
        if (!UPPER.matcher(password).find()) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                    "Password must contain at least one uppercase letter", "password");
        }
        if (!LOWER.matcher(password).find()) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                    "Password must contain at least one lowercase letter", "password");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                    "Password must contain at least one digit", "password");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                    "Password must contain at least one special character", "password");
        }
    }
}
