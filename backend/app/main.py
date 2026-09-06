from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.auth import router as auth_router
from app.chat import router as chat_router
from app.db import init_db

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "static"

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(chat_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
