package ai.securecode.identity;

import ai.securecode.identity.dto.*;
import ai.securecode.identity.entity.Role;
import ai.securecode.identity.repository.AppUserRepository;
import ai.securecode.identity.repository.OrganizationRepository;
import ai.securecode.identity.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrganizationRepository orgRepo;

    @Autowired
    private AppUserRepository userRepo;

    @Autowired
    private RoleRepository roleRepo;

    @MockBean
    private org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory redisConnectionFactory;

    @BeforeEach
    void seedRoles() {
        for (String code : new String[]{"SUPER_ADMIN", "HR", "TECHNICAL_MANAGER", "CANDIDATE"}) {
            if (roleRepo.findByCode(code) == null) {
                Role role = new Role();
                role.setCode(code);
                roleRepo.save(role);
            }
        }
    }

    @Test
    void register_createsOrgUserAndRole_returnsTokens() throws Exception {
        RegisterRequest req = new RegisterRequest(
                "test@example.com",
                "SecurePass123!",
                "Test Org",
                "ORG_ADMIN"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.userId").isNotEmpty())
                .andExpect(jsonPath("$.orgId").isNotEmpty())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("ORG_ADMIN"))
                .andReturn();

        // Verify org and user were persisted
        AuthResponse res = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(orgRepo.existsById(res.orgId())).isTrue();
        assertThat(userRepo.existsById(res.userId())).isTrue();
    }

    @Test
    void register_withInvalidRole_returns400() throws Exception {
        RegisterRequest req = new RegisterRequest(
                "badrole@example.com",
                "SecurePass123!",
                "Bad Role Org",
                "NONEXISTENT_ROLE"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("ROLE_NOT_FOUND"));
    }

    @Test
    void register_withBlankEmail_returns422() throws Exception {
        RegisterRequest req = new RegisterRequest(
                "",
                "SecurePass123!",
                "Test Org 2",
                "ORG_ADMIN"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void register_withShortPassword_returns422() throws Exception {
        RegisterRequest req = new RegisterRequest(
                "shortpw@example.com",
                "short",
                "Short Pw Org",
                "ORG_ADMIN"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void login_afterRegistration_returnsTokens() throws Exception {
        // First register
        RegisterRequest regReq = new RegisterRequest(
                "login@example.com",
                "MySecurePass123!",
                "Login Test Org",
                "CANDIDATE"
        );

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse regRes = objectMapper.readValue(
                regResult.getResponse().getContentAsString(), AuthResponse.class);

        // Then login
        LoginRequest loginReq = new LoginRequest(
                "login@example.com",
                "MySecurePass123!",
                null, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value("login@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("CANDIDATE"));
    }

    @Test
    void login_withWrongPassword_returns401() throws Exception {
        // Register first
        RegisterRequest regReq = new RegisterRequest(
                "wrongpw@example.com",
                "CorrectPass123!",
                "Wrong Pw Org",
                "FACULTY"
        );

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse regRes = objectMapper.readValue(
                regResult.getResponse().getContentAsString(), AuthResponse.class);

        // Login with wrong password
        LoginRequest loginReq = new LoginRequest(
                "wrongpw@example.com",
                "WrongPass123!",
                null, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void login_withNonExistentUser_returns401() throws Exception {
        LoginRequest loginReq = new LoginRequest(
                "nonexistent@example.com",
                "SomePass123!",
                null, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void refresh_withValidRefreshToken_returnsNewTokens() throws Exception {
        // Register to get tokens
        RegisterRequest regReq = new RegisterRequest(
                "refresh@example.com",
                "RefreshPass123!",
                "Refresh Test Org",
                "HR"
        );

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse regRes = objectMapper.readValue(
                regResult.getResponse().getContentAsString(), AuthResponse.class);

        // Use refresh token
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(regRes.refreshToken());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value("refresh@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("HR"));
    }

    @Test
    void refresh_withInvalidToken_returns401() throws Exception {
        RefreshTokenRequest refreshReq = new RefreshTokenRequest("invalid.token.here");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_TOKEN"));
    }

    @Test
    void refresh_withAccessTokenInsteadOfRefreshToken_returns401() throws Exception {
        // Register to get tokens
        RegisterRequest regReq = new RegisterRequest(
                "accesstoken@example.com",
                "AccessPass123!",
                "Access Token Org",
                "TECHNICAL_MANAGER"
        );

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse regRes = objectMapper.readValue(
                regResult.getResponse().getContentAsString(), AuthResponse.class);

        // Try to use access token as refresh token
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(regRes.accessToken());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_TOKEN"));
    }
}
