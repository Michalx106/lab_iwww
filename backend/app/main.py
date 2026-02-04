from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_current_user_from_refresh_token,
)


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TaskCreate(BaseModel):
    title: str
    done: bool = False
    priority: str = "medium"
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None


class Task(BaseModel):
    id: int
    title: str
    done: bool
    priority: str
    lat: Optional[float]
    lng: Optional[float]
    address: Optional[str]


class TaskExecuteResponse(BaseModel):
    id: int
    done: bool


app = FastAPI(title="FastAPI JWT Demo")

origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


tasks_db: list[dict] = [
    {
        "id": 1,
        "title": "Przygotować backend API",
        "done": True,
        "priority": "high",
        "lat": 52.2297,
        "lng": 21.0122,
        "address": "Warszawa",
    },
    {
        "id": 2,
        "title": "Zaimplementować logowanie w Angularze",
        "done": False,
        "priority": "medium",
        "lat": 50.0647,
        "lng": 19.945,
        "address": "Kraków",
    },
    {
        "id": 3,
        "title": "Dodać interceptor JWT",
        "done": False,
        "priority": "high",
        "lat": None,
        "lng": None,
        "address": None,
    },
]


@app.post("/login")
def login(data: LoginRequest):
    user = authenticate_user(data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user["username"]})
    refresh_token = create_refresh_token({"sub": user["username"]})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@app.post("/renew")
def renew_token(data: RefreshRequest):
    user = get_current_user_from_refresh_token(data.refresh_token)
    new_access_token = create_access_token({"sub": user["username"]})
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


@app.get("/me")
def read_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
    }


@app.get("/tasks")
def get_tasks(current_user: dict = Depends(get_current_user)):
    return tasks_db


@app.post("/tasks")
def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    new_id = max([t["id"] for t in tasks_db], default=0) + 1
    task = {
        "id": new_id,
        "title": data.title,
        "done": data.done,
        "priority": data.priority,
        "lat": data.lat,
        "lng": data.lng,
        "address": data.address,
    }
    tasks_db.append(task)
    return task


@app.post("/tasks/{task_id}/execute", response_model=TaskExecuteResponse)
def execute_task(task_id: int, current_user: dict = Depends(get_current_user)):
    for task in tasks_db:
        if task["id"] == task_id:
            task["done"] = True
            return {"id": task_id, "done": True}
    raise HTTPException(status_code=404, detail="Task not found")
