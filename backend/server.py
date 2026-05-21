from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from backend.calendar_logic import (
    analyze_year,
    analyze_date,
    challenge_to_dict,
    generate_challenges,
    generate_year_challenges,
    parse_iso_date,
    parse_year,
    today_seed,
    validate_weekday,
    weekday_for,
    year_challenge_to_dict,
)
from backend.lessons import LESSON
from backend.storage import Store


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
DATA = ROOT / "data"
STORE = Store(DATA / "progress.sqlite3")


class ApiError(Exception):
    def __init__(self, status: HTTPStatus, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class Handler(BaseHTTPRequestHandler):
    server_version = "CalendarioMental/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("GET", parsed.path, parse_qs(parsed.query))
            return
        self._serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api("POST", parsed.path, parse_qs(parsed.query))
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Ruta no encontrada."})

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")

    def _handle_api(self, method: str, path: str, query: dict[str, list[str]]) -> None:
        try:
            if method == "GET" and path == "/api/health":
                self._send_json(HTTPStatus.OK, {"ok": True, "name": "calendario-mental"})
                return

            if method == "GET" and path == "/api/lesson":
                self._send_json(HTTPStatus.OK, LESSON)
                return

            if method == "GET" and path == "/api/progress":
                self._send_json(HTTPStatus.OK, STORE.progress())
                return

            if method == "GET" and path == "/api/practice/challenge":
                count = int(self._first(query, "count", "1"))
                level = self._first(query, "level", "base")
                seed = self._first(query, "seed", "")
                seed_value = int(seed) if seed else today_seed([level, str(count)])
                challenges = generate_challenges(count=count, level=level, seed=seed_value)
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "level": level,
                        "challenges": [challenge_to_dict(item) for item in challenges],
                    },
                )
                return

            if method == "GET" and path == "/api/year/challenge":
                count = int(self._first(query, "count", "1"))
                level = self._first(query, "level", "base")
                seed = self._first(query, "seed", "")
                seed_value = int(seed) if seed else today_seed(["year", level, str(count)])
                challenges = generate_year_challenges(count=count, level=level, seed=seed_value)
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "level": level,
                        "challenges": [year_challenge_to_dict(item) for item in challenges],
                    },
                )
                return

            if method == "GET" and path == "/api/date/analyze":
                iso_date = self._first(query, "date", "")
                if not iso_date:
                    raise ApiError(HTTPStatus.BAD_REQUEST, "Falta date.")
                self._send_json(HTTPStatus.OK, analyze_date(parse_iso_date(iso_date)))
                return

            if method == "GET" and path == "/api/year/analyze":
                year = self._first(query, "year", "")
                if not year:
                    raise ApiError(HTTPStatus.BAD_REQUEST, "Falta year.")
                self._send_json(HTTPStatus.OK, analyze_year(parse_year(year)))
                return

            if method == "POST" and path == "/api/practice/attempt":
                body = self._read_body()
                target = parse_iso_date(str(body.get("date", "")))
                answer = validate_weekday(str(body.get("answer", "")))
                level = str(body.get("level", "base") or "base")
                elapsed_ms = int(body.get("elapsedMs", 0) or 0)
                correct_answer = weekday_for(target)
                correct = answer == correct_answer
                attempt = STORE.record_attempt(
                    target.isoformat(),
                    answer,
                    correct_answer,
                    correct,
                    elapsed_ms,
                    level,
                )
                analysis = analyze_date(target)
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "attempt": attempt,
                        "correct": correct,
                        "correctWeekday": correct_answer,
                        "analysis": analysis,
                        "progress": STORE.progress(),
                    },
                )
                return

            if method == "POST" and path == "/api/year/attempt":
                body = self._read_body()
                year = parse_year(body.get("year", ""))
                answer = validate_weekday(str(body.get("answer", "")))
                level = str(body.get("level", "base") or "base")
                elapsed_ms = int(body.get("elapsedMs", 0) or 0)
                analysis = analyze_year(year)
                correct_answer = analysis["anchorWeekday"]
                correct = answer == correct_answer
                attempt = STORE.record_attempt(
                    str(year),
                    answer,
                    correct_answer,
                    correct,
                    elapsed_ms,
                    f"year:{level}",
                )
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "attempt": attempt,
                        "correct": correct,
                        "correctWeekday": correct_answer,
                        "analysis": analysis,
                        "progress": STORE.progress(),
                    },
                )
                return

            if method == "POST" and path == "/api/progress/study":
                body = self._read_body()
                event = STORE.record_study(
                    lesson_key=str(body.get("lessonKey", "session")),
                    minutes=int(body.get("minutes", 0) or 0),
                    completed=bool(body.get("completed", False)),
                )
                self._send_json(HTTPStatus.OK, {"event": event, "progress": STORE.progress()})
                return

            raise ApiError(HTTPStatus.NOT_FOUND, "Ruta no encontrada.")
        except ApiError as exc:
            self._send_json(exc.status, {"error": exc.message})
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except Exception as exc:
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    @staticmethod
    def _first(query: dict[str, list[str]], key: str, default: str) -> str:
        values = query.get(key)
        return values[0] if values else default

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, request_path: str) -> None:
        if request_path in {"", "/"}:
            request_path = "/index.html"

        candidate = (FRONTEND / request_path.lstrip("/")).resolve()
        try:
            candidate.relative_to(FRONTEND.resolve())
        except ValueError:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Acceso bloqueado."})
            return

        if not candidate.exists() or not candidate.is_file():
            candidate = FRONTEND / "index.html"

        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        data = candidate.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)


def run(host: str = "127.0.0.1", port: int = 8765) -> None:
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Calendario Mental en http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
