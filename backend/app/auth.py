import datetime
import uuid
import time
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, RevokedToken

security = HTTPBearer(auto_error=False)

# In-memory sliding window rate limiter for login failures
_login_failures: dict[str, list[float]] = {}

def check_login_rate_limit(key: str) -> None:
    """Enforce rate limits on failed authentication attempts."""
    now = time.time()
    window = 60.0  # 1 minute sliding window
    attempts = _login_failures.get(key, [])
    # Filter attempts within current window
    valid_attempts = [t for t in attempts if now - t < window]
    _login_failures[key] = valid_attempts

    if len(valid_attempts) >= settings.LOGIN_RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds before trying again.",
            headers={"Retry-After": "60"},
        )

def record_login_failure(key: str) -> None:
    """Record a failed login timestamp for rate limiting."""
    now = time.time()
    if key not in _login_failures:
        _login_failures[key] = []
    _login_failures[key].append(now)

def clear_login_failures(key: str) -> None:
    """Clear recorded failure timestamps upon successful authentication."""
    _login_failures.pop(key, None)

def validate_password_strength(password: str) -> None:
    """Validate password against baseline complexity rules."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters in length."
        )
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_letter and has_digit):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain both letters and numeric digits."
        )

def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt with 12 rounds."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: int, username: str, expires_delta: datetime.timedelta = None) -> str:
    """Create signed HS256 JWT access token with unique JTI claim."""
    now = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "username": username,
        "jti": uuid.uuid4().hex,
        "exp": expire,
        "iat": now,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str, db: Session = None) -> dict:
    """Decode and validate JWT access token, verifying expiration and checking revocation blocklist."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check revocation blocklist if database session is provided
    if db is not None:
        jti = payload.get("jti")
        if jti:
            revoked = db.query(RevokedToken).filter(RevokedToken.token_jti == jti).first()
            if revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been revoked or logged out. Please authenticate again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    return payload

def revoke_token(token: str, db: Session, user_id: int = None) -> None:
    """Revoke a token on the server so it cannot be used again."""
    try:
        # Decode without signature verification or expiration check to extract JTI and exp
        payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
        jti = payload.get("jti")
        exp_ts = payload.get("exp")
        if exp_ts:
            expires_at = datetime.datetime.fromtimestamp(exp_ts, tz=datetime.timezone.utc)
        else:
            expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)

        if jti:
            existing = db.query(RevokedToken).filter(RevokedToken.token_jti == jti).first()
            if not existing:
                revoked = RevokedToken(
                    token_jti=jti,
                    user_id=user_id,
                    expires_at=expires_at,
                )
                db.add(revoked)
                db.commit()
    except Exception:
        pass

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Mandatory authentication dependency.
    Extracts Bearer token, validates signature/expiration, checks token revocation, and returns authenticated User.
    NEVER trusts client-supplied user IDs.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token, db=db)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed user identity in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account does not exist or has been disabled.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
