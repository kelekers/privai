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

## Sprint 3: Sovereign Vault and Government Access API

Sprint 3 adds a Sovereign Vault simulation with hybrid encryption, per-session DEK, key versioning, key rotation, and controlled government access.

### Encryption Model

PrivAI uses envelope encryption:

```txt
Original file
→ encrypted using fresh AES-256 DEK per upload/session
→ DEK wrapped using Sovereign Vault public key
→ encrypted bundle stored in Sovereign Vault

The DEK is generated repeatedly per file/session and is never stored in plaintext.

Key Model
Vault public key:
- shared to User Zone as trusted public key
- used to wrap DEK

Vault private key:
- stays inside Sovereign Vault simulation
- never sent to User Zone
- versioned using key_id and key_version
- rotated using admin endpoint
Government Access API

Original files are not directly accessible by user or frontend.

Access flow:

1. Government officer creates access request.
2. Approver approves request.
3. One-time token is issued.
4. Original file is decrypted only through Government Access API / Vault Gateway.
5. Access is audited.
Useful Endpoints
GET  /api/crypto/key-info
POST /api/crypto/rotate-vault-key
POST /api/government/access-requests
POST /api/government/access-requests/{request_id}/approve
GET  /api/government/access-requests/{request_id}/secure-original
Class Filtering

Disable redaction for selected classes:

curl.exe -X POST "http://127.0.0.1:8000/api/redact?profile=government&disabled_classes=Wajah" `
  -F "file=@D:\Lomba\privai\sample\test.jpg"

Only redact selected classes:

curl.exe -X POST "http://127.0.0.1:8000/api/redact?profile=government&active_classes=NIK_Teks" `
  -F "file=@D:\Lomba\privai\sample\test.jpg"

## Sprint 4: Frontend Dashboard MVP

Sprint 4 adds the main dashboard for demo.

### Dashboard Features

```txt
- Upload image
- Original preview from browser local file
- Redacted output from Operational Zone
- Detection table
- Latency and device metrics
- Operational Zone status
- Sovereign Vault status
- Active class filtering
- Disabled class filtering
Run Backend
cd D:\Lomba\privai\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
Run Frontend
cd D:\Lomba\privai\frontend
npm run dev

Open:

http://localhost:5173
Important UI Privacy Note

The original preview shown in the browser is only a local preview of the selected file.

Operational Zone stores only:

- redacted image
- non-private metadata
- detection summary
- latency
- redaction status

The original file is encrypted and stored in Sovereign Vault only. Plaintext original access is not exposed in the normal user dashboard.

## Sprint 5: Dynamic Injection and Government Access Console

Sprint 5 adds runtime policy configuration and a government-only access console.

### Dynamic Injection

Dynamic Injection is implemented as validated runtime configuration.

Supported runtime policy fields:

```txt
- policy_name
- confidence_threshold
- profile
- redaction_mode
- active_classes
- disabled_classes
- label_text
- injection_note

Security rule:

No eval.
No arbitrary code execution.
Only whitelisted policy keys are accepted.
All class names and redaction modes are validated.
Runtime Policy API
GET  /api/runtime-policy
PUT  /api/runtime-policy
POST /api/runtime-policy/reset
Use Runtime Policy During Redaction
curl.exe -X POST "http://127.0.0.1:8000/api/redact?use_runtime_policy=true" `
  -F "file=@D:\Lomba\privai\sample\test.jpg"
Government Access Console

Raw original data is not accessible from the normal user dashboard.

Controlled access flow:

1. Create access request
2. Approve request
3. Issue one-time access token
4. Download original through Government Access API / Vault Gateway
5. Mark token as used
6. Write audit log