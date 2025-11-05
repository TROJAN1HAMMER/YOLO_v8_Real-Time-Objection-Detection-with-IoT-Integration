import os
import shutil
from datetime import datetime
from pathlib import Path
import threading
import time
import serial
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO
from fastapi import FastAPI, File, UploadFile, Form

# Setup
app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    # allow_origins=[
    #     "https://main.d2y1sw8v1mkbt1.amplifyapp.com",  # your frontend
    #     "https://13-218-84-170.sslip.io"               # backend direct access
    # ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RESULTS_DIR = BASE_DIR / "results"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Serve results directory as static files
app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")

# Load YOLO model once
model = YOLO("yolov8n.pt")

try:
    ARDUINO_PORT = "COM5"   # change this to your actual Arduino port
    BAUD_RATE = 115200
    arduino = serial.Serial(ARDUINO_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)
    print(f"✅ Connected to Arduino on {ARDUINO_PORT}")
except Exception as e:
    print(f"⚠️ Could not connect to Arduino: {e}")
    arduino = None

def send_to_arduino(flag):
    try:
        if arduino:
            arduino.write(str(flag).encode())  # send '1' or '0'
            print(f"📤 Sent {flag} to Arduino")
        else:
            print("⚠️ Arduino not connected")
    except Exception as e:
        print(f"⚠️ Error sending to Arduino: {e}")

@app.get("/")
def root():
    return {"message": "YOLO API is running 🚀"}


# @app.post("/predict/")
# async def predict(file: UploadFile = File(...)):
#     try:
#         # Save uploaded file
#         timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
#         file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
#         with open(file_path, "wb") as f:
#             shutil.copyfileobj(file.file, f)

#         # Run YOLO prediction (save annotated image in results/runs/)
#         results = model.predict(
#             source=str(file_path),
#             save=True,
#             project=str(RESULTS_DIR),
#             name="runs",
#             exist_ok=True
#         )

#         # Extract detections
#         detections = []
#         for box in results[0].boxes:
#             cls_id = int(box.cls[0])
#             label = model.names[cls_id]
#             confidence = float(box.conf[0])
#             detections.append({
#                 "label": label,
#                 "confidence": round(confidence, 3),
#                 "box": box.xyxy[0].tolist()  # [x1, y1, x2, y2]
#             })

#         # Find the annotated result file
#         save_dir = Path(results[0].save_dir)
#         # YOLO saves with original filename
#         result_file = save_dir / file_path.name
#         #PUBLIC_HOST = "http://13.218.84.170:8000"
#         #image_url = f"{PUBLIC_HOST}/results/{save_dir.name}/{file_path.name}"
#         image_url = f"http://127.0.0.1:8000/results/{save_dir.name}/{file_path.name}"
#         response = {
#             "filename": file.filename,
#             "detections": detections,
#             "image_url": image_url
#         }

#         labels = [det["label"].lower() for det in detections]
#         person_flag = 1 if "person" in labels else 0
#         print(f"👁️  Person detected flag: {person_flag}")
#         # Send person flag to Arduino (without blocking FastAPI)
#         threading.Thread(target=send_to_arduino, args=(person_flag,)).start()
#         # === Response ===
#         response = {
#             "filename": file.filename,
#             "detections": detections,
#             "image_url": image_url,
#             "person_detected": person_flag
#         }

#         return JSONResponse(content=response)

#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)

# @app.post("/predict/")
# async def predict(file: UploadFile = File(...)):
#     try:
#         # Save uploaded file
#         timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
#         file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
#         with open(file_path, "wb") as f:
#             shutil.copyfileobj(file.file, f)

#         # Run YOLO prediction
#         results = model.predict(
#             source=str(file_path),
#             save=True,
#             project=str(RESULTS_DIR),
#             name="runs",
#             exist_ok=True
#         )

#         detections = []
#         grid_signal = None  # default

#         # Image dimensions (YOLO gives it)
#         img_w, img_h = results[0].orig_shape[1], results[0].orig_shape[0]

#         # Grid boundaries
#         mid_x = img_w / 2
#         mid_y = img_h / 2

#         for box in results[0].boxes:
#             cls_id = int(box.cls[0])
#             label = model.names[cls_id]
#             confidence = float(box.conf[0])
#             [x1, y1, x2, y2] = box.xyxy[0].tolist()

#             detections.append({
#                 "label": label,
#                 "confidence": round(confidence, 3),
#                 "box": [x1, y1, x2, y2]
#             })

#             if label.lower() == "person":
#                 # Find center of person bounding box
#                 cx = (x1 + x2) / 2
#                 cy = (y1 + y2) / 2

#                 # Determine grid position
#                 if cx < mid_x and cy < mid_y:
#                     grid_signal = 1  # top-left
#                 elif cx >= mid_x and cy < mid_y:
#                     grid_signal = 2  # top-right
#                 elif cx < mid_x and cy >= mid_y:
#                     grid_signal = 3  # bottom-left
#                 else:
#                     grid_signal = 4  # bottom-right

#                 print(f"👁️ Person at ({cx:.1f}, {cy:.1f}) → Grid {grid_signal}")

#         # Build result file URL
#         save_dir = Path(results[0].save_dir)
#         result_file = save_dir / file_path.name
#         image_url = f"http://127.0.0.1:8000/results/{save_dir.name}/{file_path.name}"

#         # If person found, send respective grid signal to Arduino
#         if grid_signal:
#             threading.Thread(target=send_to_arduino, args=(grid_signal,)).start()
#         else:
#             threading.Thread(target=send_to_arduino, args=('0',)).start()

#         response = {
#             "filename": file.filename,
#             "detections": detections,
#             "image_url": image_url,
#             "grid_signal": grid_signal or 0
#         }

#         return JSONResponse(content=response)

#     except Exception as e:
#         return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/predict/")
async def predict(file: UploadFile = File(...), selected_cell: int = Form(...)):
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_path = UPLOAD_DIR / f"{timestamp}_{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        results = model.predict(
            source=str(file_path),
            save=True,
            project=str(RESULTS_DIR),
            name="runs",
            exist_ok=True
        )

        detections = []
        person_flag = 0

        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "label": label,
                "confidence": round(confidence, 3),
                "box": [x1, y1, x2, y2]
            })

            if label.lower() == "person":
                person_flag = 1

        # Send Arduino signal only if person detected in selected grid
        send_val = selected_cell if person_flag else 0
        threading.Thread(target=send_to_arduino, args=(send_val,)).start()

        save_dir = Path(results[0].save_dir)
        image_url = f"http://127.0.0.1:8000/results/{save_dir.name}/{file_path.name}"

        response = {
            "filename": file.filename,
            "detections": detections,
            "image_url": image_url,
            "person_in_selected_grid": bool(person_flag),
            "grid_signal_sent": send_val
        }

        return JSONResponse(content=response)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
