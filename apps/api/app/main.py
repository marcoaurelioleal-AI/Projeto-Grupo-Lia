from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings, validate_production_settings
from .database import Base, SessionLocal, engine
from .routers import (
    admin,
    ai,
    audit,
    auth,
    checklists,
    evidences,
    incidents,
    inventory,
    leadership,
    manuals,
    observability,
    reports,
    transfers,
    waste,
)
from .schemas import HealthResponse
from .seed import seed_database
from .services.observability_service import request_observability_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_production_settings()
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.middleware("http")(request_observability_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name)


app.include_router(auth.router, prefix="/api")
app.include_router(manuals.router, prefix="/api")
app.include_router(checklists.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(transfers.router, prefix="/api")
app.include_router(waste.router, prefix="/api")
app.include_router(leadership.router, prefix="/api")
app.include_router(evidences.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(observability.router, prefix="/api")

STATIC_DIR = Path(__file__).resolve().parents[3] / "apps" / "web" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    logos_dir = STATIC_DIR / "logos"
    if logos_dir.exists():
        app.mount("/logos", StaticFiles(directory=logos_dir), name="logos")

    @app.get("/manifest.webmanifest", include_in_schema=False)
    def pwa_manifest() -> FileResponse:
        return FileResponse(STATIC_DIR / "manifest.webmanifest", media_type="application/manifest+json")

    @app.get("/sw.js", include_in_schema=False)
    def service_worker() -> FileResponse:
        return FileResponse(STATIC_DIR / "sw.js", media_type="application/javascript")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str = "") -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Endpoint de API não encontrado.")
        return FileResponse(STATIC_DIR / "index.html")
