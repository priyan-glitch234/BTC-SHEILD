#!/usr/bin/env python3
"""
fetch_public_bitcoin_context.py
---------------------------------
OPTIONAL PUBLIC BLOCKCHAIN CONTEXT FETCHER (DISABLED BY DEFAULT)

IMPORTANT ETHICS & TECHNICAL NOTICE:
====================================
This optional script retrieves public, generic Bitcoin transaction metadata
from public blockchain exploration endpoints.

It DOES NOT identify Indian users, physical locations, IP addresses,
Aadhaar/PAN details, bank details, or wallet owners.

Public on-chain Bitcoin transaction records do NOT contain geographic origin
or user identity. India correlation in BTC-SHIELD / CHAINWATCH is strictly
performed on synthetic demonstration metadata during offline workflows.

NORMAL SIH DEMONSTRATION MODE IS FULLY OFFLINE USING CACHED DATA.
"""

import sys
import csv
import json
import time
import os
from datetime import datetime, timezone
import urllib.request
import urllib.error

# Configurable endpoints (Generic Public APIs - No API Key Required)
PUBLIC_ENDPOINTS = [
    "https://mempool.space/api/mempool/recent",
    "https://blockchain.info/unconfirmed-transactions?format=json"
]

OUTPUT_FILES = [
    "public_blockchain_sample.csv",
    os.path.join("public", "public_blockchain_sample.csv")
]

CSV_HEADER = [
    "txid",
    "observed_at",
    "block_time",
    "block_height",
    "confirmed",
    "fee_sats",
    "fee_btc",
    "value_sats",
    "value_btc",
    "vsize",
    "fee_rate_sat_vb",
    "input_count",
    "output_count",
    "status",
    "data_source",
    "collection_mode",
    "india_attribution_status",
    "privacy_note"
]

def print_banner():
    print("=" * 80)
    print(" BTC-SHIELD / CHAINWATCH - PUBLIC BITCOIN CONTEXT FETCHER")
    print("=" * 80)
    print(" [!] MANDATORY NOTICE:")
    print(" This optional script retrieves public generic Bitcoin transaction metadata.")
    print(" It does not identify Indian users, locations, IPs, or wallet owners.")
    print(" Public blockchain fields do not establish geographic or national attribution.")
    print("=" * 80)

def fetch_sample(timeout_sec=10):
    print("\n[*] Initializing one-shot fetch from public generic blockchain endpoints...")
    print(f"[*] Timeout configured: {timeout_sec} seconds")
    
    collected_records = []
    current_time_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    req = urllib.request.Request(
        "https://mempool.space/api/mempool/recent",
        headers={"User-Agent": "ChainWatch-Public-Context-Demo/1.0 (Research Prototype)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                for item in data:
                    txid = item.get("txid", "")
                    fee = int(item.get("fee", 0))
                    vsize = int(item.get("vsize", 200))
                    value = int(item.get("value", 0))
                    fee_rate = round(fee / max(1, vsize), 2)
                    
                    record = {
                        "txid": txid,
                        "observed_at": current_time_iso,
                        "block_time": "",
                        "block_height": "",
                        "confirmed": "false",
                        "fee_sats": str(fee),
                        "fee_btc": f"{(fee / 1e8):.8f}",
                        "value_sats": str(value),
                        "value_btc": f"{(value / 1e8):.8f}",
                        "vsize": str(vsize),
                        "fee_rate_sat_vb": str(fee_rate),
                        "input_count": "1",
                        "output_count": "2",
                        "status": "UNCONFIRMED_MEMPOOL",
                        "data_source": "Public Bitcoin Blockchain Context (Cached Demo Sample)",
                        "collection_mode": "Offline cached sample",
                        "india_attribution_status": "No verified India attribution possible from public on-chain data",
                        "privacy_note": "Public blockchain fields do not reveal verified wallet owner identity, IP address, state, city, or nationality."
                    }
                    collected_records.append(record)
    except urllib.error.URLError as e:
        print(f"[!] Network unavailable or endpoint timed out: {e}")
        return None
    except Exception as e:
        print(f"[!] Fetch encountered an issue: {e}")
        return None

    return collected_records

def main():
    print_banner()

    # Safety check: Require explicit argument to run
    if len(sys.argv) < 2 or sys.argv[1] not in ["--fetch", "--force", "-f"]:
        print("\n[i] SCRIPT IS DISABLED BY DEFAULT FOR SAFE OFFLINE DEMONSTRATION.")
        print("[i] To execute a manual one-time public context refresh with internet connection, pass:")
        print("    python fetch_public_bitcoin_context.py --fetch")
        print("\n[+] Preserving existing offline cached sample in public_blockchain_sample.csv")
        sys.exit(0)

    records = fetch_sample(timeout_sec=10)

    if not records or len(records) == 0:
        print("\n[-] Could not retrieve fresh live records (offline or endpoint unreachable).")
        print("[+] Preserving existing cached public blockchain sample.")
        print("[+] Offline demonstration mode remains active.")
        sys.exit(0)

    print(f"\n[+] Successfully retrieved {len(records)} public transaction context items.")
    for out_path in OUTPUT_FILES:
        try:
            with open(out_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_HEADER)
                writer.writeheader()
                for rec in records:
                    writer.writerow(rec)
            print(f"[+] Saved public sample to: {out_path}")
        except Exception as e:
            print(f"[!] Could not write to {out_path}: {e}")

    print("\n[+] Done. The dashboard will display this updated cached sample.")

if __name__ == "__main__":
    main()
