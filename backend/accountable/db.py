import os
from pathlib import Path

from sqlalchemy import create_engine, event, func, inspect, select, text
from sqlalchemy.engine import Engine

from accountable.crm.tables import activities, contacts, deals, metadata, organizations

_engines: dict[Path, Engine] = {}
_shared_engine: Engine | None = None
_RECORD_TABLES = (organizations, contacts, deals, activities)


def shared_mode() -> bool:
    return os.environ.get("ACCOUNTABLE_SHARED") == "1"


def postgres_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://") :]
    if raw.startswith("postgresql://"):
        raw = "postgresql+psycopg://" + raw[len("postgresql://") :]
    return raw


def rls_statements() -> list[str]:
    # No policy is added. The publishable key cannot read or write through one.
    return [f'ALTER TABLE "{name}" ENABLE ROW LEVEL SECURITY' for name in metadata.tables]


def resolve_path() -> Path:
    raw = os.environ.get("ACCOUNTABLE_DB")
    if raw:
        return Path(raw)
    return Path("data/accountable.db")


def get_engine(path: Path) -> Engine:
    if shared_mode():
        return _postgres_engine()
    key = path.resolve()
    engine = _engines.get(key)
    if engine is not None:
        return engine
    key.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{key}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        # SQLite leaves foreign keys off until this runs on the connection.
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    _engines[key] = engine
    return engine


def _postgres_engine() -> Engine:
    global _shared_engine
    if _shared_engine is not None:
        return _shared_engine
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        raise RuntimeError("DATABASE_URL is required when ACCOUNTABLE_SHARED=1")
    # The driver stays unimported until this line. Tests that stay on SQLite never load it.
    _shared_engine = create_engine(postgres_url(raw), pool_pre_ping=True)
    return _shared_engine


def init_database(path: Path) -> None:
    if shared_mode():
        engine = get_engine(path)
        fresh = not inspect(engine).has_table("organizations")
        _prepare(engine, fresh)
        return
    existed = path.exists()
    engine = get_engine(path)
    _prepare(engine, fresh=not existed)
    if existed:
        _ensure_local_people(engine)


def _prepare(engine: Engine, fresh: bool) -> None:
    metadata.create_all(engine)
    _add_person_columns(engine)
    _enable_rls(engine)
    if not fresh:
        return
    from accountable.crm.seed import insert_sample

    with engine.begin() as conn:
        insert_sample(conn)


def _ensure_local_people(engine: Engine) -> None:
    from accountable.crm.seed import ensure_local_people

    with engine.begin() as conn:
        ensure_local_people(conn)


def _add_person_columns(engine: Engine) -> None:
    known = inspect(engine)
    with engine.begin() as conn:
        for table in _RECORD_TABLES:
            if not known.has_table(table.name):
                continue
            have = {column["name"] for column in known.get_columns(table.name)}
            for name in ("added_by", "updated_by"):
                if name in have:
                    continue
                conn.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {name} VARCHAR"))


def _enable_rls(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conn:
        for statement in rls_statements():
            conn.execute(text(statement))


def reset_database(path: Path) -> None:
    from sqlalchemy import delete

    from accountable.crm.seed import insert_sample
    from accountable.crm.tables import organizations as orgs
    from accountable.crm.tables import people, stage_entries

    engine = get_engine(path)
    metadata.create_all(engine)
    _add_person_columns(engine)
    _enable_rls(engine)
    with engine.begin() as conn:
        conn.execute(delete(stage_entries))
        conn.execute(delete(activities))
        conn.execute(delete(deals))
        conn.execute(delete(contacts))
        conn.execute(delete(orgs))
        conn.execute(delete(people))
        insert_sample(conn)


def organization_count(path: Path) -> int:
    engine = get_engine(path)
    with engine.connect() as conn:
        return int(conn.execute(select(func.count()).select_from(organizations)).scalar_one())
