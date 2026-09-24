"""
user_ml_service.py
------------------
Analyses an arbitrary user-uploaded CSV and runs the same ML pipeline
(XGBoost prediction, SHAP, Prophet forecast) as the main dashboard.

Column detection is fuzzy: common aliases are tried case-insensitively.
If a required feature cannot be found it falls back to a sensible default.
"""

import os
import sys
import numpy as np
import pandas as pd

# Allow absolute imports from the project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.ml_service import ml_service  # reuse loaded model + explainer

# ─── Column name aliases ───────────────────────────────────────────────────────
ALIASES = {
    # Raw value columns
    'revenue':          ['revenue', 'sales', 'income', 'turnover', 'gross_revenue',
                         'total_revenue', 'net_revenue', 'rev', 'total_sales',
                         'monthly_revenue', 'monthly_sales', 'gross_sales'],
    'customers':        ['customers', 'users', 'clients', 'customer_count',
                         'active_users', 'total_customers', 'subscribers',
                         'active_customers', 'num_customers', 'customer_base'],
    'profit':           ['profit', 'net_profit', 'net_income', 'earnings',
                         'gross_profit', 'operating_profit', 'net_earnings',
                         'total_profit', 'ebitda'],
    'churn_rate':       ['churn_rate', 'churn', 'attrition_rate', 'cancellation_rate',
                         'attrition', 'churn_percent', 'customer_churn', 'churn_pct'],
    'marketing_spend':  ['marketing_spend', 'marketing', 'ad_spend', 'advertising',
                         'marketing_cost', 'ads', 'marketing_budget', 'ad_budget',
                         'marketing_expense'],
    'conversion_rate':  ['conversion_rate', 'conversion', 'cvr', 'cr', 'conv_rate',
                         'conversion_pct', 'sales_conversion'],
    'aov':              ['aov', 'average_order_value', 'avg_order', 'avg_order_value',
                         'order_value', 'average_transaction', 'avg_transaction',
                         'average_sale'],
    'cac':              ['cac', 'customer_acquisition_cost', 'acquisition_cost',
                         'cost_per_acquisition', 'cost_per_customer', 'acquisition_cost'],
    'clv':              ['clv', 'ltv', 'lifetime_value', 'customer_lifetime_value',
                         'customer_ltv', 'customer_value', 'avg_customer_value', 'cltv'],
    'market_growth_rate': ['market_growth_rate', 'market_growth', 'industry_growth',
                           'market_rate', 'industry_growth_rate', 'sector_growth'],
    'competitor_growth': ['competitor_growth', 'competition_growth', 'competitor_rate',
                          'market_competition', 'competitive_growth', 'rival_growth'],
    'date':             ['date', 'month', 'period', 'time', 'year', 'ds',
                         'datetime', 'date_month', 'period_date', 'fiscal_period',
                         'reporting_date', 'report_date', 'month_year'],
    # Pre-computed rate columns (take priority over raw)
    'revenue_growth':   ['revenue_growth', 'rev_growth', 'revenue_growth_rate',
                         'revenue_change', 'sales_growth'],
    'customer_growth':  ['customer_growth', 'user_growth', 'customer_growth_rate',
                         'customer_change', 'subscriber_growth'],
    'profit_margin':    ['profit_margin', 'margin', 'profit_ratio', 'gross_margin',
                         'net_margin', 'profit_pct', 'operating_margin'],
}

# Default values used when a column cannot be detected
DEFAULTS = {
    'revenue_growth':     0.05,
    'customer_growth':    0.05,
    'profit_margin':      0.15,
    'churn_rate':         0.05,
    'marketing_spend':    5000.0,
    'conversion_rate':    0.03,
    'aov':               50.0,
    'cac':               30.0,
    'clv':              150.0,
    'market_growth_rate': 0.05,
    'competitor_growth':  0.04,
}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _normalise_col_name(name: str) -> str:
    return str(name).strip().lower().replace(' ', '_').replace('-', '_').replace('/', '_')


def _find_col(df: pd.DataFrame, aliases: list):
    """Return the first matching column name, or None."""
    norm_map = {_normalise_col_name(c): c for c in df.columns}
    for alias in aliases:
        key = _normalise_col_name(alias)
        if key in norm_map:
            return norm_map[key]
    return None


def _safe_float(val, default: float = 0.0) -> float:
    try:
        v = float(val)
        return v if np.isfinite(v) else default
    except Exception:
        return default


