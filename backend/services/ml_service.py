import sys
import os
import pandas as pd
import joblib
import shap

# Add parent directory to path to import existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from strategy_recommender import recommend_strategy_multi_factor

class MLService:
    def __init__(self):
        # Initialize paths relative to the root project
        self.root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.model_path = os.path.join(self.root_dir, "xgb_model.joblib")
        
        self.model = joblib.load(self.model_path)
        self.features_cols = [
            'revenue_growth', 'customer_growth', 'profit_margin', 'churn_rate',
            'marketing_spend', 'conversion_rate', 'aov', 'cac', 'clv',
            'market_growth_rate', 'competitor_growth'
        ]
        self.explainer = shap.TreeExplainer(self.model)

    def predict(self, input_data: dict):
        # Enforce exact column order matching training
        test_case = pd.DataFrame([input_data])[self.features_cols]
        pred = self.model.predict(test_case)[0]
        
        label_map = {0: "Declining", 1: "Stagnant", 2: "Growing"}
        growth_status = label_map.get(int(pred), "Unknown")
        
        return {
            "growth_status_code": int(pred),
            "growth_status": growth_status
        }
        
    def recommend_strategy(self, input_data: dict):
        rec_strategy, rec_explanation = recommend_strategy_multi_factor(input_data)
        return {
            "strategy": rec_strategy,
            "explanation": rec_explanation
        }

    def get_shap_values(self, input_data: dict, pred_class: int = None):
        # Enforce exact column order matching training
        test_case = pd.DataFrame([input_data])[self.features_cols]
        shap_values = self.explainer(test_case)

        # Resolve pred_class internally if not provided
        if pred_class is None:
            pred_class = int(self.model.predict(test_case)[0])
        
        if len(shap_values.shape) == 3:
            vals = shap_values[0, :, pred_class].values
        else:
            vals = shap_values[0].values
            
        shap_df = pd.DataFrame({'Feature': self.features_cols, 'Impact': vals})
        shap_df = shap_df.sort_values(by='Impact', key=abs, ascending=True)
        shap_df['Effect'] = shap_df['Impact'].apply(lambda x: 'Positive' if x > 0 else 'Negative')
        
        return {
            "features": shap_df['Feature'].tolist(),
            "impacts": shap_df['Impact'].tolist(),
            "effects": shap_df['Effect'].tolist()
        }

ml_service = MLService()
