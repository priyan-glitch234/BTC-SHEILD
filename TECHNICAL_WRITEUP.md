# BTC-SHIELD / CHAINWATCH: Technical Architecture & System Writeup
## Bitcoin Transaction Traffic Intelligence & Anomaly Monitoring Platform
### Smart India Hackathon (SIH) — Problem Statement 26146

---

## 1. Executive Summary & Problem Scope

**Problem Statement 26146** addresses the challenges cyber law enforcement, national cyber defense agencies, and financial intelligence units face when monitoring high-risk cryptocurrency transaction patterns.

**BTC-SHIELD (CHAINWATCH)** is an offline-compatible intelligence prototype designed to:
1. Ingest multidimensional network and transaction flow vectors.
2. Uncover obfuscation topologies (peel chains, tumbling cycles, fan-out bursts, rapid consolidation).
3. Apply unsupervised machine learning (**Isolation Forest** and **DBSCAN**) without geographic bias to score anomalous behavioral patterns.
4. Provide structured, explainable investigation dossiers to prioritize investigative leads for human analysts.

---

## 2. Data Sources, Hygiene, and Limitations

### A. The Hybrid Architecture
The system intentionally separates operational demonstration data from public on-chain context:

```
+-----------------------------------------------------------------------------------+
|                            HYBRID ARCHITECTURAL MODEL                             |
+----------------------------------------------------+------------------------------+
| 1. SYNTHETIC INDIA OPERATIONS METADATA             | 2. PUBLIC BLOCKCHAIN CONTEXT |
| (Problem Statement 26146 Demonstration)            | (Generic On-Chain Baseline)  |
+----------------------------------------------------+------------------------------+
| - Synthetic Indian States, Cities, & UTs           | - Real/Generic TXID Hashes   |
| - Synthetic ISP Autonomous System Numbers (ASNs)   | - Block Height & Block Time  |
| - Synthetic IPv4/IPv6 Nodes                        | - Virtual Size (vSize)       |
| - INR Fiat Benchmark Conversions                   | - Fees (sats & btc)          |
| - Corridor Classifications (Inbound / Outbound)    | - Input & Output Counts      |
| - Controlled Anomaly Injectors                     | - Confirmation Status        |
+----------------------------------------------------+------------------------------+
|                           [ STRICT SEPARATION BOUNDARY ]                          |
|  * Public blockchain data is NEVER merged with or attributed to Indian identities  |
|  * Real-world identity/location attribution is strictly not performed             |
+-----------------------------------------------------------------------------------+
```

### B. Limitations & Non-Attribution Rules
1. **Public Bitcoin Data Contains No Geographic or Personal Identity**: On-chain Bitcoin transactions contain cryptographic keys, script signatures, and UTXOs. They do not encode IP addresses, national identity, or geographical coordinates.
2. **Synthetic Data for Safe Demonstration**: All references to Indian states (e.g. Tamil Nadu, Maharashtra, Karnataka, Delhi NCR), telecom ASNs, and individual IP endpoints are synthetic test vectors designed to demonstrate analytics workflows without exposing real citizens or private entities.
3. **Lead Prioritization vs. Evidence**: The output of the machine learning pipeline is an **investigative lead prioritization score**, not legal proof of illicit activity.
4. **Lawful Interception Requirements**: Real-world attribution would require formal legal processes, lawful data-sharing treaties, and court-authorized subpoenas to Virtual Asset Service Providers (VASPs) and Internet Service Providers (ISPs).

---

## 3. Machine Learning & Behavioral Detection Pipeline

### Unbiased Feature Vectorization
To prevent demographic or geographic bias, all machine learning models operate strictly on mathematical and topological metrics:

| Feature Name | Description | Forensic Purpose |
| :--- | :--- | :--- |
| `amount_btc` | Total transaction value in BTC | Detects high-value liquidity shifts |
| `fee_rate_sat_vb` | Satoshis per virtual byte | Identifies urgent mempool bidding |
| `fan_out_degree` | Number of distinct destination outputs | Detects peel chains and scattering |
| `fan_in_degree` | Number of aggregated inputs | Identifies consolidation wallets |
| `velocity_hops_hour` | Hop rate per unit time | Flags rapid laundering movement |
| `burst_interval_sec` | Inter-arrival time of related TXs | Identifies automated script botnets |
| `fee_to_volume_ratio` | Fee percentage of principal | Flags tumbler/mixer economics |
| `cycle_depth` | Recurrence of funds to prior addresses | Uncovers circular wash transactions |

### Isolation Forest Outlier Engine
- **Algorithm**: Ensembles of 100 isolation trees (`iTrees`) built on subsamples of 256 records.
- **Scoring Function**:
  $$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
  Where $h(x)$ is path length and $c(n)$ is average path length of unsuccessful searches in Binary Search Trees.
- **Contamination Parameter**: Configured to 0.15 for high sensitivity to multi-hop obfuscation patterns.

### DBSCAN Entity Cohort Clustering
- **Algorithm**: Density-Based Spatial Clustering of Applications with Noise ($\varepsilon = 1.1$, $\text{min\_samples} = 3$).
- **Goal**: Group topologically related wallet clusters and network peers into behavioral cohorts without requiring ground-truth labels.

---

## 4. Operational Guardrails & Data Ethics Framework

1. **No Real-Time Surveillance**: The system runs entirely in an offline, sandboxed environment with no persistent scrapers or unauthorized background listeners.
2. **No Collection of Sensitive Personal Data**: Zero collection or synthesis of Aadhaar, PAN, banking credentials, exchange KYC databases, phone numbers, or residential addresses.
3. **Explainable AI (XAI)**: Every flagged transaction or entity is paired with human-readable rationale tags (e.g., `high_velocity_peel_chain`, `unusual_fee_ratio`, `fan_out_dispersion`).

---

## 5. Offline Demonstration & Verification Workflow

The entire prototype is verified to execute offline without requiring internet access or third-party cloud services:

```bash
# Step 1: Generate synthetic demonstration datasets
python generate_data.py

# Step 2: Train Isolation Forest on unbiased behavioral features
python build_model.py

# Step 3: Run correlation engine and generate prioritized triage alerts
python generate_alerts.py

# Step 4: Run optional context fetcher (Disabled by default; keeps offline cache safe)
python fetch_public_bitcoin_context.py

# Step 5: Start the application
npm run dev
```

---

## 6. Regulatory & Technical Attribution Disclaimer
*This project is an academic and technical proof-of-concept for Smart India Hackathon. It does not provide legal advice or make definitive attribution claims regarding real-world individuals or organizations.*
