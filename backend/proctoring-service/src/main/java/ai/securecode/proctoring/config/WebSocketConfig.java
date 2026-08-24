package ai.securecode.proctoring.config;

import ai.securecode.proctoring.websocket.ProctoringWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ProctoringWebSocketHandler proctoringHandler;

    // SECURITY: a wildcard origin on a WebSocket carrying live proctoring
    // feeds (webcam thumbnails, risk scores) allows any third-party page to
    // open a connection cross-origin. Restrict to the configured web-app origins.
    @Value("${securecode.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public WebSocketConfig(ProctoringWebSocketHandler proctoringHandler) {
        this.proctoringHandler = proctoringHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(proctoringHandler, "/ws/proctoring")
                .setAllowedOrigins(allowedOrigins.split(","));
    }
}
