import pandas as pd
from prophet import Prophet

def get_revenue_forecast(filepath="data/business.csv", periods=6):
    df = pd.read_csv(filepath)
    df['month'] = pd.to_datetime(df['month'])
    
    # Prophet requires 'ds' for datetime and 'y' for the target metric
    prophet_df = df[['month', 'revenue']].rename(columns={'month': 'ds', 'revenue': 'y'})
    
    m = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    m.fit(prophet_df)
    
    # Forecast future periods (months)
    future = m.make_future_dataframe(periods=periods, freq='ME') 
    forecast = m.predict(future)
    
    # Returning the forecast dataframe for plotting
    return m, forecast

if __name__ == "__main__":
    model, forecast = get_revenue_forecast()
    print(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(6))
