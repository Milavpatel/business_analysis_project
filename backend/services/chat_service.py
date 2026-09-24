import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("chat_service")

# Try initializing OpenAI SDK
OPENAI_AVAILABLE = False
openai_client = None

try:
    from openai import OpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and not api_key.startswith("your_"):
        openai_client = OpenAI(api_key=api_key)
        OPENAI_AVAILABLE = True
        logger.info("OpenAI client initialized successfully.")
    else:
        logger.info("OPENAI_API_KEY not set or is placeholder. Fallback active.")
except Exception as err:
    logger.warning(f"Could not initialize OpenAI SDK: {err}. Fallback active.")


def format_pct(val: float) -> str:
    return f"{val * 100:.1f}%"

def format_usd(val: float) -> str:
    return f"${val:,.0f}"

def _safe_float(val, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


class ChatService:
    def get_reply(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        metrics: Dict[str, float] = None,
        strategy: Dict[str, str] = None,
        shap: Dict[str, Any] = None
    ) -> str:
        metrics = metrics or {}
        strategy = strategy or {}
        history = history or []

        provider = os.getenv("LLM_PROVIDER", "auto").lower()

        # 1. Attempt Ollama if specified or enabled
        if provider in ["ollama", "local", "auto"]:
            try:
                ollama_reply = self._get_ollama_reply(message, history, metrics, strategy, shap)
                if ollama_reply:
                    return ollama_reply
            except Exception as exc:
                if provider == "ollama":
                    logger.error(f"Ollama completion error: {exc}")
                else:
                    logger.debug(f"Ollama not running or unreachable: {exc}")

        # 2. Attempt OpenAI response if key configured
        if openai_client:
            try:
                reply = self._get_openai_reply(message, history, metrics, strategy, shap)
                if reply:
                    return reply
            except Exception as exc:
                logger.error(f"OpenAI completion error: {exc}. Falling back to local advisor engine.")

        # 3. Fallback to local rule-based advisor engine
        return self._get_fallback_reply(message, metrics, strategy, shap)

    def _build_system_prompt(
        self,
        metrics: Dict[str, float],
        strategy: Dict[str, str],
        shap: Dict[str, Any]
    ) -> str:
        rg = _safe_float(metrics.get('revenue_growth'), 0.0)
        cg = _safe_float(metrics.get('customer_growth'), 0.0)
        pm = _safe_float(metrics.get('profit_margin'), 0.0)
        cr = _safe_float(metrics.get('churn_rate'), 0.0)
        ms = _safe_float(metrics.get('marketing_spend'), 0.0)
        cvr = _safe_float(metrics.get('conversion_rate'), 0.0)
        aov = _safe_float(metrics.get('aov'), 0.0)
        cac = _safe_float(metrics.get('cac'), 0.0)
        clv = _safe_float(metrics.get('clv'), 0.0)
        mgr = _safe_float(metrics.get('market_growth_rate'), 0.0)
        comp = _safe_float(metrics.get('competitor_growth'), 0.0)
        clv_cac = (clv / cac) if cac > 0 else 0.0

        strat_name = strategy.get("strategy", "Steady-State Optimization")
        strat_exp = strategy.get("explanation", "")

        shap_summary = "No SHAP analysis available."
        if shap and shap.get("features"):
            feats = shap.get("features", [])
            impacts = shap.get("impacts", [])
            effects = shap.get("effects", [])
            drivers = [
                f"{f} ({e}): impact score {imp:+.4f}"
                for f, imp, e in zip(feats, impacts, effects)
            ]
            shap_summary = "; ".join(drivers)

        return f"""You are an elite C-Suite AI Strategy & SaaS Growth Advisor embedded inside a Corporate Growth Intelligence Platform.
Your mission is to provide sharp, actionable, executive-grade advice based on the company's real-time baseline data and machine learning analytics.

### COMPANY PERFORMANCE METRICS & HISTORICAL CONTEXT:
- Revenue Growth: {format_pct(rg)} (YoY)
- Customer Growth: {format_pct(cg)} (YoY)
- Net Profit Margin: {format_pct(pm)}
- Monthly Churn Rate: {format_pct(cr)}
- Marketing Spend: {format_usd(ms)} / month
- Lead Conversion Rate: {format_pct(cvr)}
- Average Order Value (AOV): {format_usd(aov)}
- Customer Acquisition Cost (CAC): {format_usd(cac)}
- Customer Lifetime Value (CLV): {format_usd(clv)}
- CLV to CAC Ratio: {clv_cac:.2f}x
- Market Expansion Rate: {format_pct(mgr)}
- Competitor Growth Rate: {format_pct(comp)}

### ML RECOMMENDED STRATEGY:
- Strategy Title: **{strat_name}**
- Strategy Rationale & Explanation: {strat_exp}

### SHAP CAUSAL ATTRIBUTION WEIGHTS:
- Feature Drivers: {shap_summary}

### RESPONSE INSTRUCTIONS:
1. Provide highly specific, data-driven answers that directly reference the user's metrics (e.g. churn rate of {format_pct(cr)}, CLV:CAC ratio of {clv_cac:.2f}x).
2. Format your response cleanly using GitHub-flavored Markdown. Use bold headers (###), bullet lists (- ), and action checklists (- [ ]) when appropriate.
3. Keep your response clear, structured, professional, and actionable.
"""

    def _get_ollama_reply(
        self,
        message: str,
        history: List[Dict[str, str]],
        metrics: Dict[str, float],
        strategy: Dict[str, str],
        shap: Dict[str, Any]
    ) -> Optional[str]:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        model = os.getenv("OLLAMA_MODEL", "llama3.2")

        system_prompt = self._build_system_prompt(metrics, strategy, shap)

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7
            }
        }

        # Try base_url first, then fallback to 127.0.0.1 if localhost failed
        urls_to_try = [f"{base_url}/api/chat"]
        if "localhost" in base_url:
            urls_to_try.append(f"{base_url.replace('localhost', '127.0.0.1')}/api/chat")
        elif "127.0.0.1" not in base_url:
            urls_to_try.append("http://127.0.0.1:11434/api/chat")

        last_error = None
        for endpoint in urls_to_try:
            try:
                req = urllib.request.Request(
                    endpoint,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = data.get("message", {}).get("content")
                    if content:
                        logger.info(f"Successfully generated Ollama response using model '{model}'")
                        return content
            except Exception as e:
                last_error = e
                logger.warning(f"Ollama request to {endpoint} failed: {e}")

        if last_error:
            raise last_error
        return None

    def _get_openai_reply(
        self,
        message: str,
        history: List[Dict[str, str]],
        metrics: Dict[str, float],
        strategy: Dict[str, str],
        shap: Dict[str, Any]
    ) -> Optional[str]:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        system_prompt = self._build_system_prompt(metrics, strategy, shap)

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        completion = openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )

        return completion.choices[0].message.content

    def _get_fallback_reply(
        self,
        message: str,
        metrics: Dict[str, float],
        strategy: Dict[str, str],
        shap: Dict[str, Any] = None
    ) -> str:
        msg = message.lower().strip()
        strat_name = strategy.get("strategy", "Steady-State Optimization")
        strat_explanation = strategy.get("explanation", "")

        rg = _safe_float(metrics.get('revenue_growth'), 0.0)
        cg = _safe_float(metrics.get('customer_growth'), 0.0)
        pm = _safe_float(metrics.get('profit_margin'), 0.0)
        cr = _safe_float(metrics.get('churn_rate'), 0.0)
        ms = _safe_float(metrics.get('marketing_spend'), 0.0)
        cvr = _safe_float(metrics.get('conversion_rate'), 0.0)
        aov = _safe_float(metrics.get('aov'), 0.0)
        cac = _safe_float(metrics.get('cac'), 0.0)
        clv = _safe_float(metrics.get('clv'), 0.0)
        clv_cac = (clv / cac) if cac > 0 else 10.0

        checklists = {
            "Business Turnaround": [
                "Freeze all non-essential marketing spend and software subscriptions to preserve cash.",
                "Segment customers by gross margin and identify the top 20% high-value accounts to protect.",
                "Schedule one-on-one calls with top 5 customers this week to ensure they are happy and address issues.",
                "Establish weekly cash runway monitoring and build a strict 90-day cash survival plan."
            ],
            "Retention Crisis Response": [
                "Audit user activity logs from the last 30 days to pinpoint exactly where users stop active usage.",
                "Set up automated email alerts in your system for accounts that have been idle for more than 7 days.",
                "Call 10 recently canceled accounts to gather direct feedback on why they left.",
                "Design and launch a loyalty discount or annual lock-in promotion to retain high-risk users."
            ]
        }

        # 1. CHECKLIST INTENT
        if any(w in msg for w in ["checklist", "action", "step", "todo", "to-do", "implement", "execute", "playbook", "start"]):
            lst = checklists.get(strat_name, [
                "Review recommended strategy guidelines.",
                "Identify the metrics with the highest drag in SHAP and optimize them first.",
                "Align team KPIs around current strategy goals."
            ])
            reply = f"### 📋 Action Checklist for **{strat_name}**\n"
            reply += "Here is your immediate operational playbook:\n\n"
            for item in lst:
                reply += f"- [ ] **{item}**\n"
            reply += f"\n*Tailored to your strategy based on Revenue Growth ({format_pct(rg)}), Churn ({format_pct(cr)}), and Profit Margin ({format_pct(pm)}).* "
            return reply

        # 2. RATIONALE INTENT
        if any(w in msg for w in ["why", "reason", "because", "rationale", "chose", "criteria", "factor"]):
            reply = f"### 🧠 Strategy Rationale: **{strat_name}**\n\n"
            reply += f"Recommended **{strat_name}** based on your current metrics:\n\n"
            reply += f"- **Revenue Growth:** {format_pct(rg)}\n"
            reply += f"- **Churn Rate:** {format_pct(cr)}\n"
            reply += f"- **Profit Margin:** {format_pct(pm)}\n"
            reply += f"- **CLV:CAC:** {clv_cac:.2f}x\n\n"
            reply += f"**Strategy Explanation:** {strat_explanation}\n"
            return reply

        # 3. GREETING / DEFAULT
        return (
            f"Hello! I am your **AI Strategy Copilot**. I have analyzed your metrics and recommend the **{strat_name}** strategy.\n\n"
            "Ask me any question about your data history, checklist actions, metric drivers, or risk analysis!"
        )


chat_service = ChatService()
