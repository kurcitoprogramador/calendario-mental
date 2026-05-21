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


@dataclass(frozen=True)
class YearChallenge:
    year: int
    level: str
    correct_weekday: str
    options: list[str]
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


def parse_year(value: str | int) -> int:
    try:
        year = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Ano invalido.") from exc

    if year < 1600 or year > 9999:
        raise ValueError("Usa un ano entre 1600 y 9999.")
    return year


def date_label(value: date) -> str:
    return f"{value.day} {MONTHS[value.month]} {value.year}"


def analyze_year(year: int) -> dict:
    year = parse_year(year)
    century = year - (year % 100)
    year_part = year % 100
    leap_count = year_part // 4
    jump = year_part + leap_count
    jump_mod = jump % 7
    century_anchor_index = doomsday_for_year(century)
    anchor_index = (century_anchor_index + jump_mod) % 7
    exact_index = doomsday_for_year(year)

    return {
        "year": year,
        "label": str(year),
        "anchorWeekday": weekday_name(exact_index),
        "anchorIndex": exact_index,
        "century": century,
        "centuryAnchor": weekday_name(century_anchor_index),
        "yearPart": year_part,
        "leapCount": leap_count,
        "jump": jump,
        "jumpMod": jump_mod,
        "leapYear": is_leap_year(year),
        "calculatedWeekday": weekday_name(anchor_index),
        "steps": [
            f"Siglo {century}: {weekday_name(century_anchor_index)}",
            f"Final del ano: {year_part}",
            f"Bisiestos: {year_part} // 4 = {leap_count}",
            f"Salto: {year_part} + {leap_count} = {jump}",
            f"Modulo 7: {jump_mod}",
            f"Ancla: {weekday_name(anchor_index)}",
        ],
    }


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


def _year_range_for_level(level: str) -> tuple[int, int]:
    levels = {
        "base": (2024, 2035),
        "medio": (2000, 2099),
        "duro": (1600, 2399),
    }
    return levels.get(level, levels["base"])


def _weekday_options(correct: str, rng: random.Random) -> list[str]:
    options = {correct}
    while len(options) < 4:
        options.add(rng.choice(WEEKDAYS))
    shuffled = list(options)
    rng.shuffle(shuffled)
    return shuffled


def _all_weekday_options(rng: random.Random) -> list[str]:
    shuffled = list(WEEKDAYS)
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


def generate_year_challenges(
    count: int = 1, level: str = "base", seed: int | None = None
) -> list[YearChallenge]:
    rng = random.Random(seed)
    start_year, end_year = _year_range_for_level(level)
    count = max(1, min(int(count or 1), 20))
    challenges: list[YearChallenge] = []

    for _ in range(count):
        year = rng.randint(start_year, end_year)
        analysis = analyze_year(year)
        challenges.append(
            YearChallenge(
                year=year,
                level=level,
                correct_weekday=analysis["anchorWeekday"],
                options=_all_weekday_options(rng),
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


def year_challenge_to_dict(challenge: YearChallenge, reveal: bool = False) -> dict:
    payload = {
        "year": challenge.year,
        "label": str(challenge.year),
        "level": challenge.level,
        "options": challenge.options,
    }
    if reveal:
        payload.update(
            {
                "correctWeekday": challenge.correct_weekday,
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
