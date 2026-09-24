#!/usr/bin/env python3
"""
generate_data.py
----------------
Offline synthetic Bitcoin transaction & network metadata generator.
Generates a global transaction dataset with an India Priority Lens.
"""

import csv
import json
import random
from datetime import datetime, timedelta, timezone

def generate_synthetic_data(record_count=600):
    print(f"[*] Generating {record_count} global synthetic Bitcoin transaction & network metadata records...")

    global_countries = [
        # Country, Default ASN, Default Org, Weight
        ("US", "AS15169", "Google Cloud / Tier-1 US", 0.22),
        ("IN", "AS45609", "Bharti Airtel Ltd", 0.18), # ~18% India
        ("GB", "AS2856", "BT Group UK", 0.08),
        ("DE", "AS3320", "Deutsche Telekom AG", 0.08),
        ("SG", "AS4657", "StarHub Singapore", 0.07),
        ("AE", "AS5384", "Emirates Telecom UAE", 0.06),
        ("JP", "AS2516", "KDDI Corporation Japan", 0.06),
        ("NL", "AS1103", "SURF B.V. Netherlands", 0.05),
        ("CH", "AS3303", "Swisscom Switzerland", 0.05),
        ("KR", "AS4766", "Korea Telecom", 0.04),
        ("BR", "AS28573", "Claro Brazil", 0.04),
        ("NG", "AS37105", "MainOne Nigeria", 0.04),
        ("RU", "AS12389", "Rostelecom Russia", 0.03)
    ]

    india_states = [
        ("Tamil Nadu", "Chennai", "South", "AS45609", "Bharti Airtel Ltd", 0.25),
        ("Maharashtra", "Mumbai", "West", "AS55836", "Reliance Jio Infocomm", 0.22),
        ("Karnataka", "Bengaluru", "South", "AS24560", "Bharti Airtel Ltd", 0.18),
        ("Delhi NCR", "New Delhi", "North", "AS4755", "Tata Communications", 0.15),
        ("Telangana", "Hyderabad", "South", "AS55836", "Reliance Jio Infocomm", 0.08),
        ("Gujarat", "Ahmedabad", "West", "AS9829", "BSNL India", 0.06),
        ("West Bengal", "Kolkata", "East", "AS4755", "Tata Communications", 0.04),
        ("Kerala", "Kochi", "South", "AS9829", "BSNL India", 0.02)
    ]

    script_types = ["P2WPKH", "P2PKH", "P2SH", "TAPROOT", "P2WSH"]
    now = datetime.now(timezone.utc)

    # Pre-generate wallet pool & IP pool
    wallet_pool = [f"bc1q{random.getrandbits(48):012x}" for _ in range(250)]
    ip_pool = []
    for _ in range(120):
        oct1 = random.choice([103, 198, 185, 45, 142, 194, 203])
        ip_pool.append(f"{oct1}.{random.randint(10, 240)}.{random.randint(1, 254)}.{random.randint(1, 254)}")

    records = []
    
    # 15% targeted anomalies for evaluation
    anomaly_count = int(record_count * 0.15)
    normal_count = record_count - anomaly_count

    for i in range(record_count):
        is_anom = (i >= normal_count)
        # Select country based on global distribution
        c_tuple = random.choices(global_countries, weights=[c[3] for c in global_countries])[0]
        country = c_tuple[0]
        asn = c_tuple[1]
        org = c_tuple[2]

        is_india = (country == "IN")
        timestamp = (now - timedelta(minutes=random.randint(5, 2880))).strftime("%Y-%m-%dT%H:%M:%SZ")
        event_window_id = f"WIN_{random.randint(101, 140)}"

        # India state/city
        if is_india:
            st, city, region, ind_asn, ind_org, _ = random.choices(india_states, weights=[s[5] for s in india_states])[0]
            india_state = st
            india_city = city
            india_region = region
            asn = ind_asn
            org = ind_org
        else:
            india_state = "Not Applicable"
            india_city = "Not Applicable"
            india_region = "Not Applicable"

        # Determine transaction scope & India link type
        cross_border_flag = random.random() < 0.45
        external_country = "None"
        
        if cross_border_flag:
            foreign_candidates = [c[0] for c in global_countries if c[0] != country]
            external_country = random.choice(foreign_candidates)
            transaction_scope = "Cross-Border"
        else:
            transaction_scope = "Domestic"

        if is_india:
            if cross_border_flag:
                india_link_type = random.choice(["India Inbound", "India Outbound"])
            else:
                india_link_type = "India Domestic"
            is_india_linked = True
        else:
            if cross_border_flag and external_country == "IN":
                india_link_type = "India Inbound"
                is_india_linked = True
            elif random.random() < 0.05:
                india_link_type = "India Graph-Linked"
                is_india_linked = True
            else:
                india_link_type = "None"
                is_india_linked = False

        # Input / Output addresses & amounts
        num_inputs = random.randint(1, 3) if not is_anom else random.choice([1, 6, 8, 12])
        num_outputs = random.randint(1, 2) if not is_anom else random.choice([1, 8, 14, 20])
        
        in_addrs = random.sample(wallet_pool, min(num_inputs, len(wallet_pool)))
        out_addrs = random.sample(wallet_pool, min(num_outputs, len(wallet_pool)))

        if is_anom:
            # Behavioral anomalies: High amount or extreme fan-out or high fee ratio
            btc_amount = round(random.choice([random.uniform(2.5, 18.0), random.uniform(0.01, 0.05)]), 6)
            fee_btc = round(random.choice([random.uniform(0.0015, 0.0060), random.uniform(0.00002, 0.00008)]), 8)
            src_port = random.choice([8333, 9050, 443, 8080, random.randint(1024, 65535)])
        else:
            btc_amount = round(random.uniform(0.05, 2.5), 6)
            fee_btc = round(random.uniform(0.00005, 0.0004), 8)
            src_port = random.choice([8333, random.randint(1024, 65535)])

        fee_ratio = round(fee_btc / max(btc_amount, 0.0001), 6)
        inr_val = round(btc_amount * 7500000, 2)
        txid = f"tx_{random.getrandbits(64):016x}"
        src_ip = random.choice(ip_pool)
        dst_ip = random.choice(ip_pool)

        rec = {
            "txid": txid,
            "timestamp": timestamp,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": 8333,
            "input_addresses": ";".join(in_addrs),
            "output_addresses": ";".join(out_addrs),
            "num_inputs": num_inputs,
            "num_outputs": num_outputs,
            "amount_btc": str(btc_amount),
            "fee_btc": str(fee_btc),
            "fee_ratio": str(fee_ratio),
            "script_type": random.choice(script_types),
            "geo_country": country,
            "asn": asn,
            "organization": org,
            "india_state": india_state,
            "india_city": india_city,
            "india_region": india_region,
            "transaction_scope": transaction_scope,
            "india_link_type": india_link_type,
            "is_india_linked": "true" if is_india_linked else "false",
            "cross_border_flag": "true" if cross_border_flag else "false",
            "external_country": external_country,
            "transaction_value_inr": str(inr_val),
            "event_window_id": event_window_id,
            "synthetic_label": 1 if is_anom else 0
        }
        records.append(rec)

    with open("synthetic_transactions.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)

    print(f"[+] Successfully generated synthetic_transactions.csv with {len(records)} global records.")
    india_count = sum(1 for r in records if r["is_india_linked"] == "true")
    print(f"    - Global Countries Covered: {len(set(r['geo_country'] for r in records))}")
    print(f"    - India-linked Records (Priority Lens): {india_count} ({(india_count/len(records))*100:.1f}%)")
    print("    [!] Notice: All IP addresses, locations, and ASNs are synthetic demonstration metadata.")

if __name__ == "__main__":
    generate_synthetic_data(600)
