from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.services.auth_service import decode_token
from backend.services.file_service import save_file, list_files, get_file_path, delete_file
from backend.services.user_ml_service import analyze_user_csv
from backend.models.schemas import ScenarioInput, ChatRequest, ChatResponse

upload_router = APIRouter(prefix="/data", tags=["user-data"])
_bearer = HTTPBearer(auto_error=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ─── Auth dependency ──────────────────────────────────────────────────────────
def get_current_email(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer)
) -> str:
    email = decode_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return email


# ─── Endpoints ────────────────────────────────────────────────────────────────

@upload_router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    email: str = Depends(get_current_email),
):
    """Upload a CSV file to the authenticated user's private storage."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB).")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        meta = save_file(email, file.filename, content)
        return {"success": True, "file": meta}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@upload_router.get("/files")
def list_user_files(email: str = Depends(get_current_email)):
    """List all CSV files uploaded by the authenticated user."""
    return {"files": list_files(email)}


@upload_router.delete("/files/{filename}")
def delete_user_file(filename: str, email: str = Depends(get_current_email)):
    """Delete one of the authenticated user's files."""
    try:
        delete_file(email, filename)
        return {"success": True}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@upload_router.get("/analyze/{filename}")
def analyze_user_file(filename: str, email: str = Depends(get_current_email)):
    """
    Run the full ML analysis (XGBoost, SHAP, Prophet) on one of the
    authenticated user's uploaded CSV files.
    """
    try:
        filepath = get_file_path(email, filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        result = analyze_user_csv(filepath)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@upload_router.post("/simulate")
def simulate_scenario(
    input_data: ScenarioInput,
    email: str = Depends(get_current_email)
):
    """
    Run the analytical scenario engine (prediction, SHAP-like impacts, strategy)
    on dynamic user-defined inputs. Uses a weighted scoring model that responds
    continuously to every input change.
    """
    try:
        from backend.services.scenario_engine import scenario_engine
        features    = input_data.model_dump()
        prediction  = scenario_engine.predict(features)
        strategy    = scenario_engine.recommend_strategy(features)
        shap_result = scenario_engine.get_shap_values(features, pred_class=prediction["growth_status_code"])

        return {
            "prediction": prediction,
            "strategy":   strategy,
            "shap":       shap_result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@upload_router.post("/chat", response_model=ChatResponse)
def chat_with_advisor(
    request: ChatRequest,
    email: str = Depends(get_current_email)
):
    """
    Provide interactive, context-aware business growth recommendations 
    tailored to the user's current simulation metrics, strategy, and SHAP drivers.
    """
    try:
        from backend.services.chat_service import chat_service
        reply = chat_service.get_reply(
            message=request.message,
            history=[h.model_dump() for h in request.history] if request.history else [],
            metrics=request.metrics,
            strategy=request.strategy,
            shap=request.shap
        )
        return {"reply": reply}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
