from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings

ALGORITHM = "HS256"

def parse_expires_in(expires_str: str) -> int:
    if expires_str.endswith('d'):
        return int(expires_str[:-1]) * 86400
    elif expires_str.endswith('h'):
        return int(expires_str[:-1]) * 3600
    return int(expires_str)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        seconds = parse_expires_in(settings.JWT_EXPIRES_IN)
        expire = datetime.utcnow() + timedelta(seconds=seconds)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt
