import os
from pathlib import Path

from sqlalchemy import create_engine, event, func, select
from sqlalchemy.engine import Engine

from accountable.crm.tables import metadata, organizations

_engines: dict[Path, Engine] = {}


def resolve_path() -> Path:
    raw = os.environ.get("ACCOUNTABLE_DB")
    if raw:
        return Path(raw)
    return Path("data/accountable.db")


def get_engine(path: Path) -> Engine:
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


def init_database(path: Path) -> None:
    existed = path.exists()
    engine = get_engine(path)
    metadata.create_all(engine)
    if existed:
        return
    from accountable.crm.seed import insert_sample

    with engine.begin() as conn:
        insert_sample(conn)


def reset_database(path: Path) -> None:
    from accountable.crm.seed import insert_sample
    from accountable.crm.tables import activities, contacts, deals, organizations as orgs
    from accountable.crm.tables import stage_entries
    from sqlalchemy import delete

    engine = get_engine(path)
    metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(delete(stage_entries))
        conn.execute(delete(activities))
        conn.execute(delete(deals))
        conn.execute(delete(contacts))
        conn.execute(delete(orgs))
        insert_sample(conn)


def organization_count(path: Path) -> int:
    engine = get_engine(path)
    with engine.connect() as conn:
        return int(conn.execute(select(func.count()).select_from(organizations)).scalar_one())
