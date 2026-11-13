from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from accountable.crm.routes import router
from accountable.crm.rules import FieldError
from accountable.db import init_database, resolve_path


@asynccontextmanager
async def _lifespan(app: FastAPI):
    init_database(app.state.db_path)
    yield


def create_app(db_path: Path | None = None) -> FastAPI:
    app = FastAPI(lifespan=_lifespan)
    app.state.db_path = db_path if db_path is not None else resolve_path()
    app.include_router(router)

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
