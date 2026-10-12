"""
Cryptographic utility module for authenticated token encryption at rest.
Implements AES-128-CBC with HMAC-SHA256 authenticated encryption via Fernet.
"""

from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

_fernet_instance: Fernet | None = None

def get_fernet() -> Fernet:
    """Retrieve or initialize the singleton Fernet cipher instance."""
    global _fernet_instance
    if _fernet_instance is None:
        key = settings.OAUTH_TOKEN_ENCRYPTION_KEY
        if not key:
            raise ValueError("OAUTH_TOKEN_ENCRYPTION_KEY is not configured.")
        try:
            _fernet_instance = Fernet(key.encode("utf-8") if isinstance(key, str) else key)
        except Exception as e:
            raise ValueError(f"Invalid OAUTH_TOKEN_ENCRYPTION_KEY configuration: {e}")
    return _fernet_instance

def reset_fernet_instance() -> None:
    """Reset cached Fernet instance (useful in tests when switching keys)."""
    global _fernet_instance
    _fernet_instance = None

def encrypt_token(plaintext: str | None, key: str | None = None) -> str | None:
    """
    Encrypt plaintext token string using authenticated Fernet encryption.
    Returns URL-safe base64-encoded ciphertext string.
    """
    if not plaintext:
        return None
    cipher = Fernet(key.encode("utf-8") if isinstance(key, str) else key) if key else get_fernet()
    encrypted_bytes = cipher.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_token(ciphertext: str | None, key: str | None = None) -> str | None:
    """
    Decrypt Fernet ciphertext string to return original plaintext token.
    Raises ValueError or InvalidToken if ciphertext is malformed or invalid without exposing secrets.
    """
    if not ciphertext:
        return None
    cipher = Fernet(key.encode("utf-8") if isinstance(key, str) else key) if key else get_fernet()
    try:
        decrypted_bytes = cipher.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        raise
    except Exception as e:
        raise ValueError(f"Decryption failed: Unexpected cipher format ({e}).")
