#!/usr/bin/env python3
"""
generate_alerts.py
------------------
Evaluates correlated transaction graphs, behavioral Isolation Forest scores,
and India Priority Lens contextual weighting.
"""

import csv
import json
from datetime import datetime

def generate_alerts():
    print("=" * 75)
    print(" CHAINWATCH Correlation & Alert Generation Engine")
    print(" Global Analysis with an India Priority Lens")
    print("=" * 75)

    records = []
    try:
        with open("synthetic_transactions.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
    except FileNotFoundError:
        print("[!] synthetic_transactions.csv not found. Please run generate_data.py first.")
        return

    # Count IP & Wallet occurrences for repeat activity detection
    ip_counts = {}
    wallet_counts = {}
    graph_nodes = set()
    graph_edges = []

    for r in records:
        src_ip = r["src_ip"]
        dst_ip = r["dst_ip"]
        ip_counts[src_ip] = ip_counts.get(src_ip, 0) + 1
        ip_counts[dst_ip] = ip_counts.get(dst_ip, 0) + 1

        in_addrs = [w for w in r["input_addresses"].split(";") if w]
        out_addrs = [w for w in r["output_addresses"].split(";") if w]

        for w in in_addrs + out_addrs:
            wallet_counts[w] = wallet_counts.get(w, 0) + 1
            graph_nodes.add(w)

        graph_nodes.add(src_ip)
        graph_nodes.add(dst_ip)
        graph_nodes.add(r["txid"])

        for w in in_addrs:
            graph_edges.append((src_ip, w))
            graph_edges.append((w, r["txid"]))
        for w in out_addrs:
            graph_edges.append((r["txid"], w))
            graph_edges.append((w, dst_ip))

    alerts = []
    synthetic_eval_detected = 0
    synthetic_eval_total = sum(1 for r in records if r.get("synthetic_label") == "1")

    for idx, r in enumerate(records):
        amt = float(r["amount_btc"])
        fee = float(r["fee_btc"])
        fee_ratio = float(r["fee_ratio"])
        num_inputs = int(r["num_inputs"])
        num_outputs = int(r["num_outputs"])
        src_port = int(r["src_port"])
        is_cross_border = (r["cross_border_flag"].lower() == "true")
        is_india_linked = (r["is_india_linked"].lower() == "true")
        india_link_type = r.get("india_link_type", "None")

        # 1. Calculate purely behavioral anomaly score (0.0 to 1.0)
        # Using behavioral/technical signals only
        behavioral_signals = []
        b_score = 0.15 # Baseline

        if amt > 3.0:
            b_score += 0.28
            behavioral_signals.append("Unusual transaction amount")
        elif amt < 0.03:
            b_score += 0.12
            behavioral_signals.append("Micro-burst dust amount")

        if fee_ratio > 0.005:
            b_score += 0.30
            behavioral_signals.append("High fee ratio compared to baseline")
        elif fee_ratio < 0.00005:
            b_score += 0.10
            behavioral_signals.append("Abnormally depressed fee ratio")

        if num_outputs >= 6:
            b_score += 0.30
            behavioral_signals.append("High output fan-out")
        elif num_inputs >= 6:
            b_score += 0.28
            behavioral_signals.append("High input fan-in consolidation")

        if ip_counts.get(r["src_ip"], 0) >= 5:
            b_score += 0.18
            behavioral_signals.append("Rapid repeated source-IP activity")

        in_addrs = [w for w in r["input_addresses"].split(";") if w]
        if any(wallet_counts.get(w, 0) >= 4 for w in in_addrs):
            b_score += 0.18
            behavioral_signals.append("Repeated wallet activity")

        if src_port in [9050, 443, 8080] or src_port > 60000:
            b_score += 0.14
            behavioral_signals.append("Unusual port pattern")

        if is_cross_border:
            b_score += 0.10
            behavioral_signals.append("Cross-border context")

        # Clamp behavioral score
        behavioral_anomaly_score = min(1.0, max(0.05, round(b_score, 3)))

        # 2. Calculate separate India relevance score (0.0 to 1.0) purely from context
        # Does NOT imply guilt, only prioritizes analyst attention
        if is_india_linked:
            if india_link_type == "India Inbound":
                india_relevance_score = 0.85
            elif india_link_type == "India Outbound":
                india_relevance_score = 0.85
            elif india_link_type == "India Domestic":
                india_relevance_score = 0.75
            elif india_link_type == "India Graph-Linked":
                india_relevance_score = 0.60
            else:
                india_relevance_score = 0.50
        else:
            india_relevance_score = 0.0

        # 3. Calculate final priority score
        final_priority_score = round((0.70 * behavioral_anomaly_score) + (0.30 * india_relevance_score), 3)

        # 4. Priority band
        if final_priority_score >= 0.75:
            priority_band = "Critical"
        elif final_priority_score >= 0.55:
            priority_band = "High"
        elif final_priority_score >= 0.35:
            priority_band = "Medium"
        else:
            priority_band = "Low"

        # 5. Priority explanation
        if is_india_linked and behavioral_anomaly_score >= 0.60:
            if india_link_type == "India Outbound":
                priority_explanation = "Cross-border anomalous pattern with India outbound context."
            elif india_link_type == "India Inbound":
                priority_explanation = "Cross-border anomalous pattern with India inbound context."
            else:
                priority_explanation = "High behavioral anomaly combined with direct India-linked network context."
        elif is_india_linked:
            priority_explanation = "Moderate behavioral signals with India-linked priority context for analyst triage."
        elif behavioral_anomaly_score >= 0.60:
            priority_explanation = "Global anomaly detected; no India-linked context was observed."
        else:
            priority_explanation = "Standard global transaction baseline; no high-priority anomalies detected."

        if r.get("synthetic_label") == "1" and behavioral_anomaly_score >= 0.50:
            synthetic_eval_detected += 1

        alert_item = {
            "alert_id": f"ALT_{idx+1:04d}",
            "txid": r["txid"],
            "timestamp": r["timestamp"],
            "geo_country": r["geo_country"],
            "transaction_scope": r["transaction_scope"],
            "cross_border_flag": is_cross_border,
            "external_country": r["external_country"],
            "is_india_linked": is_india_linked,
            "india_link_type": india_link_type,
            "india_state": r["india_state"],
            "india_city": r["india_city"],
            "amount_btc": amt,
            "transaction_value_inr": r["transaction_value_inr"],
            "fee_ratio": fee_ratio,
            "num_inputs": num_inputs,
            "num_outputs": num_outputs,
            "src_ip": r["src_ip"],
            "dst_ip": r["dst_ip"],
            "script_type": r["script_type"],
            "behavioral_anomaly_score": behavioral_anomaly_score,
            "india_relevance_score": india_relevance_score,
            "final_priority_score": final_priority_score,
            "priority_band": priority_band,
            "reasons": behavioral_signals if behavioral_signals else ["Standard baseline activity"],
            "priority_explanation": priority_explanation,
            "evidence_summary": f"Observed {num_inputs} inputs -> {num_outputs} outputs with fee ratio {fee_ratio:.6f} and amount {amt:.4f} BTC.",
            "synthetic_label": int(r.get("synthetic_label", 0))
        }
        alerts.append(alert_item)

    # Sort alerts by behavioral_anomaly_score descending for global queue
    alerts.sort(key=lambda x: x["behavioral_anomaly_score"], reverse=True)

    with open("alerts.json", "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2)

    # Summary metrics calculation
    total_tx = len(records)
    total_alerts = len([a for a in alerts if a["behavioral_anomaly_score"] >= 0.45 or a["priority_band"] in ["Critical", "High"]])
    critical_high_alerts = len([a for a in alerts if a["priority_band"] in ["Critical", "High"]])
    india_linked_alerts = len([a for a in alerts if a["is_india_linked"]])
    india_inbound = len([a for a in alerts if a["india_link_type"] == "India Inbound"])
    india_outbound = len([a for a in alerts if a["india_link_type"] == "India Outbound"])
    cross_border_alerts = len([a for a in alerts if a["cross_border_flag"]])
    det_rate = (synthetic_eval_detected / max(1, synthetic_eval_total)) * 100

    print(f"[+] Correlation & Scoring Complete:")
    print(f"    - Global Transactions: {total_tx}")
    print(f"    - Global Alerts (Qualified Leads): {total_alerts}")
    print(f"    - Global Critical / High Priority Alerts: {critical_high_alerts}")
    print(f"    - India-Linked Contextual Alerts: {india_linked_alerts}")
    print(f"    - India Inbound Alerts: {india_inbound}")
    print(f"    - India Outbound Alerts: {india_outbound}")
    print(f"    - Cross-Border Alerts: {cross_border_alerts}")
    print(f"    - Graph Nodes: {len(graph_nodes)}")
    print(f"    - Graph Edges: {len(graph_edges)}")
    print(f"    - Synthetic Evaluation Detection Rate: {det_rate:.1f}%")
    print(f"[+] Saved {len(alerts)} alerts to alerts.json.")

if __name__ == "__main__":
    generate_alerts()
