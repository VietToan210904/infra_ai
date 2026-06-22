"""FastAPI entrypoint for InfraAI SiteCompass."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.reviews import router as reviews_router
from app.api.v1.routes.site_analysis import router as site_analysis_router
from app.core.config import settings
from app.mcp_server import infraai_mcp


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with infraai_mcp.session_manager.run():
        yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="InfraAI SiteCompass API",
        version="0.1.0",
        description="Python backend for AI infrastructure readiness planning.",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Mcp-Session-Id"],
    )
    application.include_router(health_router)
    application.include_router(site_analysis_router)
    application.include_router(reviews_router)
    application.mount("/mcp", infraai_mcp.streamable_http_app())
    return application


app = create_app()
