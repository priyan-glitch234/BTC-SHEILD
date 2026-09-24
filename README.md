# BTC-SHIELD
## Bitcoin Transaction Traffic Intelligence & Anomaly Monitoring Platform
### Smart India Hackathon (SIH) — Problem Statement 26146

---

## 1. Overview
BTC-SHIELD is a cybersecurity and financial intelligence demonstration platform designed to correlate Bitcoin network traffic metadata with on-chain transaction topologies. It applies unsupervised machine learning (**Isolation Forest** for outlier detection and **DBSCAN** for behavioral cohort clustering) to prioritize investigative leads for cyber forensics teams.

---

## 2. Data Sources and Limitations

### A. Synthetic India-Focused Demonstration Metadata
- **Nature**: All Indian state/city locations (Tamil Nadu, Maharashtra, Karnataka, Delhi NCR, etc.), ISP Autonomous System Numbers (ASNs), IP addresses, and INR currency conversion valuations are **synthetically generated demonstration metadata**.
- **Purpose**: Designed specifically to showcase regional monitoring dashboards, inbound/outbound corridor tracking, and compliance workflow generation for SIH Problem Statement 26146 without using or exposing real-world personal data.
- **Ethics Rule**: No real-world individuals, bank accounts, PAN/Aadhaar details, or private identities are collected or inferred.

### B. Public Bitcoin Blockchain Context (Cached Sample)
- **Nature**: Generic on-chain fields (Transaction IDs, timestamps, virtual sizes, input/output counts, fees, and confirmation statuses) sourced from public Bitcoin blockchain records.
- **Separation & Non-Attribution**: Public blockchain records **do not contain** IP addresses, nationality, geographic location, or wallet owner identity. Public Bitcoin transactions are strictly kept unlinked from any geographic attribution claims.
- **Offline Reliability**: The platform ships with an offline cached dataset (`public_blockchain_sample.csv`) and does not require internet connectivity during evaluation or demonstration.

---

## 3. Data Ethics & Legal Compliance Guardrails

1. **No Personal Identity Inference**: The system does not attempt to deanonymize private citizens or link public Bitcoin transactions to real individuals without lawful process.
2. **No Unsolicited Live Surveillance**: The platform operates in offline-first mode with zero continuous background tracking or unauthorized scraping daemons.
3. **Unbiased Machine Learning**: Anomaly detection features are strictly mathematical and topological (velocity, fee-to-volume ratio, fan-out degrees, timing bursts). Geographic and demographic indicators are excluded from the model feature vectors.
4. **Lead Prioritization Role**: The platform provides analytical triage and investigative lead prioritization; it does not replace formal legal evidence collection or judicial authorization.

---

## 4. Machine Learning & Analytical Pipeline

1. **Behavioral Feature Extraction**: 16 multidimensional features extracted per entity/transaction (velocity, fan-in/fan-out degree, burst frequency, fee ratio).
2. **Isolation Forest**: Identifies outlier multi-hop patterns (peel chains, mixing/tumbling cycles, rapid consolidation) with tunable contamination and tree estimators.
3. **DBSCAN Clustering**: Clusters related wallet and network nodes into density-connected behavioral cohorts.
4. **Explainable Risk Scoring**: Generates transparent, human-readable rationales for every investigative lead and dossier.

---

## 5. Offline Scripts & Utilities

- `python generate_data.py`: Generates synthetic transactions and network metadata for offline simulation.
- `python build_model.py`: Trains the Isolation Forest model on behavioral features without geographic bias.
- `python generate_alerts.py`: Generates prioritized triage alerts from the correlated graph.
- `python fetch_public_bitcoin_context.py`: **Optional script (Disabled by Default)**. Can be manually run with `--fetch` to refresh the generic public blockchain sample if internet access is available. Preserves offline cache if offline.

---

## 6. How to Run the Application

```bash
# Install dependencies
npm install

# Start the full-stack development server (Port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
