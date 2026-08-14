package ai.securecode.identity.controller;

import ai.securecode.identity.dto.*;
import ai.securecode.identity.service.OrgManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orgs")
public class OrgController {

    private final OrgManagementService orgService;

    public OrgController(OrgManagementService orgService) {
        this.orgService = orgService;
    }

    @PostMapping
    public ResponseEntity<OrgResponse> createOrg(@Valid @RequestBody CreateOrgRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orgService.createOrg(req));
    }

    @GetMapping("/{orgId}")
    public ResponseEntity<OrgResponse> getOrg(@PathVariable UUID orgId) {
        return ResponseEntity.ok(orgService.getOrg(orgId));
    }

    @PostMapping("/{orgId}/sub-orgs")
    public ResponseEntity<OrgResponse> createSubOrg(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateOrgRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orgService.createSubOrg(orgId, req));
    }

    @GetMapping("/{orgId}/sub-orgs")
    public ResponseEntity<List<OrgResponse>> listSubOrgs(@PathVariable UUID orgId) {
        return ResponseEntity.ok(orgService.listSubOrgs(orgId));
    }

    @GetMapping("/{orgId}/users")
    public ResponseEntity<List<UserResponse>> listUsers(@PathVariable UUID orgId) {
        return ResponseEntity.ok(orgService.listUsers(orgId));
    }

    @PostMapping("/{orgId}/users")
    public ResponseEntity<UserResponse> inviteUser(
            @PathVariable UUID orgId,
            @Valid @RequestBody InviteUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orgService.inviteUser(orgId, req));
    }

    @PatchMapping("/{orgId}/users/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID orgId,
            @PathVariable UUID userId,
            @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(orgService.updateUser(orgId, userId, req));
    }
}
