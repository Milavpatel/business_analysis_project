import streamlit as st
import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px

# Custom imports
from forecasting import get_revenue_forecast
from strategy_recommender import recommend_strategy_multi_factor
from ml_core import load_and_preprocess_data

st.set_page_config(page_title="Advanced Business Growth AI", layout="wide")

st.title("Advanced Business Growth AI Dashboard")

# 1. Load Data
@st.cache_data
def get_data():
    return load_and_preprocess_data()

df = get_data()
latest = df.iloc[-1]

# 2. Load Model
@st.cache_resource
def get_model():
    return joblib.load("xgb_model.joblib")

model = get_model()
features_cols = [
    'revenue_growth', 'customer_growth', 'profit_margin', 'churn_rate',
    'marketing_spend', 'conversion_rate', 'aov', 'cac', 'clv',
    'market_growth_rate', 'competitor_growth'
]

# 3. Sidebar - What-If Scenario Tester
st.sidebar.header("🛠️ What-If Scenario Tester")

def num_input(label, current_val, min_val, max_val, step=0.01):
    return st.sidebar.slider(label, float(min_val), float(max_val), float(current_val), step=step)

st.sidebar.subheader("Adjust Current Metrics")
test_revenue_growth = num_input("Revenue Growth", latest['revenue_growth'], -0.5, 1.0)
test_customer_growth = num_input("Customer Growth", latest['customer_growth'], -0.5, 1.0)
test_profit_margin = num_input("Profit Margin", latest['profit_margin'], -0.5, 0.5)
test_churn = num_input("Churn Rate", latest['churn_rate'], 0.0, 0.5)
test_marketing = st.sidebar.number_input("Marketing Spend ($)", value=float(latest['marketing_spend']), step=1000.0)
test_conversion = num_input("Conversion Rate", latest['conversion_rate'], 0.0, 0.15)
test_aov = st.sidebar.number_input("Avg Order Value ($)", value=float(latest['aov']), step=5.0)
test_cac = st.sidebar.number_input("CAC ($)", value=float(latest['cac']), step=5.0)
test_clv = st.sidebar.number_input("CLV ($)", value=float(latest['clv']), step=10.0)
test_market = num_input("Market Growth", latest['market_growth_rate'], -0.1, 0.2)
test_comp = num_input("Competitor Growth", latest['competitor_growth'], -0.1, 0.2)

# Create testing dataframe row
test_case = pd.DataFrame([{
    'revenue_growth': test_revenue_growth,
    'customer_growth': test_customer_growth,
    'profit_margin': test_profit_margin,
    'churn_rate': test_churn,
    'marketing_spend': test_marketing,
    'conversion_rate': test_conversion,
    'aov': test_aov,
    'cac': test_cac,
    'clv': test_clv,
    'market_growth_rate': test_market,
    'competitor_growth': test_comp
}])

# Prediction
pred = model.predict(test_case)[0]
label_map = {0: "Declining 📉", 1: "Stagnant ➡️", 2: "Growing 🚀"}
growth_status = label_map[pred]

# 4. KPI Cards
st.header("1. Core Business KPIs")
col1, col2, col3, col4 = st.columns(4)
col1.metric("Revenue Growth", f"{test_revenue_growth*100:.1f}%")
col2.metric("Profit Margin", f"{test_profit_margin*100:.1f}%")
col3.metric("Churn Rate", f"{test_churn*100:.1f}%")
col4.metric("CLV:CAC Ratio", f"{test_clv/test_cac if test_cac > 0 else 0:.2f}x")

# 5. Intelligent Recommendations
st.header("2. AI Strategy Engine")
rec_strategy, rec_explanation = recommend_strategy_multi_factor(test_case.iloc[0].to_dict())
st.success(f"**Recommended Strategy:** {rec_strategy}")
st.info(f"**Why?** {rec_explanation}")
st.markdown(f"### Current Model Prediction: {growth_status}")

# 6. Explainable AI (SHAP)
st.header("3. Prediction Explanation (SHAP)")
st.write("This chart explains how each metric pushed the prediction towards Growing vs Declining.")

explainer = shap.TreeExplainer(model)
shap_values = explainer(test_case)

# Plotting SHAP on Streamlit using 100% safe Plotly native rendering (bypassing Matplotlib crashes)
if len(shap_values.shape) == 3:
    vals = shap_values[0, :, pred].values
else:
    vals = shap_values[0].values

shap_df = pd.DataFrame({'Feature': features_cols, 'Impact': vals})
shap_df = shap_df.sort_values(by='Impact', key=abs, ascending=True) # Sort by absolute impact
shap_df['Effect'] = shap_df['Impact'].apply(lambda x: 'Positive' if x > 0 else 'Negative')

fig_shap = px.bar(shap_df, x='Impact', y='Feature', color='Effect', orientation='h', 
                  title='Which features drove this prediction?',
                  color_discrete_map={'Positive': 'green', 'Negative': 'red'})
st.plotly_chart(fig_shap, use_container_width=True)

# 7. Time Series Forecasting (Prophet)
st.header("4. Revenue Forecasting")
st.write("Projected revenue for the next 6 months using Facebook Prophet.")
prophet_model, forecast = get_revenue_forecast(periods=6)

fig_forecast = go.Figure()
fig_forecast.add_trace(go.Scatter(x=forecast['ds'], y=forecast['yhat'], mode='lines', name='Forecasted Revenue'))
fig_forecast.add_trace(go.Scatter(x=forecast['ds'], y=forecast['yhat_lower'], fill=None, mode='lines', line_color='rgba(0,0,0,0)', name='Lower Bound'))
fig_forecast.add_trace(go.Scatter(x=forecast['ds'], y=forecast['yhat_upper'], fill='tonexty', mode='lines', line_color='rgba(0,0,0,0)', name='Upper Bound', fillcolor='rgba(0,100,200,0.2)'))
fig_forecast.add_trace(go.Scatter(x=df['month'], y=df['revenue'], mode='markers+lines', name='Actual Revenue', line=dict(color='orange')))
fig_forecast.update_layout(title="6-Month Revenue Forecast", xaxis_title="Date", yaxis_title="Revenue ($)")

st.plotly_chart(fig_forecast, use_container_width=True)
