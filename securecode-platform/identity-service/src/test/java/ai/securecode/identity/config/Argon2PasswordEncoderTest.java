package ai.securecode.identity.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class Argon2PasswordEncoderTest {

    private final Argon2PasswordEncoder encoder = new Argon2PasswordEncoder();

    @Test
    void encode_returnsArgon2idHash() {
        String hash = encoder.encode("MyPassword123!");

        assertThat(hash).startsWith("$argon2id$");
        assertThat(hash).contains("v=19");
        assertThat(hash).contains("m=65536");
        assertThat(hash).contains("t=3");
        assertThat(hash).contains("p=1");
    }

    @Test
    void encode_producesDifferentHashesForSamePassword() {
        String hash1 = encoder.encode("SamePassword123!");
        String hash2 = encoder.encode("SamePassword123!");

        assertThat(hash1).isNotEqualTo(hash2);
    }

    @Test
    void matches_returnsTrueForCorrectPassword() {
        String hash = encoder.encode("CorrectPassword123!");

        assertThat(encoder.matches("CorrectPassword123!", hash)).isTrue();
    }

    @Test
    void matches_returnsFalseForWrongPassword() {
        String hash = encoder.encode("CorrectPassword123!");

        assertThat(encoder.matches("WrongPassword123!", hash)).isFalse();
    }

    @Test
    void matches_returnsFalseForNullPassword() {
        String hash = encoder.encode("SomePassword123!");

        assertThat(encoder.matches(null, hash)).isFalse();
    }

    @Test
    void matches_returnsFalseForMalformedHash() {
        assertThat(encoder.matches("SomePassword123!", "not-a-valid-hash")).isFalse();
        assertThat(encoder.matches("SomePassword123!", "$argon2id$v=19$m=65536")).isFalse();
    }

    @Test
    void matches_returnsFalseForEmptyHash() {
        assertThat(encoder.matches("SomePassword123!", "")).isFalse();
    }
}
