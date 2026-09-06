import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import db

router = APIRouter(prefix="/api/auth")


class Credentials(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


@router.post("/signup", status_code=201)
def signup(credentials: Credentials) -> dict[str, str]:
    password_hash = bcrypt.hashpw(credentials.password.encode(), bcrypt.gensalt()).decode()
    try:
        db.create_user(credentials.username, password_hash)
    except db.UsernameTakenError:
        raise HTTPException(status_code=409, detail="Username is already taken")
    return {"username": credentials.username}


@router.post("/login")
def login(credentials: Credentials) -> dict[str, str]:
    password_hash = db.get_password_hash(credentials.username)
    if password_hash is None or not bcrypt.checkpw(
        credentials.password.encode(), password_hash.encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"username": credentials.username}
