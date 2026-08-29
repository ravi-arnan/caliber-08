import os

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    mode: str


api_router = APIRouter(prefix="/api")


@api_router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        mode=os.environ.get("APP_MODE", "frontend_only"),
    )


app = FastAPI(
    title="Caliber 08 deployment health",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.include_router(api_router)