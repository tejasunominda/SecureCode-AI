package ai.securecode.identity.client;

public record NotificationEmailRequest(
        String to,
        String subject,
        String body,
        boolean html
) {}
