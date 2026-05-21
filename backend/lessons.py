LESSON = {
    "title": "Estudio",
    "deck": [
        {
            "key": "axis",
            "title": "Eje",
            "body": "Cada ano tiene un dia ancla. Varias fechas del ano caen en ese mismo dia.",
            "chips": ["ano", "mes", "mod 7"],
        },
        {
            "key": "pairs",
            "title": "Pares",
            "body": "4/4, 6/6, 8/8, 10/10 y 12/12 comparten el ancla del ano.",
            "chips": ["4/4", "6/6", "8/8", "10/10", "12/12"],
        },
        {
            "key": "odd",
            "title": "Impares",
            "body": "9/5, 5/9, 11/7 y 7/11 son las fechas raras que necesitas memorizar.",
            "chips": ["9/5", "5/9", "11/7", "7/11"],
        },
        {
            "key": "janfeb",
            "title": "Inicio",
            "body": "Enero usa 3 o 4. Febrero usa 28 o 29. Cambia si el ano es bisiesto.",
            "chips": ["ene 3/4", "feb 28/29"],
        },
        {
            "key": "move",
            "title": "Salto",
            "body": "Resta la fecha ancla del mes. Reduce el resultado con modulo 7. Avanza esos dias.",
            "chips": ["resta", "mod 7", "avanza"],
        },
    ],
    "anchors": [
        {"month": "ene", "normal": "3", "leap": "4"},
        {"month": "feb", "normal": "28", "leap": "29"},
        {"month": "mar", "normal": "14", "leap": "14"},
        {"month": "abr", "normal": "4", "leap": "4"},
        {"month": "may", "normal": "9", "leap": "9"},
        {"month": "jun", "normal": "6", "leap": "6"},
        {"month": "jul", "normal": "11", "leap": "11"},
        {"month": "ago", "normal": "8", "leap": "8"},
        {"month": "sep", "normal": "5", "leap": "5"},
        {"month": "oct", "normal": "10", "leap": "10"},
        {"month": "nov", "normal": "7", "leap": "7"},
        {"month": "dic", "normal": "12", "leap": "12"},
    ],
}
