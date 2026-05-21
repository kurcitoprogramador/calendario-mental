# Calendario Mental

App minimalista para entrenar el calculo mental del dia de la semana.

## Link publico

https://kurcitoprogramador.github.io/calendario-mental/

## Stack

- Backend: Python 3 + HTTP server propio
- Datos: SQLite local
- Frontend: HTML, CSS y JavaScript sin build
- API: JSON sobre `/api`

## Ejecutar

```bash
python -m backend.server
```

Abre:

```text
http://127.0.0.1:8765
```

En Windows tambien puedes usar:

```powershell
.\run.ps1
```

## Secciones

- `Estudio`: anclas, regla de salto y analizador de fechas.
- `Practica`: retos por nivel, temporizador, resultado y progreso.

## API

- `GET /api/health`
- `GET /api/lesson`
- `GET /api/progress`
- `GET /api/date/analyze?date=YYYY-MM-DD`
- `GET /api/practice/challenge?level=base&count=1`
- `POST /api/practice/attempt`
- `POST /api/progress/study`

## Pruebas

```bash
python -m unittest discover -s tests
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Initial calendar trainer"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/calendario-mental.git
git push -u origin main
```
