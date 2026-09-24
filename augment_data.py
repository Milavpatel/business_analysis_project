import pandas as pd
import numpy as np

def augment_data(input_file="data/business.csv", output_file="data/business.csv"):
    df = pd.read_csv(input_file)
    
    np.random.seed(42)  # For reproducibility
    n = len(df)
    
    # 1. Conversion Rate (percentage of traffic that converts)
    # Ranging from 2% to 6%
    df['conversion_rate'] = np.random.uniform(0.02, 0.06, n)
    
    # 2. Average Order Value (AOV)
    # Assumed around $40 - $120
    df['aov'] = np.random.uniform(40, 120, n)
    
    # 3. Customer Acquisition Cost (CAC)
    # Usually related to marketing spend and conversion rate, but we can randomize around 
    # $20 to $80 per customer.
    df['cac'] = np.random.uniform(20, 80, n)
    
    # 4. Customer Lifetime Value (CLV)
    # Typically CLV/CAC ratio of 3:1 is healthy. Randomizing a ratio between 1.5 and 4.5
    ratios = np.random.uniform(1.5, 4.5, n)
    df['clv'] = df['cac'] * ratios
    
    # 5. Market Growth Rate
    # Randomly fluctuating between -2% and 8% per month
    df['market_growth_rate'] = np.random.uniform(-0.02, 0.08, n)
    
    # 6. Competitor Benchmark Data (Competitor Revenue Growth)
    # Randomly fluctuating between -5% and 10%
    df['competitor_growth'] = np.random.uniform(-0.05, 0.10, n)
    
    df.to_csv(output_file, index=False)
    print(f"Data augmented successfully. New columns added to {output_file}")
    
if __name__ == "__main__":
    augment_data()
