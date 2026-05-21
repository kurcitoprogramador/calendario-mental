from __future__ import annotations

import calendar
import random
from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable


WEEKDAYS = [
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
]

MONTHS = [
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]

DOOMSDAY_MONTHS = {
    3: 14,
    4: 4,
    5: 9,
    6: 6,
    7: 11,
    8: 8,
    9: 5,
    10: 10,
    11: 7,
    12: 12,
}


@dataclass(frozen=True)
class Challenge:
    iso_date: str
    label: str
    level: str
    correct_weekday: str
    options: list[str]
    anchor_date: str
    anchor_weekday: str
    delta_days: int
    delta_mod: int
    explanation: list[str]


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Fecha invalida. Usa YYYY-MM-DD.") from exc


def is_leap_year(year: int) -> bool:
    return calendar.isleap(year)


def weekday_name(index: int) -> str:
    return WEEKDAYS[index % 7]


def weekday_for(value: date) -> str:
    return weekday_name(value.weekday())


def doomsday_day_for_month(year: int, month: int) -> int:
    if month == 1:
        return 4 if is_leap_year(year) else 3
    if month == 2:
        return 29 if is_leap_year(year) else 28
    return DOOMSDAY_MONTHS[month]


def doomsday_for_year(year: int) -> int:
    return date(year, 3, 14).weekday()


def date_label(value: date) -> str:
    return f"{value.day} {MONTHS[value.month]} {value.year}"


def analyze_date(value: date) -> dict:
    anchor_day = doomsday_day_for_month(value.year, value.month)
    anchor = date(value.year, value.month, anchor_day)
    anchor_weekday_index = doomsday_for_year(value.year)
    delta_days = (value - anchor).days
    delta_mod = delta_days % 7
    calculated_index = (anchor_weekday_index + delta_mod) % 7
    correct_index = value.weekday()

    return {
        "isoDate": value.isoformat(),
        "label": date_label(value),
        "weekday": weekday_name(correct_index),
        "weekdayIndex": correct_index,
        "anchorDate": anchor.isoformat(),
        "anchorLabel": date_label(anchor),
        "anchorWeekday": weekday_name(anchor_weekday_index),
        "deltaDays": delta_days,
        "deltaMod": delta_mod,
        "leapYear": is_leap_year(value.year),
        "calculatedWeekday": weekday_name(calculated_index),
        "steps": [
            f"Ancla del ano: {weekday_name(anchor_weekday_index)}",
            f"Ancla del mes: {anchor.day} {MONTHS[anchor.month]}",
            f"Diferencia: {delta_days} dias",
            f"Modulo 7: {delta_mod}",
        ],
    }


def _range_for_level(level: str) -> tuple[int, int]:
    levels = {
        "base": (2024, 2029),
        "medio": (2000, 2040),
        "duro": (1900, 2099),
    }
    return levels.get(level, levels["base"])


def _weekday_options(correct: str, rng: random.Random) -> list[str]:
    options = {correct}
    while len(options) < 4:
        options.add(rng.choice(WEEKDAYS))
    shuffled = list(options)
    rng.shuffle(shuffled)
    return shuffled


def generate_challenges(count: int = 1, level: str = "base", seed: int | None = None) -> list[Challenge]:
    rng = random.Random(seed)
    start_year, end_year = _range_for_level(level)
    count = max(1, min(int(count or 1), 20))
    challenges: list[Challenge] = []

    for _ in range(count):
        year = rng.randint(start_year, end_year)
        month = rng.randint(1, 12)
        day = rng.randint(1, calendar.monthrange(year, month)[1])
        target = date(year, month, day)
        analysis = analyze_date(target)
        correct = analysis["weekday"]

        challenges.append(
            Challenge(
                iso_date=target.isoformat(),
                label=date_label(target),
                level=level,
                correct_weekday=correct,
                options=_weekday_options(correct, rng),
                anchor_date=analysis["anchorDate"],
                anchor_weekday=analysis["anchorWeekday"],
                delta_days=analysis["deltaDays"],
                delta_mod=analysis["deltaMod"],
                explanation=analysis["steps"],
            )
        )

    return challenges


def challenge_to_dict(challenge: Challenge, reveal: bool = False) -> dict:
    payload = {
        "date": challenge.iso_date,
        "label": challenge.label,
        "level": challenge.level,
        "options": challenge.options,
    }
    if reveal:
        payload.update(
            {
                "correctWeekday": challenge.correct_weekday,
                "anchorDate": challenge.anchor_date,
                "anchorWeekday": challenge.anchor_weekday,
                "deltaDays": challenge.delta_days,
                "deltaMod": challenge.delta_mod,
                "explanation": challenge.explanation,
            }
        )
    return payload


def validate_weekday(answer: str) -> str:
    normalized = (answer or "").strip().lower()
    aliases = {
        "miercoles": "miercoles",
        "miércoles": "miercoles",
        "sabado": "sabado",
        "sábado": "sabado",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in WEEKDAYS:
        raise ValueError("Dia invalido.")
    return normalized


def today_seed(parts: Iterable[str] = ()) -> int:
    token = "|".join([datetime.now().strftime("%Y-%m-%d"), *parts])
    return sum((index + 1) * ord(char) for index, char in enumerate(token))
