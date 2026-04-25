# Face-AI (School Project) — Demo

This project is a small face recognition demo with a web UI, attendance recording, and a dashboard. It's intended for school/educational use with consent from people in the photos.

## Structure
```
face-ai/
  api/
    main.py
    model.py
    people/    # put images here (see below)
    attendance.csv (auto-created)
  web/
    index.html
    dashboard.html
  requirements.txt
```

## How to add people (train)
- Put photos inside `api/people/`.
- Filenames must start with the person's name followed by underscore, e.g. `ahmed_1.jpg`, `ahmed_2.jpg`, `sara_1.jpg`.
- Use 3-10 photos per person with different angles/lighting for better accuracy.

## Run
1. Install requirements:
```
pip install -r requirements.txt
```
2. Start API:
```
cd face-ai/api
uvicorn main:app --reload
```
3. Open UI:
Open `face-ai/web/index.html` in a browser (Chrome/Edge). Click camera button to scan.

## Notes
- Attendance is appended to `api/attendance.csv` when a face matches.
- API runs on http://127.0.0.1:8000 by default. If hosted elsewhere, update `fetch` URLs in `web/*.html`.
- Respect privacy: only use photos with permission.
