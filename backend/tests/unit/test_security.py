import pytest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_and_verification():
    raw_password = "SecureEnterprisePassword2026!"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_access_and_refresh_token_generation():
    payload = {"sub": "user_12345", "role": "sales_ops_manager"}
    
    # Access Token
    access_token = create_access_token(payload)
    decoded_access = decode_token(access_token)
    assert decoded_access["sub"] == "user_12345"
    assert decoded_access["role"] == "sales_ops_manager"
    assert decoded_access["type"] == "access"
    assert "exp" in decoded_access

    # Refresh Token
    refresh_token = create_refresh_token(payload)
    decoded_refresh = decode_token(refresh_token)
    assert decoded_refresh["sub"] == "user_12345"
    assert decoded_refresh["type"] == "refresh"
