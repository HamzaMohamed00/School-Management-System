import face_recognition
import os

def load_model():
    known_encodings = []
    known_names = []

    folder = "people"

    for file in os.listdir(folder):
        if file.lower().endswith((".jpg", ".png", ".jpeg")):
            path = os.path.join(folder, file)

            img = face_recognition.load_image_file(path)
            enc = face_recognition.face_encodings(img)

            if len(enc) == 0:
                print(f"[WARNING] No face found in {file}")
                continue

            known_encodings.append(enc[0])
            name = file.split("_")[0]
            known_names.append(name)

    print(f"[INFO] Loaded {len(known_names)} face encodings.")
    return known_encodings, known_names
