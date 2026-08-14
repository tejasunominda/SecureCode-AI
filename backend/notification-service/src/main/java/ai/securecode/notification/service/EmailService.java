package ai.securecode.notification.service;

import ai.securecode.notification.dto.SendEmailRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:localhost}")
    private String mailHost;

    @Value("${securecode.notification.from-email:noreply@securecode.ai}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(SendEmailRequest req) {
        try {
            if (req.html()) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(req.to());
                helper.setSubject(req.subject());
                helper.setText(req.body(), true);
                mailSender.send(mimeMessage);
            } else {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(req.to());
                message.setSubject(req.subject());
                message.setText(req.body());
                mailSender.send(message);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    public void sendAssessmentInvite(String toEmail, String candidateName, String assessmentLink, String orgName) {
        String subject = "You're invited to a coding assessment by " + orgName;
        String body = """
            Hi %s,

            You have been invited to complete a coding assessment by %s.

            Click the link below to begin:
            %s

            Good luck!
            — %s Team
            """.formatted(candidateName, orgName, assessmentLink, orgName);
        sendEmail(new SendEmailRequest(toEmail, subject, body, false));
    }

    public void sendResultNotification(String toEmail, String candidateName, String status, String orgName) {
        String subject = "Your assessment result — " + orgName;
        String body = """
            Hi %s,

            Your assessment with %s has been reviewed. Your status is now: %s.

            — %s Team
            """.formatted(candidateName, orgName, status, orgName);
        sendEmail(new SendEmailRequest(toEmail, subject, body, false));
    }
}
