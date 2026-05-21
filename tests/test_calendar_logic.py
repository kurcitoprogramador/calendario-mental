import unittest
from datetime import date

from backend.calendar_logic import (
    analyze_year,
    analyze_date,
    doomsday_day_for_month,
    doomsday_for_year,
    generate_challenges,
    generate_year_challenges,
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

    def test_year_analysis(self):
        analysis = analyze_year(2026)
        self.assertEqual(analysis["century"], 2000)
        self.assertEqual(analysis["centuryAnchor"], "martes")
        self.assertEqual(analysis["yearPart"], 26)
        self.assertEqual(analysis["leapCount"], 6)
        self.assertEqual(analysis["quarterRemainder"], 2)
        self.assertEqual(analysis["weekCount"], 3)
        self.assertEqual(analysis["weekRemainder"], 5)
        self.assertEqual(analysis["mentalTotal"], 11)
        self.assertEqual(analysis["mentalMod"], 4)
        self.assertEqual(analysis["mentalLine"], "6 + 5 o sea 4 o sea sabado")
        self.assertEqual(analysis["jumpMod"], 4)
        self.assertEqual(analysis["anchorWeekday"], "sabado")

    def test_year_challenges_use_all_weekdays(self):
        challenges = generate_year_challenges(count=2, level="duro", seed=7)
        self.assertEqual(len(challenges), 2)
        self.assertTrue(all(1600 <= item.year <= 2399 for item in challenges))
        self.assertTrue(all(len(item.options) == 7 for item in challenges))
        self.assertTrue(all(item.correct_weekday in item.options for item in challenges))


if __name__ == "__main__":
    unittest.main()
