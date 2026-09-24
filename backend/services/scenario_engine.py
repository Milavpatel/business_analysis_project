import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from strategy_recommender import recommend_strategy_multi_factor

# ─── Feature weights for the scoring model ────────────────────────────────────
# These replicate the XGBoost training formula from ml_core.py:
#   growth_score = 0.35*revenue_growth + 0.25*customer_growth
#                + 0.20*profit_margin  - 0.20*churn_rate
# Extended with the remaining 7 features using domain-based weights.

FEATURE_WEIGHTS = {
    'revenue_growth':     0.35,
    'customer_growth':    0.25,
    'profit_margin':      0.20,
    'churn_rate':        -0.20,   # negative: higher churn = worse
    'marketing_spend':    0.03,   # small positive: more spend = slight uplift
    'conversion_rate':    0.10,
    'aov':                0.04,
    'cac':               -0.06,   # negative: higher CAC = worse
    'clv':                0.08,
    'market_growth_rate': 0.05,
    'competitor_growth': -0.04,   # negative: faster competitors = worse
}

# Normalization hints (typical realistic ranges per feature)
NORM_RANGES = {
    'revenue_growth':     (-0.30,  0.50),
    'customer_growth':    (-0.20,  0.50),
    'profit_margin':      (-0.20,  0.50),
    'churn_rate':         (0.00,   0.30),
    'marketing_spend':    (0,      50000),
    'conversion_rate':    (0.00,   0.20),
    'aov':                (10,     2000),
    'cac':                (0,      1000),
    'clv':                (0,      10000),
    'market_growth_rate': (-0.10,  0.30),
    'competitor_growth':  (-0.10,  0.30),
}


def _normalize(key: str, value: float) -> float:
    """Normalize a feature to [-1, 1] based on its realistic range."""
    lo, hi = NORM_RANGES[key]
    span = hi - lo
    if span == 0:
        return 0.0
    return max(-1.0, min(1.0, 2.0 * (value - lo) / span - 1.0))


def _compute_growth_score(input_data: dict) -> float:
    """
    Compute a continuous growth score in [-1, 1] from the 11 input features.
    Each feature is normalized then weighted.
    """
    score = 0.0
    total_weight = sum(abs(w) for w in FEATURE_WEIGHTS.values())
    for key, weight in FEATURE_WEIGHTS.items():
        val = input_data.get(key, 0.0)
        norm = _normalize(key, val)
        score += weight * norm
    # Divide by total absolute weight to keep in [-1, 1]
    return score / total_weight


def _score_to_class(score: float) -> int:
    """
    Map continuous growth score to 3-class label.
      score > 0.12  → 2 (Growing)
      score > 0.00  → 1 (Stagnant)
      else          → 0 (Declining)
    """
    if score > 0.12:
        return 2
    elif score > 0.00:
        return 1
    else:
        return 0


def _compute_shap_impacts(input_data: dict, pred_class: int) -> dict:
    """
    Compute SHAP-like marginal impacts for each feature.
    Impact = weight * normalized_value  (positive = helps growth, negative = hurts)
    Scaled so the class-2 features get positive sign and class-0 features get negative.
    """
    sign = 1 if pred_class >= 1 else -1  # flip sign for declining predictions
    features, impacts, effects = [], [], []

    for key, weight in FEATURE_WEIGHTS.items():
        val = input_data.get(key, 0.0)
        norm = _normalize(key, val)
        impact = weight * norm  # signed impact

        features.append(key)
        impacts.append(round(impact, 6))
        effects.append('Positive' if impact > 0 else 'Negative')

    # Sort by absolute impact ascending (chart shows largest bars at top)
    combined = sorted(zip(features, impacts, effects), key=lambda x: abs(x[1]))
    features_s, impacts_s, effects_s = zip(*combined) if combined else ([], [], [])

    return {
        'features': list(features_s),
        'impacts':  list(impacts_s),
        'effects':  list(effects_s),
    }


class ScenarioEngine:
    """
    Analytical scoring engine for the What-If Simulator.
    Responds to every slider change with continuously varying outputs.
    """

    def predict(self, input_data: dict) -> dict:
        score = _compute_growth_score(input_data)
        code  = _score_to_class(score)
        label_map = {0: 'Declining', 1: 'Stagnant', 2: 'Growing'}
        return {
            'growth_status_code': code,
            'growth_status':      label_map[code],
            'growth_score':       round(score, 4),   # expose score for debugging
        }

    def recommend_strategy(self, input_data: dict) -> dict:
        strategy, explanation = recommend_strategy_multi_factor(input_data)
        return {'strategy': strategy, 'explanation': explanation}

    def get_shap_values(self, input_data: dict, pred_class: int = None) -> dict:
        if pred_class is None:
            pred_class = self.predict(input_data)['growth_status_code']
        return _compute_shap_impacts(input_data, pred_class)


scenario_engine = ScenarioEngine()