def _clip(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def _pct_to_ratio(val: float) -> float:
    """Convert percentage (e.g. 15.0) to ratio (0.15) if value > 1."""
    return val / 100.0 if abs(val) > 1.0 else val


# ─── Core analysis ────────────────────────────────────────────────────────────
def analyze_user_csv(filepath: str) -> dict:
    """
    Load a user CSV, detect/map columns, compute features,
    run XGBoost + SHAP + (optionally) Prophet, and return results.
    """
    df = pd.read_csv(filepath)

    # Normalise all column names in-place
    df.columns = [_normalise_col_name(c) for c in df.columns]

    # ── Column detection ──────────────────────────────────────────────────────
    col = {k: _find_col(df, v) for k, v in ALIASES.items()}

    # Sort by date if possible
    if col['date']:
        try:
            df[col['date']] = pd.to_datetime(df[col['date']], errors='coerce')
            df = df.dropna(subset=[col['date']]).sort_values(col['date']).reset_index(drop=True)
        except Exception:
            pass

    n = len(df)

    # ── Feature helpers ───────────────────────────────────────────────────────
    def latest(c):
        if c is None:
            return None
        try:
            return _safe_float(pd.to_numeric(df[c], errors='coerce').dropna().iloc[-1])
        except Exception:
            return None

    def growth_from_series(c):
        """Compute (last - prev) / |prev| from a raw value column."""
        if c is None or n < 2:
            return None
        try:
            vals = pd.to_numeric(df[c], errors='coerce').dropna().values
            if len(vals) < 2 or vals[-2] == 0:
                return None
            return (vals[-1] - vals[-2]) / abs(vals[-2])
        except Exception:
            return None

    # ── Build feature dict ────────────────────────────────────────────────────

    # revenue_growth
    if col['revenue_growth']:
        rg = _safe_float(latest(col['revenue_growth']), DEFAULTS['revenue_growth'])
        rg = _pct_to_ratio(rg)
    else:
        rg = growth_from_series(col['revenue']) or DEFAULTS['revenue_growth']
    revenue_growth = _clip(rg, -0.5, 1.0)

    # customer_growth
    if col['customer_growth']:
        cg = _safe_float(latest(col['customer_growth']), DEFAULTS['customer_growth'])
        cg = _pct_to_ratio(cg)
    else:
        cg = growth_from_series(col['customers']) or DEFAULTS['customer_growth']
    customer_growth = _clip(cg, -0.5, 1.0)

    # profit_margin
    if col['profit_margin']:
        pm = _pct_to_ratio(_safe_float(latest(col['profit_margin']), DEFAULTS['profit_margin']))
    elif col['profit'] and col['revenue']:
        rev = latest(col['revenue']) or 1
        pm = (latest(col['profit']) or 0) / rev if rev != 0 else DEFAULTS['profit_margin']
    else:
        pm = DEFAULTS['profit_margin']
    profit_margin = _clip(pm, -0.5, 0.5)

    # churn_rate
    churn_val = latest(col['churn_rate'])
    churn_rate = _clip(_pct_to_ratio(_safe_float(churn_val, DEFAULTS['churn_rate'])), 0.0, 0.5)

    # marketing_spend (keep as raw dollar value)
    marketing_spend = _safe_float(latest(col['marketing_spend']), DEFAULTS['marketing_spend'])

    # conversion_rate
    conv_val = latest(col['conversion_rate'])
    conversion_rate = _clip(_pct_to_ratio(_safe_float(conv_val, DEFAULTS['conversion_rate'])), 0.0, 0.15)

    # aov, cac, clv
    aov = _safe_float(latest(col['aov']), DEFAULTS['aov'])
    cac = _safe_float(latest(col['cac']), DEFAULTS['cac'])
    clv = _safe_float(latest(col['clv']), DEFAULTS['clv'])

    # market/competitor growth
    mkt_val = latest(col['market_growth_rate'])
    market_growth_rate = _pct_to_ratio(_safe_float(mkt_val, DEFAULTS['market_growth_rate']))

    comp_val = latest(col['competitor_growth'])
    competitor_growth = _pct_to_ratio(_safe_float(comp_val, DEFAULTS['competitor_growth']))

    features = {
        'revenue_growth':     revenue_growth,
        'customer_growth':    customer_growth,
        'profit_margin':      profit_margin,
        'churn_rate':         churn_rate,
        'marketing_spend':    marketing_spend,
        'conversion_rate':    conversion_rate,
        'aov':                aov,
        'cac':                cac,
        'clv':                clv,
        'market_growth_rate': market_growth_rate,
        'competitor_growth':  competitor_growth,
    }

    # ── ML pipeline ───────────────────────────────────────────────────────────
    prediction = ml_service.predict(features)
    strategy   = ml_service.recommend_strategy(features)
    shap_result = ml_service.get_shap_values(features, pred_class=None)

    # ── Prophet forecast (only if date + revenue columns exist with ≥3 rows) ──
    forecast_result = None
    if col['date'] and col['revenue'] and n >= 3:
        try:
            from prophet import Prophet  # lazy import to avoid startup cost
            prophet_df = pd.DataFrame({
                'ds': df[col['date']],
                'y':  pd.to_numeric(df[col['revenue']], errors='coerce'),
            }).dropna()
            if len(prophet_df) >= 3:
                m = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=False,
                    daily_seasonality=False
                )
                m.fit(prophet_df)
                future   = m.make_future_dataframe(periods=6, freq='ME')
                forecast = m.predict(future)
                forecast['ds'] = forecast['ds'].dt.strftime('%Y-%m-%d')
                forecast_points = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records')
                hist = prophet_df.copy()
                hist['ds'] = hist['ds'].dt.strftime('%Y-%m-%d')
                historical_records = hist.rename(columns={'ds': 'month', 'y': 'revenue'}).to_dict('records')
                forecast_result = {
                    'historical': historical_records,
                    'forecast':   forecast_points,
                }
        except Exception as exc:
            print(f"[user_ml] Prophet skipped: {exc}")

    # ── Detected columns summary for the frontend ─────────────────────────────
    detected = {k: v for k, v in col.items() if v is not None}
    detected['total_rows'] = n

    return {
        'metrics':          features,
        'prediction':       prediction,
        'strategy':         strategy,
        'shap':             shap_result,
        'forecast':         forecast_result,
        'detected_columns': detected,
        'filename':         os.path.basename(filepath),
    }
