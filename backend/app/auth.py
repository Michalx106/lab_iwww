from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.users import users_db

SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_SECRET_KEY = "super-refresh-key"
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def now():
	return datetime.now(timezone.utc)

def verify_password(plain_password, hashed_password):
	return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(username: str, password: str):
	user = users_db.get(username)
	if not user:
		return None
	if not verify_password(password, user["hashed_password"]):
		return None
	return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
	to_encode = data.copy()
	expire = now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
	to_encode.update({"exp": expire, "type": "access"})
	return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict):
	to_encode = data.copy()
	expire = now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
	to_encode.update({"exp": expire, "type": "refresh"})
	return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
	except JWTError:
		raise HTTPException(status_code=401)

	if payload.get("type") != "access":
		raise HTTPException(status_code=401)

	username: str = payload.get("sub")
	if username is None:
		raise HTTPException(status_code=401)

	user = users_db.get(username)
	if user is None:
		raise HTTPException(status_code=401)

	return user

def get_current_user_from_refresh_token(token: str):
	try:
		payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
	except JWTError:
		raise HTTPException(status_code=401)

	if payload.get("type") != "refresh":
		raise HTTPException(status_code=401)

	username: str = payload.get("sub")
	if username is None:
		raise HTTPException(status_code=401)

	user = users_db.get(username)
	if user is None:
		raise HTTPException(status_code=401)

	return user
