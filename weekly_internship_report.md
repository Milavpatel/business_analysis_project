# Weekly Internship Reports

## Week 1 (June 5 – June 7)

### Introduction
This initial week focused on project onboarding, orientation, and performing a comprehensive audit of the legacy monolithic Streamlit application (`app.py`). The legacy implementation combined presentation, state management, and machine learning computation in a single script, which suffered from rendering bottlenecks and lacked multi-user security. The goal was to study this monolithic system, analyze its underlying machine learning workflows (XGBoost prediction, SHAP explanation, and Prophet forecasting), and design a high-level migration plan to a modern, decoupled architecture featuring a FastAPI REST backend and a React (Vite) frontend.

### Accomplishments
* **Monolithic Codebase Analysis:** Audited the legacy `app.py` and original ML scripts ([ml_core.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/ml_core.py), [forecasting.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/forecasting.py), and [strategy_recommender.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/strategy_recommender.py)) to map the inputs (11 business metrics) and their interactions with the serialized XGBoost model (`xgb_model.joblib`).
* **Decoupled Architecture Design:** Drafted the system blueprint dividing responsibilities between a stateless backend REST API and a client-side Single Page Application (SPA).
* **Database & Security Planning:** Identified requirements for user session persistence, password hashing, and CORS configurations required to let the React dev server communicate with FastAPI.
* **Folder Structure Definition:** Planned a scalable repository layout separating backend logic (routers, services, validation models) from frontend modular directories (components, pages, context, layouts).

### Learning Experience
Deepened understanding of Streamlit's single-threaded state model and why it is unsuited for multi-user production applications. Gained practical experience in designing decoupled web architectures, modeling RESTful API endpoints, and preparing data contracts using JSON formats.

### Goals for Next Week
Scaffold the FastAPI backend, set up Pydantic data schemas, implement user registration/login mechanics, and configure secure JWT authentication.

### Feedback & Support Needed
Request a code structure review from the technical lead to ensure the backend directory layout conforms to enterprise development practices.

### Conclusion
Successfully finalized the project planning phase and established a robust architectural roadmap for the migration of the application.

---

## Week 2 (June 8 – June 14)

### Introduction
The focus of Week 2 was on setting up the FastAPI backend environment, implementing structural routing, establishing a user database model, and securing the system using JSON Web Tokens (JWT). A key challenge was ensuring that the authentication pipeline was stateless yet secure, protecting user-specific endpoints from unauthorized requests.

### Accomplishments
* **FastAPI Scaffolding:** Set up the virtual environment, installed backend dependencies, and initialized the FastAPI entry point in [main.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/main.py) with structured logging and environment variables.
* **Data Validation Models:** Created Pydantic models in [schemas.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/models/schemas.py) to validate register, login, token, and simulator payload structures.
* **JWT Authentication Pipeline:** Coded [auth_service.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/auth_service.py) to handle password hashing using `bcrypt` and JWT token creation/decryption using the HS256 algorithm.
* **Local User Persistence:** Set up [users_db.json](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/users_db.json) as a local JSON data store acting as a fast database for user credentials and metadata.
* **Authentication Routers:** Implemented [auth_router.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/api/auth_router.py), exposing secure endpoints for `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` with token dependency injection.
* **CORS Security Policies:** Added CORS middleware to `main.py` allowing cross-origin requests from the React frontend port while blocking unauthorized origins.

### Learning Experience
Gained deep hands-on knowledge of hashing algorithms (bcrypt salt generation and work factors) and JWT structures (header, payload claims like exp/sub, and signature verification). Learned how to implement FastAPI's dependency injection system to protect routes using security schemes.

### Goals for Next Week
Initialize the React Single Page Application (SPA) using Vite, configure Tailwind CSS, design the global layout, and build a dynamic multi-theme engine.

### Feedback & Support Needed
Need validation from team members regarding the token expiration window (currently set to 24 hours) to balance security and usability.

### Conclusion
The backend authentication foundation was successfully built and tested, providing a secure API surface for the subsequent frontend integration.

---

## Week 3 (June 15 – June 21)

### Introduction
This week focused on building the frontend foundation. The objective was to initialize the React application using Vite, configure Tailwind CSS for styling, set up global navigation components, and implement a premium design system including a dynamic, multi-theme configuration engine.

