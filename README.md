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

```txt
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