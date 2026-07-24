from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories import users as repository


def create_user(db: Session, email: str):
    if repository.get_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    return repository.create_user(db, email)
