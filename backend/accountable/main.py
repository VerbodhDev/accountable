import importlib.util
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from accountable.auth import router as auth_router
from accountable.crm.routes import router
from accountable.crm.rules import FieldError
from accountable.db import init_database, resolve_path, shared_mode


@asynccontextmanager
async def _lifespan(app: FastAPI):
    init_database(app.state.db_path)
    yield


def _allow_bucket_origin(app: FastAPI) -> None:
    if not shared_mode():
        return
    origin = os_origin()
    if not origin:
        return
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin],
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        allow_private_network=True,
    )


def _mark_private_network(app: FastAPI) -> None:
    # Outermost, so it stamps the CORS preflight. A public page calling 127.0.0.1
    # is blocked unless this header is on that response.
    @app.middleware("http")
    async def private_network(_request: Request, call_next):
        response = await call_next(_request)
        if shared_mode() and os_origin():
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response


def os_origin() -> str:
    import os

    return os.environ.get("FRONTEND_ORIGIN", "").strip()


def _load_search(app: FastAPI) -> None:
    if importlib.util.find_spec("accountable.crm.search") is None:
        return
    search = importlib.import_module("accountable.crm.search")
    app.include_router(search.router)


def create_app(db_path: Path | None = None) -> FastAPI:
    app = FastAPI(lifespan=_lifespan)
    app.state.db_path = db_path if db_path is not None else resolve_path()
    _allow_bucket_origin(app)
    _mark_private_network(app)
    app.include_router(auth_router)
    app.include_router(router)
    _load_search(app)

    @app.exception_handler(FieldError)
    def field_error(_request: Request, exc: FieldError):
        return JSONResponse(
            status_code=422,
            content={"detail": {"field": exc.field, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    def invalid_body(_request: Request, exc: RequestValidationError):
        loc = exc.errors()[0]["loc"] if exc.errors() else ("body",)
        field = str(loc[-1])
        return JSONResponse(
            status_code=422,
            content={"detail": {"field": field, "message": "Check this field"}},
        )

    return app


app = create_app()
