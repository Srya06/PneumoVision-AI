# PneumoVision AI 🫁✨

> **AI-Powered Pneumonia Detection & Clinical Decision Support System**

PneumoVision AI is a commercial-grade healthcare web application designed for hospital radiologists and physicians. It leverages a fine-tuned **VGG16 Neural Network** to perform instant pneumonia detection on Chest X-Rays, compute **Grad-CAM visual heatmaps**, track patient medical histories, and generate hospital-grade **PDF reports**.

---

## 🌟 Key Features

- **Singleton Model Inference Engine**: Loads `pneumovision_vgg16_final.keras` once on startup into memory.
- **Grad-CAM Localization**: Automatically generates Gradient-weighted Class Activation Map overlays using TensorFlow `GradientTape` on the `block5_conv3` layer.
- **Severity & Clinical Guidance**: Maps prediction confidence into Low, Medium, or High severity tiers with actionable pulmonologist recommendations.
- **PDF Report Generation**: Creates PDF reports complete with hospital header, patient demographics, prediction banner, Grad-CAM images, and legal disclaimers using ReportLab.
- **Patient Management Directory**: Full CRUD with auto-generated sequential patient IDs (`PAT0001`), history timeline, search, and doctor assignment.
- **JWT Security & Role-Based Access**: Role-based routing (`doctor` and `admin`), bcrypt password hashing, and MongoDB audit logging.
- **Operational Analytics Dashboard**: Real-time KPI cards, Chart.js weekly/monthly case volume charts, average confidence metrics, and recent predictions table.
- **Modern Hospital Design**: Built with React, Tailwind CSS, Material UI icons, glassmorphism, responsive dark mode, and toast notifications.

---

## 📊 Model Evaluation Benchmark

Validated on clinical evaluation test set (`evaluation_metrics.csv`):

| Metric | Score |
|---|---|
| **Accuracy** | **90.38%** |
| **Precision** | **91.25%** |
| **Recall (Sensitivity)** | **93.59%** |
| **F1 Score** | **92.41%** |
| **Specificity** | **85.04%** |
| **ROC-AUC** | **95.95%** |

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10)
- **Deep Learning**: TensorFlow 2.17 (VGG16 architecture)
- **Computer Vision**: OpenCV, Pillow, NumPy
- **PDF Generation**: ReportLab
- **Database**: MongoDB Atlas (Async Motor client with connection pooling)
- **Auth**: PyJWT + Passlib (bcrypt)

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS + Material UI + Lucide Icons
- **Charts**: Chart.js (`react-chartjs-2`)
- **State & Forms**: React Hook Form, React Router v6, Axios
- **Notifications**: React Hot Toast

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas cluster URI
- Existing `pneumovision_vgg16_final.keras` model file in root

---

### 1. Environment Setup

Copy `.env.example` to `.env` and verify your MongoDB Atlas URI:

```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pneumovision?retryWrites=true&w=majority
MONGODB_DB_NAME=pneumovision
SECRET_KEY=your_secure_random_secret_key_generate_with_python_secrets
```

---

### 2. Start Backend Server

```bash
# Create virtual environment
python -m venv venv
# Activate on Windows:
.\venv\Scripts\activate
# Activate on Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI development server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

FastAPI Documentation available at:
- OpenAPI Specs: `http://localhost:8000/docs`
- ReDoc Specs: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

---

### 3. Start Frontend Client

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

To build and run the complete application using Docker Compose:

```bash
docker-compose up --build -d
```

- Frontend available at: `http://localhost:3000`
- Backend API available at: `http://localhost:8000`

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new doctor/admin account | No |
| `POST` | `/auth/login` | Authenticate & retrieve JWT token | No |
| `GET` | `/auth/me` | Fetch current user profile | Yes |
| `POST` | `/patient/create` | Register new patient file | Yes |
| `PUT` | `/patient/update/{id}` | Update patient record | Yes |
| `DELETE` | `/patient/delete/{id}` | Delete patient record | Yes |
| `GET` | `/patient/list` | Paginated patient directory | Yes |
| `GET` | `/patient/{id}` | Patient profile & history | Yes |
| `POST` | `/predict` | Upload Chest X-Ray & run AI inference | Yes |
| `GET` | `/predict/history` | List recent predictions | Yes |
| `POST` | `/report/generate/{pred_id}`| Generate PDF report | Yes |
| `GET` | `/report/download/{rpt_id}`| Download PDF report file | Yes |
| `GET` | `/dashboard` | Aggregated analytics & charts | Yes |
| `GET` | `/health` | System health check | No |

---

## ⚖️ Legal Disclaimer

> **AI-assisted clinical decision support. Final diagnosis should always be made by a qualified physician.**
> PneumoVision AI is designed as a supplementary diagnostic tool and does not replace professional medical judgment or radiological evaluation.
