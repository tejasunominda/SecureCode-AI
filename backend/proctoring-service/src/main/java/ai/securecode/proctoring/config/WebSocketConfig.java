package ai.securecode.proctoring.config;

import ai.securecode.proctoring.websocket.ProctoringWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ProctoringWebSocketHandler proctoringHandler;

    public WebSocketConfig(ProctoringWebSocketHandler proctoringHandler) {
        this.proctoringHandler = proctoringHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(proctoringHandler, "/ws/proctoring")
                .setAllowedOrigins("*");
    }
}
