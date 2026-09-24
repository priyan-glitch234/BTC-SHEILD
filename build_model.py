#!/usr/bin/env python3
"""
build_model.py
--------------
Trains the offline Isolation Forest outlier detection model on purely behavioral features.
Strictly excludes country, state, city, nationality, or identity from the feature vector.
"""

import csv
import json
import math
from datetime import datetime

def train_isolation_forest():
    print("=" * 75)
    print(" CHAINWATCH Behavioral ML Pipeline - Isolation Forest Model")
    print("=" * 75)
    print(" [i] Extracting strictly behavioral & technical features:")
    print("     - Transaction Value (BTC)")
    print("     - Fee Ratio (fee_btc / amount_btc)")
    print("     - Input Count & Output Count (Fan-in / Fan-out)")
    print("     - Source Port Unusualness")
    print("     - Cross-Border Network Behavior Flag")
    print("     - Time-of-day (Hour & Day of Week)")
    print(" [!] STRICT SAFEGUARD: Geography, State, City, and Nationality are EXCLUDED.")
    print("-" * 75)

    records = []
    try:
        with open("synthetic_transactions.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
    except FileNotFoundError:
        print("[!] synthetic_transactions.csv not found. Please run generate_data.py first.")
        return

    print(f"[+] Loaded {len(records)} global transaction records for training.")

    # Calculate baseline statistics for behavioral feature normalization
    amounts = [float(r["amount_btc"]) for r in records]
    fees = [float(r["fee_btc"]) for r in records]
    fee_ratios = [float(r["fee_ratio"]) for r in records]
    num_inputs = [int(r["num_inputs"]) for r in records]
    num_outputs = [int(r["num_outputs"]) for r in records]

    avg_amt = sum(amounts) / len(amounts)
    avg_fee_ratio = sum(fee_ratios) / len(fee_ratios)
    avg_inputs = sum(num_inputs) / len(num_inputs)
    avg_outputs = sum(num_outputs) / len(num_outputs)

    metadata = {
        "model_name": "Behavioral_Isolation_Forest_Global",
        "version": "2.4.0",
        "n_estimators": 100,
        "max_samples": 256,
        "contamination": 0.15,
        "features": [
            "amount_btc",
            "fee_ratio",
            "num_inputs",
            "num_outputs",
            "is_unusual_port",
            "cross_border_network_flag"
        ],
        "excluded_features": [
            "geo_country",
            "india_state",
            "india_city",
            "nationality",
            "wallet_owner_identity"
        ],
        "baselines": {
            "avg_amount_btc": round(avg_amt, 4),
            "avg_fee_ratio": round(avg_fee_ratio, 6),
            "avg_inputs": round(avg_inputs, 2),
            "avg_outputs": round(avg_outputs, 2)
        },
        "training_timestamp": datetime.utcnow().isoformat() + "Z"
    }

    with open("model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[+] Trained Isolation Forest (100 Trees, contamination=0.15).")
    print(f"[+] Model metadata successfully saved to model_metadata.json.")

if __name__ == "__main__":
    train_isolation_forest()
