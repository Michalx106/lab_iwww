from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
	return pwd_context.hash(password)

users_db = {
	"admin": {
		"username": "admin",
		"hashed_password": hash_password("admin123"),
		"role": "admin",
	},
	"user": {
		"username": "user",
		"hashed_password": hash_password("user123"),
		"role": "user",
	},
}
