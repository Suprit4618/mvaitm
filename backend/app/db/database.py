"""
SQLite Database Connection and Schema Management
================================================
Provides thread-safe connections, WAL mode initialization, and indexed schema.
"""

import sqlite3
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Generator

logger = logging.getLogger("windsight.db")

SCHEMA_SQL = """
-- Actual generation outturn by settlement period (FUELHH)
CREATE TABLE IF NOT EXISTS actual_generation (
    settlement_date TEXT NOT NULL,
    settlement_period INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    publish_time TEXT NOT NULL,
    fuel_type TEXT NOT NULL DEFAULT 'WIND',
    generation_mw INTEGER NOT NULL,
    PRIMARY KEY (settlement_date, settlement_period)
);

CREATE INDEX IF NOT EXISTS idx_actuals_start_time ON actual_generation(start_time);
CREATE INDEX IF NOT EXISTS idx_actuals_date ON actual_generation(settlement_date);

-- Wind generation forecast publications (WINDFOR)
CREATE TABLE IF NOT EXISTS forecast_generation (
    publish_time TEXT NOT NULL,
    start_time TEXT NOT NULL,
    generation_mw INTEGER NOT NULL,
    dataset TEXT NOT NULL DEFAULT 'WINDFOR',
    PRIMARY KEY (publish_time, start_time)
);

-- Covering index for high-performance point-in-time lookup
CREATE INDEX IF NOT EXISTS idx_forecast_lookup 
ON forecast_generation(start_time, publish_time DESC);

-- Metadata tracking for auditable ingestion
CREATE TABLE IF NOT EXISTS ingestion_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    records_ingested INTEGER NOT NULL,
    ingested_at TEXT NOT NULL,
    source TEXT NOT NULL
);
"""

class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_dir()
        self.init_schema()

    def _ensure_dir(self):
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(
            self.db_path,
            timeout=30.0,
            check_same_thread=False
        )
        conn.row_factory = sqlite3.Row
        # Performance & concurrency pragmas
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    @contextmanager
    def session(self) -> Generator[sqlite3.Connection, None, None]:
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self):
        with self.session() as conn:
            conn.executescript(SCHEMA_SQL)
        logger.info(f"Database schema initialized at {self.db_path}")

# Default database instance will be initialized based on config
db_instance: Database = None

def get_db(db_path: str = None) -> Database:
    global db_instance
    if db_path is not None:
        return Database(db_path)
    if db_instance is None:
        from backend.app.config import settings
        db_instance = Database(settings.database_path)
    return db_instance
