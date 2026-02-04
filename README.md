# Lab IWWW

## Frontend (Angular)
```bash
cd ~/lab_iwww/frontend/taskboard
npm install
npm start -- --host 0.0.0.0 --port 4200
```

## Backend (FastAPI)
```bash
cd ~/lab_iwww/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Backend (Docker)
```bash
docker build -t lab_iwww-backend ./backend
docker run --rm -p 8000:8000 lab_iwww-backend
```
