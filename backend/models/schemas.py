from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

# ─── Auth Schemas ─────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, str]

class TokenData(BaseModel):
    email: Optional[str] = None


class ScenarioInput(BaseModel):
    revenue_growth: float
    customer_growth: float
    profit_margin: float
    churn_rate: float
    marketing_spend: float
    conversion_rate: float
    aov: float
    cac: float
    clv: float
    market_growth_rate: float
    competitor_growth: float

class PredictionResponse(BaseModel):
    growth_status_code: int
    growth_status: str

class StrategyResponse(BaseModel):
    strategy: str
    explanation: str

class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float

class ForecastResponse(BaseModel):
    historical: List[Dict[str, Any]]
    forecast: List[ForecastPoint]

class ShapResponse(BaseModel):
    features: List[str]
    impacts: List[float]
    effects: List[str]

class DashboardMetricsResponse(BaseModel):
    revenue_growth: float
    customer_growth: float
    profit_margin: float
    churn_rate: float
    marketing_spend: float
    conversion_rate: float
    aov: float
    cac: float
    clv: float
    market_growth_rate: float
    competitor_growth: float
    historical_revenue: List[Dict[str, Any]]


# ─── Chat Schemas ─────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    metrics: Dict[str, float]
    strategy: Dict[str, str]
    shap: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str

