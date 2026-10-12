import pytest
from cryptography.fernet import Fernet, InvalidToken
from app.crypto import encrypt_token, decrypt_token, get_fernet
from app.models import OAuthConnection
from app.config import Settings

def test_fernet_key_generation_and_roundtrip():
    # Generate a fresh valid 32-byte url-safe base64 key
    key = Fernet.generate_key().decode()
    secret_text = "ya29.a0AfH6SMD-staff-oauth-access-token-123456"

    ciphertext = encrypt_token(secret_text, key)
    assert ciphertext is not None
    assert ciphertext != secret_text
    assert not ciphertext.startswith("ya29.")

    decrypted = decrypt_token(ciphertext, key)
    assert decrypted == secret_text

def test_decrypt_invalid_ciphertext():
    key = Fernet.generate_key().decode()
    # Malformed ciphertext should raise InvalidToken
    with pytest.raises(InvalidToken):
        decrypt_token("not-a-valid-fernet-token", key)

def test_decrypt_with_wrong_key():
    key1 = Fernet.generate_key().decode()
    key2 = Fernet.generate_key().decode()
    secret_text = "refresh-token-xyz-secret"

    ciphertext = encrypt_token(secret_text, key1)
    with pytest.raises(InvalidToken):
        decrypt_token(ciphertext, key2)

def test_empty_or_none_token():
    key = Fernet.generate_key().decode()
    assert encrypt_token("", key) is None
    assert encrypt_token(None, key) is None
    assert decrypt_token("", key) is None
    assert decrypt_token(None, key) is None

def test_oauth_model_encrypted_storage():
    key = Fernet.generate_key().decode()
    conn = OAuthConnection(user_id=1, provider="google")

    raw_access = "access-token-alpha-99"
    raw_refresh = "refresh-token-omega-88"

    conn.set_tokens(raw_access, raw_refresh, key=key)

    # Database columns must NOT store raw plaintext
    assert conn.access_token != raw_access
    assert conn.refresh_token != raw_refresh

    # Decryption helper returns original tokens
    dec_access, dec_refresh = conn.get_decrypted_tokens(key=key)
    assert dec_access == raw_access
    assert dec_refresh == raw_refresh

def test_production_fails_without_encryption_key():
    from pydantic import ValidationError
    # In production, missing or invalid encryption key must raise ValidationError
    with pytest.raises(ValidationError, match="OAUTH_TOKEN_ENCRYPTION_KEY"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a" * 32,
            OAUTH_TOKEN_ENCRYPTION_KEY="",
        )

def test_oauth_api_does_not_leak_tokens(client, auth_headers_user1):
    # Connect preview with simulated tokens
    res = client.post("/api/oauth/google/connect-preview", headers=auth_headers_user1)
    assert res.status_code == 200

    # Query status
    status_res = client.get("/api/oauth/google/status", headers=auth_headers_user1)
    assert status_res.status_code == 200
    data = status_res.json()

    assert data["is_connected"] is True
    # Ensure neither tokens nor ciphertexts are returned in public API response
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert "encrypted_access_token" not in data
    assert "encrypted_refresh_token" not in data
