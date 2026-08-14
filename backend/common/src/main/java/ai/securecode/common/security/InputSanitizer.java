package ai.securecode.common.security;

import java.util.regex.Pattern;

/**
 * Utility for sanitizing user input to prevent XSS and injection attacks.
 * Strips HTML/XML tags and escapes dangerous characters.
 */
public final class InputSanitizer {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");
    private static final Pattern SCRIPT_TAG = Pattern.compile("(?i)<script[^>]*>.*?</script>", Pattern.DOTALL);
    private static final Pattern EVENT_HANDLER = Pattern.compile("(?i)on\\w+\\s*=");
    private static final Pattern JAVASCRIPT_PROTO = Pattern.compile("(?i)javascript:");
    private static final Pattern DATA_PROTO = Pattern.compile("(?i)data:text/html");

    private InputSanitizer() {}

    /**
     * Strip HTML tags and escape dangerous characters from a string.
     * Returns null if input is null.
     */
    public static String sanitize(String input) {
        if (input == null) return null;
        String result = input;
        result = SCRIPT_TAG.matcher(result).replaceAll("");
        result = HTML_TAG.matcher(result).replaceAll("");
        result = EVENT_HANDLER.matcher(result).replaceAll("");
        result = JAVASCRIPT_PROTO.matcher(result).replaceAll("");
        result = DATA_PROTO.matcher(result).replaceAll("");
        return result.trim();
    }

    /**
     * Escape HTML special characters for safe output.
     */
    public static String escapeHtml(String input) {
        if (input == null) return null;
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * Check if a string contains potential XSS payloads.
     */
    public static boolean containsXss(String input) {
        if (input == null || input.isBlank()) return false;
        return SCRIPT_TAG.matcher(input).find()
                || EVENT_HANDLER.matcher(input).find()
                || JAVASCRIPT_PROTO.matcher(input).find()
                || DATA_PROTO.matcher(input).find();
    }
}
