from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
from model import load_model
import csv
from datetime import datetime
import os

app = FastAPI()

# allow web files to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ATTENDANCE_FILE = "attendance.csv"

# ensure attendance file exists with header
if not os.path.exists(ATTENDANCE_FILE):
    with open(ATTENDANCE_FILE, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "name"])

known_encodings, known_names = load_model()

@app.post("/scan")
async def scan_face(file: UploadFile = File(...)):
    img = face_recognition.load_image_file(file.file)
    enc = face_recognition.face_encodings(img)

    if len(enc) == 0:
        return {"result": "no face detected"}

    face_enc = enc[0]

    import numpy as np
    face_distances = face_recognition.face_distance(known_encodings, face_enc)
    best_match_index = np.argmin(face_distances)
    name = "Unknown"

    if face_distances[best_match_index] < 0.45: # Strict threshold to avoid false positives
        name = known_names[best_match_index]
        # save attendance
        with open(ATTENDANCE_FILE, "a", newline='') as f:
            writer = csv.writer(f)
            writer.writerow([datetime.utcnow().isoformat(), name, "Face_ID"])

    return {"result": name}

@app.get("/attendance")
def get_attendance():
    rows = []
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, newline='') as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append(r)
    return {"attendance": rows}