### Accomplishments
* **React SPA Scaffolding:** Created the Vite application in the `frontend` folder, configured script targets, and set up directory mappings.
* **Tailwind & Utility Setup:** Configured `tailwind.config.js` and `postcss.config.js`, establishing a custom palette supporting dark UI interfaces.
* **Multi-Theme Engine Integration:** Authored [ThemeContext.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/context/ThemeContext.jsx) to manage active CSS theme classes (`theme-cyberpunk`, `theme-aurora`, etc.) and persist selections in the browser's local storage.
* **Dynamic Theme Switcher UI:** Developed [ThemeSwitcher.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/components/ThemeSwitcher.jsx) as a responsive floating palette manager. Included custom animations using `framer-motion` and styled selection states supporting five dark themes: Slate Dark, Carbon Dark, Forest Dark, Charcoal Dark, and Obsidian Dark.
* **Responsive Layout Containers:** Coded the primary navigation structure, incorporating a responsive sidebar and a main content viewport that adapts to mobile, tablet, and desktop screens.

### Learning Experience
Learned how to construct a robust theme system in React using Tailwind variables and CSS classes. Gained experience using Framer Motion for hardware-accelerated micro-interactions (hover, tap, exit transitions) and utilizing local storage hooks.

### Goals for Next Week
Develop the main Dashboard page view, integrate visualization libraries (Recharts/ChartJS), and wire the backend machine learning prediction services to frontend widgets.

### Feedback & Support Needed
Request design feedback from users on color contrast ratios across the Forest Dark and Carbon Dark configurations to ensure accessibility compliance.

### Conclusion
The frontend UI design system and skeleton layout were completed, providing a polished and responsive shell ready to house real-world data dashboard elements.

---

## Week 4 (June 22 – June 28)

### Introduction
The goal of Week 4 was to integrate the core Machine Learning pipelines (XGBoost models, SHAP explainer calculations, and Prophet forecasts) into the FastAPI backend and display the output on the main frontend Dashboard. This required wrapping legacy Python ML logic into REST endpoints and building responsive data charts.

### Accomplishments
* **ML Service Wrapper:** Authored [ml_service.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/ml_service.py) to load `xgb_model.joblib` and build the SHAP tree explainer on backend startup, optimizing API response times.
* **Historical & Prediction Endpoints:** Developed routers serving `/api/dashboard-metrics` and `/api/forecast` (integrating Facebook Prophet inside `forecasting.py`).
* **KPI Card Visuals:** Designed reusable metrics layout component [KPICard.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/components/KPICard.jsx) featuring up/down indicators, sparklines, and percentage trackers.
* **Dynamic Charts:** Programmed [ShapChart.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/components/ShapChart.jsx) to map model feature weights and [ForecastChart.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/components/ForecastChart.jsx) to display actual vs. predicted revenue intervals.
* **Interactive Dashboard Page:** Assembled [Dashboard.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/pages/Dashboard.jsx) with page widgets. Wired authorization headers in API calls, ensuring unauthenticated requests redirect to a glassmorphism Auth Page ([AuthPage.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/pages/AuthPage.jsx)).

### Learning Experience
Deepened knowledge of the mathematics behind SHAP (Shapley Additive exPlanations) values for model transparency and the Prophet additive model structure (trend, seasonality, holidays). Mastered handling async dashboard state loading, skeleton loaders, and API interceptors.

### Goals for Next Week
Create the What-If simulation workspace page, implement slider controllers, and build a context-aware AI chatbot assistant.

### Feedback & Support Needed
Review backend calculation time for Prophet forecasting under high load to evaluate potential caching options.

### Conclusion
Successfully integrated the machine learning models into the web system, resulting in a live, interactive data-visualization dashboard.

---

## Week 5 (June 29 – July 5)

### Introduction
Week 5 focused on building the interactive What-If simulation engine and an advanced, context-aware AI Advisor chatbot. The objective was to enable users to manipulate business inputs via sliders and receive instant, model-driven prediction statuses, strategy playbooks, and conversational action checklists.

### Accomplishments
* **Simulation Scenario Engine:** Developed [scenario_engine.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/scenario_engine.py), which uses a continuous weighted matrix to compute real-time prediction statuses (XGBoost wrapper) and recommendation codes based on slider input values.
* **What-If Simulation UI:** Built [WhatIfPage.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/pages/WhatIfPage.jsx), mapping 11 parameters (Growth metrics, Churn, conversion rates, CAC, CLV) to input sliders. Included dynamic indicators representing immediate strategy recommendations.
* **Interactive Chatbot Advisor:** Coded [chat_service.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/chat_service.py) on the backend. This service evaluates incoming messages, references current simulation variables, and returns context-aware checklists (e.g. for Business Turnaround, Margin Recovery) and advice for specific parameter optimization.
* **Frontend Chat Interface:** Integrated a floating chat terminal inside the What-If page with support for quick-question chips, message history, auto-scroll, and markdown rendering.

