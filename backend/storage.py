from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    iso_date TEXT NOT NULL,
    answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL DEFAULT 0,
    level TEXT NOT NULL DEFAULT 'base',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_key TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_level ON attempts(level);
CREATE INDEX IF NOT EXISTS idx_study_created_at ON study_events(created_at);
"""


class Store:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def init(self) -> None:
        with closing(self.connect()) as connection:
            connection.executescript(SCHEMA)
            connection.commit()

    def record_attempt(
        self,
        iso_date: str,
        answer: str,
        correct_answer: str,
        is_correct: bool,
        elapsed_ms: int,
        level: str,
    ) -> dict[str, Any]:
        created_at = datetime.now().isoformat(timespec="seconds")
        with closing(self.connect()) as connection:
            cursor = connection.execute(
                """
                INSERT INTO attempts
                    (iso_date, answer, correct_answer, is_correct, elapsed_ms, level, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    iso_date,
                    answer,
                    correct_answer,
                    1 if is_correct else 0,
                    max(0, int(elapsed_ms or 0)),
                    level,
                    created_at,
                ),
            )
            connection.commit()
            return {
                "id": cursor.lastrowid,
                "isoDate": iso_date,
                "answer": answer,
                "correctAnswer": correct_answer,
                "correct": is_correct,
                "elapsedMs": max(0, int(elapsed_ms or 0)),
                "level": level,
                "createdAt": created_at,
            }

    def record_study(self, lesson_key: str, minutes: int = 0, completed: bool = False) -> dict[str, Any]:
        created_at = datetime.now().isoformat(timespec="seconds")
        with closing(self.connect()) as connection:
            cursor = connection.execute(
                """
                INSERT INTO study_events (lesson_key, minutes, completed, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (lesson_key, max(0, int(minutes or 0)), 1 if completed else 0, created_at),
            )
            connection.commit()
            return {
                "id": cursor.lastrowid,
                "lessonKey": lesson_key,
                "minutes": max(0, int(minutes or 0)),
                "completed": completed,
                "createdAt": created_at,
            }

    def reset_progress(self) -> dict[str, Any]:
        with closing(self.connect()) as connection:
            connection.execute("DELETE FROM attempts")
            connection.execute("DELETE FROM study_events")
            connection.commit()
        return self.progress()

    def progress(self) -> dict[str, Any]:
        with closing(self.connect()) as connection:
            totals = connection.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COALESCE(SUM(is_correct), 0) AS correct,
                    COALESCE(MIN(CASE WHEN is_correct = 1 THEN elapsed_ms END), 0) AS best_ms,
                    COALESCE(AVG(CASE WHEN is_correct = 1 THEN elapsed_ms END), 0) AS avg_correct_ms
                FROM attempts
                """
            ).fetchone()

            recent_rows = connection.execute(
                """
                SELECT iso_date, answer, correct_answer, is_correct, elapsed_ms, level, created_at
                FROM attempts
                ORDER BY id DESC
                LIMIT 12
                """
            ).fetchall()

            study = connection.execute(
                """
                SELECT
                    COUNT(*) AS sessions,
                    COALESCE(SUM(minutes), 0) AS minutes,
                    COALESCE(SUM(completed), 0) AS completed
                FROM study_events
                """
            ).fetchone()

            by_day = connection.execute(
                """
                SELECT substr(created_at, 1, 10) AS day
                FROM attempts
                GROUP BY day
                ORDER BY day DESC
                """
            ).fetchall()

            by_level = connection.execute(
                """
                SELECT level, COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct
                FROM attempts
                GROUP BY level
                ORDER BY level
                """
            ).fetchall()

        total = int(totals["total"])
        correct = int(totals["correct"])
        accuracy = round((correct / total) * 100) if total else 0

        return {
            "attempts": total,
            "correct": correct,
            "accuracy": accuracy,
            "bestMs": int(totals["best_ms"] or 0),
            "avgCorrectMs": int(totals["avg_correct_ms"] or 0),
            "streak": self._streak([row["day"] for row in by_day]),
            "studySessions": int(study["sessions"] or 0),
            "studyMinutes": int(study["minutes"] or 0),
            "studyCompleted": int(study["completed"] or 0),
            "levels": [
                {
                    "level": row["level"],
                    "attempts": int(row["total"]),
                    "accuracy": round((int(row["correct"]) / int(row["total"])) * 100)
                    if int(row["total"])
                    else 0,
                }
                for row in by_level
            ],
            "recent": [
                {
                    "date": row["iso_date"],
                    "answer": row["answer"],
                    "correctAnswer": row["correct_answer"],
                    "correct": bool(row["is_correct"]),
                    "elapsedMs": int(row["elapsed_ms"]),
                    "level": row["level"],
                    "createdAt": row["created_at"],
                }
                for row in recent_rows
            ],
        }

    @staticmethod
    def _streak(days: list[str]) -> int:
        if not days:
            return 0

        unique_days = {date.fromisoformat(day) for day in days}
        cursor = date.today()
        if cursor not in unique_days:
            cursor = cursor - timedelta(days=1)

        streak = 0
        while cursor in unique_days:
            streak += 1
            cursor = cursor - timedelta(days=1)
        return streak
