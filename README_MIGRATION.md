# AI-Powered Business Growth Dashboard (Migration)

This project has been successfully migrated from a monolithic Streamlit application to a modern, production-ready React (Vite) + FastAPI architecture. All underlying Machine Learning, Forecasting, and Recommendation Engine logic has been preserved without modifications.

## 📁 Folder Structure

```text
MY_PROJECT/
├── backend/                  # FastAPI Backend Application
│   ├── api/
│   │   └── router.py         # API Endpoints
│   ├── models/
│   │   └── schemas.py        # Pydantic Validation Models
│   ├── services/
│   │   └── ml_service.py     # Wrapper for existing ML logic
│   └── main.py               # FastAPI Application Entry
├── frontend/                 # React Vite Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable UI Components
│   │   │   ├── ForecastChart.jsx
│   │   │   ├── KPICard.jsx
│   │   │   ├── ShapChart.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── pages/            # Page Views
│   │   │   └── Dashboard.jsx
│   │   ├── services/         # API Integration Layer
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css         # Tailwind & Global Styles
│   │   └── main.jsx
│   ├── tailwind.config.js    # Tailwind configuration
│   ├── vite.config.js        # Vite configuration
│   └── package.json
├── data/                     # Data CSVs (Original)
├── app.py                    # Original Streamlit App (Deprecated)
├── augment_data.py           # Original (Preserved)
├── forecasting.py            # Original ML Logic (Preserved)
├── ml_core.py                # Original ML Logic (Preserved)
├── strategy_recommender.py   # Original ML Logic (Preserved)
└── xgb_model.joblib          # Original Model (Preserved)
```

## ⚙️ Installation & Setup

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the root directory `MY_PROJECT`.
2. Ensure your virtual environment is activated (if you have one).
3. Install backend dependencies:
   ```bash
   pip install fastapi uvicorn pydantic pandas xgboost scikit-learn shap prophet plotly joblib
   ```

### 2. Frontend Setup (React)

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```

---

## 🚀 Running the Application Locally

You will need to run the backend and frontend simultaneously in two separate terminals.

### Terminal 1: Run the FastAPI Backend
From the root directory (`MY_PROJECT`):
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- The backend API will run on: `http://localhost:8000`
- You can view the interactive Swagger API documentation at: `http://localhost:8000/docs`

### Terminal 2: Run the React Frontend
From the `frontend` directory:
```bash
npm run dev
```
- The React App will run on: `http://localhost:5173`

---

## 🛠️ API Endpoints overview

The backend exposes the following RESTful endpoints:
- `GET /api/dashboard-metrics`: Fetches initial data and current KPI metrics.
- `POST /api/predict`: Runs the XGBoost prediction based on the What-If scenario payload.
- `POST /api/recommend-strategy`: Evaluates custom metrics to generate actionable business strategy.
- `POST /api/shap-values`: Returns SHAP feature impact data based on inputs.
- `GET /api/forecast`: Runs Facebook Prophet to return forecasted revenue points.

## 🌍 Deployment Guide

### Frontend Deployment (Vercel / Netlify)
1. Commit the code to GitHub.
2. Link the repository to Vercel/Netlify.
3. Set the Root Directory to `frontend`.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. *Important*: Add an Environment Variable in Vercel: `VITE_API_URL = https://your-backend-url.com/api`

### Backend Deployment (Render / Railway / AWS EC2)
1. Add a `requirements.txt` file in the root if you don't have one:
   ```bash
   pip freeze > requirements.txt
   ```
2. Ensure `fastapi` and `uvicorn` are in `requirements.txt`.
3. Deploy the root directory.
4. Set the Start Command to:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
5. Ensure the CORS policy in `backend/main.py` is updated to allow requests from your deployed Vercel frontend URL.

## 💡 Production Optimization Suggestions
1. **API Caching:** Implement Redis caching on the FastAPI backend for the Prophet forecast since it can be heavy to calculate on every request, especially if the data updates daily/monthly.
2. **Debouncing:** The frontend already uses debouncing (500ms) on scenario sliders to prevent spamming the backend API. 
3. **Lazy Loading:** For the React app, consider wrapping `ShapChart` and `ForecastChart` with `React.lazy()` if the dashboard becomes more complex.
4. **Environment Variables:** Move configuration (like CORS allowed origins) to a `.env` file for production safety.