### Learning Experience
Gained expertise in building reactive simulation logic where changing client-side states instantly recalculate models without server lag. Learned how to implement keyword-driven heuristic routers for context-aware conversational bots, tailoring system outputs based on dynamic JSON payloads.

### Goals for Next Week
Build user data center views, implement secure CSV file uploading/deletion pipelines, and develop fuzzy column header detection algorithms.

### Feedback & Support Needed
Seek feedback on the tone of the chatbot replies to ensure they sound professional, actionable, and aligned with standard corporate advisory language.

### Conclusion
Developed the simulator UI page and chatbot advisor, bridging numerical data changes with conversational guides.

---

## Week 6 (July 6 – July 12)

### Introduction
The focus of Week 6 was to expand data ingest capabilities. The target was to let users upload their own custom business metrics spreadsheets, requiring secure private server folders, robust upload validation, and a fuzzy mapping service to interpret varying user column names.

### Accomplishments
* **Private Storage Manager:** Programmed [file_service.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/file_service.py) to manage files under isolated subdirectory trees mapped to MD5-hashed user email addresses.
* **Fuzzy Header Matcher:** Developed [user_ml_service.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/services/user_ml_service.py) utilizing alias lookup lists to map varied spreadsheet column headers (e.g. matching "turnover" to "revenue", or "attrition" to "churn_rate") to normalized database parameters.
* **Data Integration Endpoints:** Implemented routers in [upload_router.py](file:///c:/Users/MIlav/Desktop/MY_PROJECT/backend/api/upload_router.py) handling file upload streams, list queries, delete operations, and full ML analysis triggers.
* **User Data Center Page:** Designed [UserDataPage.jsx](file:///c:/Users/MIlav/Desktop/MY_PROJECT/frontend/src/pages/UserDataPage.jsx) featuring drag-and-drop zones, file cards with file metadata, and a custom evaluation overlay displaying SHAP summary metrics and Prophet forecasts generated from uploaded CSV files.

### Learning Experience
Gained experience in safe filesystem management, sanitizing inputs to prevent path traversal vulnerabilities. Learned to write robust parser mechanisms that handle malformed, missing, or out-of-bounds metrics by falling back to static database defaults.

### Goals for Next Week
Document manufacturing domain KPI relationships, run end-to-end regression tests across all page routers, and prepare deployment scripts.

### Feedback & Support Needed
Need dummy customer data sheets with irregular header names to test the reliability of the fuzzy parsing algorithms under edge-case scenarios.

### Conclusion
Ingestion pipelines and data management UIs were successfully implemented, allowing personalized user-data ML analyses.

---

## Week 7 (July 13 – July 16)

### Introduction
This week focused on translating abstract business metrics into physical manufacturing operations, writing industrial sensitivity guides, and validating backend routing, auth states, and UI reactivity under integration tests.

### Accomplishments
* **Manufacturing KPI Guide Mapping:** Authored the comprehensive [manufacturing_kpis_and_impacts.txt](file:///c:/Users/MIlav/Desktop/MY_PROJECT/manufacturing_kpis_and_impacts.txt) manual. This guide maps high-level simulator parameters directly to factory floor metrics:
  * *Revenue Growth:* Incremental invoices from finished product shipping.
  * *Customer Growth:* Expansion of active distribution channels and key account OEM buyers.
  * *Profit Margin:* COGS breakdown including material cost, line labor, energy overhead, and scrap.
  * *Average Order Value (AOV):* Production batch sizes and setup changeover downtime.
  * *CAC & CLV:* Prototyping cost, certifications, and multi-year supply contract yields.
* **Floor-level Drivers Analysis:** Outlined the operational impact of Overall Equipment Effectiveness (OEE), Capacity Utilization margins, Scrap & Yield rates, Inventory Turnover, and Lead Times.
* **Sensitivity Analyses Matrix:** Mapped 5 detailed cascading feedback relationships describing operational interactions (e.g., how quality/yield improvements reduce overall COGS and open capacity without new CAPEX investments).
* **System Integration Testing:** Conducted end-to-end validation of frontend navigation flows, authentication guards, user upload scopes, and chatbot conversational triggers.

### Learning Experience
Gained deep insights into B2B manufacturing operations, including supply chain bottlenecks, asset optimization strategies, and industrial metrics. Developed skills in managing complex web integrations and writing unit and integration tests.

### Goals for Next Week
Define containerization parameters (Dockerfile configurations), design structured API automation scripts, and setup sandbox environment pipelines.

### Feedback & Support Needed
Request a review from domain experts on the manufacturing guide's sensitivity assumptions to verify operational accuracy before deployment.

### Conclusion
Completed testing and manufacturing KPI mapping phase successfully; the internship is ongoing, focusing on next steps for production deployment.
