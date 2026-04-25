import os
import json
import uvicorn
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis

app = FastAPI(title="Face Recognition Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths for persistence
DATA_DIR = "data"
EMBEDDINGS_FILE = os.path.join(DATA_DIR, "embeddings.json")
PEOPLE_DIR = "people"

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)
if not os.path.exists(PEOPLE_DIR):
    os.makedirs(PEOPLE_DIR)

# Initialize FaceAnalysis
face_app = FaceAnalysis(name='buffalo_l')
face_app.prepare(ctx_id=-1, det_size=(640, 640)) # Use ctx_id=-1 for CPU

# Persistence Storage
registered_faces = {}

def load_embeddings():
    global registered_faces
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            with open(EMBEDDINGS_FILE, "r") as f:
                data = json.load(f)
                # Convert list back to numpy array
                registered_faces = {int(k): np.array(v) for k, v in data.items()}
            print(f"Loaded {len(registered_faces)} registered faces.")
        except Exception as e:
            print(f"Error loading embeddings: {e}")

def save_embeddings():
    try:
        data = {str(k): v.tolist() for k, v in registered_faces.items()}
        with open(EMBEDDINGS_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Error saving embeddings: {e}")

load_embeddings()

@app.get("/")
def read_root():
    return {
        "status": "Face Recognition Service is running",
        "registered_count": len(registered_faces)
    }

@app.get("/")
async def root():
    return {"status": "ok", "message": "Face Recognition Service is running on port 8080"}

@app.post("/train")
async def train(student_id: int = Form(...), file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    faces = face_app.get(img)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image.")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Multiple faces detected. Please upload an image with only one face.")

    embedding = faces[0].embedding
    registered_faces[student_id] = embedding
    save_embeddings()

    # Save training image for reference in 'people' folder
    save_path = os.path.join(PEOPLE_DIR, f"Student_{student_id}.jpg")
    with open(save_path, "wb") as f:
        f.write(contents)

    return {"message": f"Successfully registered face for student ID {student_id}"}

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    if not registered_faces:
        raise HTTPException(status_code=400, detail="No faces registered in the system yet.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    faces = face_app.get(img)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected for recognition.")

    recognized_students = []

    for face in faces:
        emb = face.embedding
        best_match_id = None
        highest_sim = -1.0

        for student_id, reg_emb in registered_faces.items():
            sim = np.dot(emb, reg_emb) / (np.linalg.norm(emb) * np.linalg.norm(reg_emb))
            if sim > highest_sim:
                highest_sim = sim
                best_match_id = student_id

        # Threshold for Buffalo_l model is typically around 0.40 - 0.50
        if highest_sim > 0.45:
            recognized_students.append({
                "student_id": int(best_match_id),
                "confidence": float(highest_sim)
            })

    if not recognized_students:
        return {"message": "Faces detected, but none recognized.", "recognized": []}

    return {"message": "Recognition successful", "recognized": recognized_students}

@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    if not registered_faces:
        return {"result": "Unknown"}

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    faces = face_app.get(img)
    if len(faces) == 0:
        return {"result": "no face detected"}

    # We only care about the first detected face for scanning
    emb = faces[0].embedding
    best_match_id = None
    highest_sim = -1.0

    for student_id, reg_emb in registered_faces.items():
        sim = np.dot(emb, reg_emb) / (np.linalg.norm(emb) * np.linalg.norm(reg_emb))
        if sim > highest_sim:
            highest_sim = sim
            best_match_id = student_id

    # Threshold 0.45 matches the AttendanceComponent logic
    if highest_sim > 0.45:
        return {"result": f"Student_{best_match_id}"}
    
    return {"result": "Unknown"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
