import pandas as pd
import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV, train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import joblib

def load_and_preprocess_data(filepath="data/business.csv"):
    df = pd.read_csv(filepath)
    df['month'] = pd.to_datetime(df['month'])
    df = df.sort_values(by='month').reset_index(drop=True)

    # Creating features
    df['revenue_growth'] = df['revenue'].pct_change()
    df['customer_growth'] = df['customer_count'].pct_change()
    df['profit_margin'] = df['profit'] / df['revenue']
    df = df.fillna(0)

    # Creating label based on growth formula
    df['growth_score'] = (
        0.35 * df['revenue_growth'] +
        0.25 * df['customer_growth'] +
        0.20 * df['profit_margin'] -
        0.20 * df['churn_rate']
    )
    
    def label_growth(score):
        if score > 0.04: return 2 # Growing
        elif score > 0.02: return 1 # Stagnant
        else: return 0 # Declining

    df['growth_label'] = df['growth_score'].apply(label_growth)
    
    return df

def train_and_save_model():
    df = load_and_preprocess_data()
    
    # Define features
    features = [
        'revenue_growth', 'customer_growth', 'profit_margin', 'churn_rate',
        'marketing_spend', 'conversion_rate', 'aov', 'cac', 'clv',
        'market_growth_rate', 'competitor_growth'
    ]
    X = df[features]
    y = df['growth_label']

    # Train/Test Split (80% train, 20% test)
    can_stratify = len(y.unique()) > 1 and y.value_counts().min() >= 2
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if can_stratify else None
    )
    
    # Hyperparameter tuning with RandomizedSearchCV
    param_grid = {
        'max_depth': [3, 4, 5, 6],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'n_estimators': [50, 100, 200],
        'subsample': [0.7, 0.8, 0.9, 1.0]
    }
    
    xgb_clf = xgb.XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='mlogloss')
    
    # Note: given the extremely small dataset, cv=2 or simply fitting directly might be needed
    cv_folds = min(3, len(X_train) // 3)
    if cv_folds < 2:
        cv_folds = 2
        
    random_search = RandomizedSearchCV(
        xgb_clf, param_distributions=param_grid, n_iter=10, 
        cv=cv_folds, random_state=42, n_jobs=-1
    )
    
    try:
        random_search.fit(X_train, y_train)
        best_model = random_search.best_estimator_
        print("Best params found:", random_search.best_params_)
    except Exception as e:
        print("Not enough data for cross validation, training directly.", str(e))
        best_model = xgb_clf
        best_model.fit(X_train, y_train)
        
    # Feature Importances
    importances = best_model.feature_importances_
    print("\n--- Feature Importances ---")
    for col, imp in zip(features, importances):
        print(f"  {col}: {imp:.4f}")

    # ── Model Efficiency Evaluation ──────────────────────────────────────────
    y_pred = best_model.predict(X_test)

    train_acc = accuracy_score(y_train, best_model.predict(X_train))
    test_acc  = accuracy_score(y_test, y_pred)

    print("\n" + "="*50)
    print("         MODEL EFFICIENCY REPORT")
    print("="*50)
    print(f"  Train Accuracy : {train_acc*100:.2f}%")
    print(f"  Test  Accuracy : {test_acc*100:.2f}%")

    # Cross-validation score on full dataset for a more robust estimate
    cv_folds_eval = min(3, len(X) // 3)
    if cv_folds_eval >= 2:
        cv_scores = cross_val_score(best_model, X, y, cv=cv_folds_eval, scoring='accuracy')
        print(f"  Cross-Val Accuracy : {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

    label_names = ['Declining', 'Stagnant', 'Growing']
    present_labels = sorted(y_test.unique())
    present_names  = [label_names[i] for i in present_labels]
    print("\n--- Classification Report (Test Set) ---")
    print(classification_report(y_test, y_pred, labels=present_labels, target_names=present_names))
    print("="*50 + "\n")
    # ────────────────────────────────────────────────────────────────────────
        
    # Save the model
    joblib.dump(best_model, "xgb_model.joblib")
    
    # Save processed base for SHAP baseline
    X.to_csv("data/processed_features.csv", index=False)
    print("Model saved to xgb_model.joblib")

if __name__ == "__main__":
    train_and_save_model()
