# PrivAI MVP

PrivAI is a government-first visual privacy protection MVP for Hackathon FIND IT! 2026.  
The system detects sensitive visual identity information using a local YOLO `.pt` model, applies redaction, stores non-private outputs in the Operational Zone, and stores encrypted originals in the Sovereign Vault simulation.

## Core Concept

Input image or document  
→ Local YOLO inference  
→ Sensitive object detection  
→ Government black-box redaction  
→ Operational Zone stores redacted output and non-private metadata  
→ Sovereign Vault stores encrypted original file and audit metadata

## Main Track

Government and public-service identity protection.

## Secondary Track

Live webcam or social-media privacy filter using blur redaction.

## Tech Stack

Backend:
- Python
- FastAPI
- Ultralytics YOLO
- OpenCV
- SQLite
- AES-256-GCM simulation using cryptography

Frontend:
- React
- Vite
- Tailwind CSS

Deployment:
- Local venv for fast development
- Docker Compose for reproducible demo

## Project Structure

privai-mvp/
  backend/
    app/
      core/
      ai/
      services/
      db/
      utils/
      main.py
    models/
      privai_yolo.pt
    storage/
      operational_zone/
      sovereign_vault/
      audit/
    requirements.txt
    Dockerfile
    .env.example

  frontend/
    src/
      api/
      App.jsx
    Dockerfile
    .env.example

  docs/
  docker-compose.yml
  README.md

## Sprint 1: YOLO Inference API

### Run Backend

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
Check API
GET http://127.0.0.1:8000/api/health
GET http://127.0.0.1:8000/api/model-info
Test Inference

Open Swagger UI:

http://127.0.0.1:8000/docs

Use:

POST /api/infer

Upload an image and set confidence threshold.

Current Scope

Sprint 1 only performs detection and returns JSON.
Redaction, Operational Zone, Sovereign Vault, database, and audit logging will be implemented in the next sprints.
```

## Sprint 2: Government Redaction Pipeline

Sprint 2 adds the government-first redaction pipeline.

### Main Flow

```txt
Upload image
→ Local YOLO inference
→ Sensitive object detection
→ Black-box redaction
→ Save redacted output to Operational Zone
→ Return redacted file URL and non-private metadata
```

Redaction Profiles

Government profile:

profile=government
mode=black_box

Live webcam development profile:

profile=live_webcam
mode=blur
API Endpoints
GET  /api/redaction-config
POST /api/redact
GET  /api/files/redacted/{filename}
Test Government Redaction
curl.exe -X POST "http://127.0.0.1:8000/api/redact?confidence_threshold=0.35&profile=government" ^
  -F "file=@D:\Lomba\privai\sample\test.jpg"
Operational Zone Rule

Operational Zone stores only:

- redacted image
- non-private metadata
- detection summary
- latency
- redaction mode
- status information

Operational Zone does not store the original private image.


Untuk PowerShell, command multiline pakai backtick, bukan `^`. Jadi di README boleh tulis versi PowerShell juga:

```md
PowerShell:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/redact?confidence_threshold=0.35&profile=government" `
  -F "file=@D:\Lomba\privai\sample\test.jpg"
```