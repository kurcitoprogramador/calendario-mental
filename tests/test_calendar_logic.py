import unittest
from datetime import date

from backend.calendar_logic import (
    analyze_date,
    doomsday_day_for_month,
    doomsday_for_year,
    generate_challenges,
    weekday_for,
)


class CalendarLogicTest(unittest.TestCase):
    def test_known_dates(self):
        self.assertEqual(weekday_for(date(2026, 5, 20)), "miercoles")
        self.assertEqual(weekday_for(date(2024, 3, 14)), "jueves")
        self.assertEqual(weekday_for(date(2000, 1, 1)), "sabado")

    def test_leap_anchors(self):
        self.assertEqual(doomsday_day_for_month(2024, 1), 4)
        self.assertEqual(doomsday_day_for_month(2024, 2), 29)
        self.assertEqual(doomsday_day_for_month(2025, 1), 3)
        self.assertEqual(doomsday_day_for_month(2025, 2), 28)

    def test_analysis_uses_month_anchor(self):
        analysis = analyze_date(date(2026, 12, 25))
        self.assertEqual(analysis["anchorLabel"], "12 diciembre 2026")
        self.assertEqual(analysis["deltaDays"], 13)
        self.assertEqual(analysis["deltaMod"], 6)
        self.assertEqual(analysis["weekday"], "viernes")

    def test_challenges_are_bounded(self):
        challenges = generate_challenges(count=4, level="duro", seed=42)
        self.assertEqual(len(challenges), 4)
        self.assertTrue(all(1900 <= int(item.iso_date[:4]) <= 2099 for item in challenges))
        self.assertTrue(all(item.correct_weekday in item.options for item in challenges))

    def test_doomsday_matches_march_anchor(self):
        self.assertEqual(doomsday_for_year(2026), date(2026, 3, 14).weekday())


if __name__ == "__main__":
    unittest.main()
