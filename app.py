import os
import csv
import json
import pandas as pd

# Streamlit runner script for CHAINWATCH offline prototype
try:
    import streamlit as st
    import plotly.express as px
    import plotly.graph_objects as go
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False

def run_streamlit_app():
    if not HAS_STREAMLIT:
        print("[!] Streamlit is not installed in the current environment. Please use the primary React dashboard or install streamlit.")
        return

    st.set_page_config(
        page_title="CHAINWATCH | Global Bitcoin Traffic Intelligence",
        page_icon="🛡️",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Top Data Provenance Header & Disclaimer
    st.markdown("""
    <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div>
                <span style="color: #10b981; font-weight: bold; font-family: monospace; font-size: 16px;">CHAINWATCH</span>
                <span style="color: #94a3b8; font-size: 14px; margin-left: 10px;">Global Bitcoin Traffic Intelligence with an India Priority Lens</span>
            </div>
            <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; padding: 3px 8px; color: #10b981; font-size: 12px; font-family: monospace;">
                ● 100% OFFLINE MODE
            </div>
        </div>
        <div style="color: #cbd5e1; font-size: 12px; margin-top: 8px; border-top: 1px solid #1e293b; padding-top: 8px;">
            <b>Operational State:</b> Global Analysis with India-Prioritized Triage | 
            <b>ML Anomaly Model:</b> Behavioral Isolation Forest (Features exclude geo/demographics) | 
            <b>Priority Formula:</b> 0.70 × Behavioral Score + 0.30 × India Relevance | 
            <b>Identity Attribution:</b> Not Performed
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Load data
    df_tx = pd.DataFrame()
    alerts_data = []

    if os.path.exists("synthetic_transactions.csv"):
        df_tx = pd.read_csv("synthetic_transactions.csv")
    if os.path.exists("alerts.json"):
        with open("alerts.json", "r", encoding="utf-8") as f:
            alerts_data = json.load(f)
    df_alerts = pd.DataFrame(alerts_data) if alerts_data else pd.DataFrame()

    tabs = st.tabs([
        "🌍 Global Command Center", 
        "🚨 Global Alert Queue", 
        "🇮🇳 India Priority Desk", 
        "🔍 Entity Explorer", 
        "🌐 Cross-Border Intelligence",
        "⚡ Network Intelligence",
        "🛡️ Methodology & Safeguards"
    ])

    # -------------------------------------------------------------
    # TAB 1: Global Command Center
    # -------------------------------------------------------------
    with tabs[0]:
        st.subheader("Global Command Center")
        st.caption("High-level operational overview across all monitored global Bitcoin traffic and anomaly detections.")

        if not df_tx.empty:
            total_tx = len(df_tx)
            anomalies = len(df_alerts[df_alerts['behavioral_anomaly_score'] >= 0.50]) if not df_alerts.empty else 0
            crit_high = len(df_alerts[df_alerts['priority_band'].isin(['Critical', 'High'])]) if not df_alerts.empty else 0
            cross_border = len(df_tx[df_tx['cross_border_flag'] == True]) if 'cross_border_flag' in df_tx.columns else 0
            india_linked = len(df_alerts[df_alerts['is_india_linked'] == True]) if not df_alerts.empty else 0

            c1, c2, c3, c4, c5 = st.columns(5)
            c1.metric("Global Transactions", f"{total_tx:,}")
            c2.metric("Suspicious Anomalies", f"{anomalies:,}")
            c3.metric("Critical / High Alerts", f"{crit_high:,}")
            c4.metric("Cross-Border Flows", f"{cross_border:,}")
            c5.metric("India Context Leads", f"{india_linked:,}")

            st.markdown("---")
            col1, col2 = st.columns(2)

            with col1:
                st.markdown("#### Global Alerts by Priority Band")
                if not df_alerts.empty and 'priority_band' in df_alerts.columns:
                    band_counts = df_alerts['priority_band'].value_counts().reset_index()
                    band_counts.columns = ['Priority Band', 'Count']
                    fig_band = px.pie(band_counts, names='Priority Band', values='Count', color='Priority Band',
                                      color_discrete_map={'Critical': '#ef4444', 'High': '#f97316', 'Medium': '#eab308', 'Low': '#3b82f6'},
                                      hole=0.4)
                    fig_band.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=30, b=20))
                    st.plotly_chart(fig_band, use_container_width=True)

            with col2:
                st.markdown("#### Global Alerts by Country Origin")
                if not df_alerts.empty and 'geo_country' in df_alerts.columns:
                    country_counts = df_alerts['geo_country'].value_counts().head(10).reset_index()
                    country_counts.columns = ['Country', 'Alert Count']
                    fig_geo = px.bar(country_counts, x='Country', y='Alert Count', color='Alert Count',
                                     color_continuous_scale='Blues')
                    fig_geo.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=30, b=20))
                    st.plotly_chart(fig_geo, use_container_width=True)

            st.markdown("#### Top Behavioral Anomaly Reasons (Global)")
            if not df_alerts.empty:
                all_reasons = []
                for reasons in df_alerts['reasons']:
                    if isinstance(reasons, list):
                        all_reasons.extend(reasons)
                if all_reasons:
                    df_reasons = pd.Series(all_reasons).value_counts().head(8).reset_index()
                    df_reasons.columns = ['Behavioral Reason', 'Occurrences']
                    fig_reasons = px.bar(df_reasons, y='Behavioral Reason', x='Occurrences', orientation='h',
                                         color='Occurrences', color_continuous_scale='Tealgrn')
                    fig_reasons.update_layout(template="plotly_dark", yaxis=dict(autorange="reversed"), margin=dict(l=20, r=20, t=20, b=20))
                    st.plotly_chart(fig_reasons, use_container_width=True)
        else:
            st.warning("No data found. Please run `python generate_data.py && python generate_alerts.py`.")

    # -------------------------------------------------------------
    # TAB 2: Global Alert Queue
    # -------------------------------------------------------------
    with tabs[1]:
        st.subheader("Global Alert Queue")
        st.caption("Ranked investigative leads sorted by Behavioral Anomaly Score and Final Priority Score.")

        if not df_alerts.empty:
            # Filter bar
            fcol1, fcol2, fcol3 = st.columns(3)
            with fcol1:
                selected_band = st.multiselect("Filter by Priority Band", options=['Critical', 'High', 'Medium', 'Low'], default=['Critical', 'High', 'Medium'])
            with fcol2:
                countries = ['All'] + sorted(df_alerts['geo_country'].unique().tolist())
                selected_country = st.selectbox("Filter by Country", options=countries)
            with fcol3:
                scope_options = ['All', 'Domestic', 'Cross-Border']
                selected_scope = st.selectbox("Filter by Transaction Scope", options=scope_options)

            filtered = df_alerts.copy()
            if selected_band:
                filtered = filtered[filtered['priority_band'].isin(selected_band)]
            if selected_country != 'All':
                filtered = filtered[filtered['geo_country'] == selected_country]
            if selected_scope != 'All':
                filtered = filtered[filtered['transaction_scope'] == selected_scope]

            st.write(f"Showing **{len(filtered)}** qualified alerts matching filters.")

            display_cols = ['alert_id', 'txid', 'behavioral_anomaly_score', 'india_relevance_score', 'final_priority_score', 'priority_band', 'transaction_scope', 'geo_country', 'cross_border_flag', 'amount_btc']
            st.dataframe(filtered[display_cols].head(100), use_container_width=True)

            csv_export = filtered.to_csv(index=False)
            st.download_button(
                label="📥 Export Filtered Global Alerts (CSV)",
                data=csv_export,
                file_name="chainwatch_global_alerts.csv",
                mime="text/csv"
            )
        else:
            st.info("Run `python generate_alerts.py` to populate the alert queue.")

    # -------------------------------------------------------------
    # TAB 3: India Priority Desk
    # -------------------------------------------------------------
    with tabs[2]:
        st.subheader("🇮🇳 India Priority Desk (Contextual Triage)")
        st.warning("""
        **INVESTIGATIVE CONTEXT & REGULATORY SAFEGUARD NOTICE**  
        India fields (State, City, Region, ASN, INR conversion) are **synthetic contextual metadata** designed for testing investigative prioritization. India relevance prioritizes analyst review time; it is **NOT** a score of guilt or criminality.
        """)

        if not df_alerts.empty:
            df_india = df_alerts[df_alerts['is_india_linked'] == True].copy()

            in_total = len(df_india)
            in_inbound = len(df_india[df_india['india_link_type'] == 'India Inbound'])
            in_outbound = len(df_india[df_india['india_link_type'] == 'India Outbound'])
            in_crit = len(df_india[df_india['priority_band'].isin(['Critical', 'High'])])

            k1, k2, k3, k4 = st.columns(4)
            k1.metric("India Context Alerts", in_total)
            k2.metric("India Inbound Flows", in_inbound)
            k3.metric("India Outbound Flows", in_outbound)
            k4.metric("High/Critical Priority", in_crit)

            st.markdown("---")
            icol1, icol2 = st.columns(2)
            with icol1:
                st.markdown("#### India Link Types Distribution")
                type_counts = df_india['india_link_type'].value_counts().reset_index()
                type_counts.columns = ['Link Type', 'Count']
                fig_type = px.bar(type_counts, x='Link Type', y='Count', color='Link Type', color_discrete_sequence=['#10b981', '#06b6d4', '#f59e0b'])
                fig_type.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=20, b=20))
                st.plotly_chart(fig_type, use_container_width=True)

            with icol2:
                st.markdown("#### Top External Corridors Connected to India")
                ext_counts = df_india[df_india['external_country'] != 'None']['external_country'].value_counts().reset_index()
                if not ext_counts.empty:
                    ext_counts.columns = ['Connected External Country', 'Count']
                    fig_ext = px.bar(ext_counts, x='Connected External Country', y='Count', color='Count', color_continuous_scale='Sunset')
                    fig_ext.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=20, b=20))
                    st.plotly_chart(fig_ext, use_container_width=True)

            st.markdown("#### Prioritized India-Linked Review Queue")
            india_table_cols = ['alert_id', 'txid', 'india_link_type', 'india_state', 'external_country', 'behavioral_anomaly_score', 'india_relevance_score', 'final_priority_score', 'priority_explanation']
            st.dataframe(df_india[india_table_cols].head(50), use_container_width=True)

    # -------------------------------------------------------------
    # TAB 4: Entity Explorer
    # -------------------------------------------------------------
    with tabs[3]:
        st.subheader("🔍 Entity & Transaction Dossier Explorer")
        st.caption("Deep-dive into specific TXIDs, Wallets, and IP network origin points.")

        if not df_alerts.empty:
            all_txids = df_alerts['txid'].tolist()
            selected_txid = st.selectbox("Select Transaction (TXID) to Inspect", options=all_txids[:100])

            selected_row = df_alerts[df_alerts['txid'] == selected_txid].iloc[0]

            ec1, ec2, ec3, ec4 = st.columns(4)
            ec1.metric("Behavioral Anomaly Score", f"{selected_row['behavioral_anomaly_score']:.3f}")
            ec2.metric("India Relevance Score", f"{selected_row['india_relevance_score']:.3f}")
            ec3.metric("Final Priority Score", f"{selected_row['final_priority_score']:.3f}")
            ec4.metric("Priority Band", selected_row['priority_band'])

            st.markdown(f"**Investigative Explanation:** {selected_row['priority_explanation']}")
            st.markdown(f"**Evidence Summary:** {selected_row['evidence_summary']}")

            if selected_row['is_india_linked']:
                st.success(f"🇮🇳 **India Context Metadata:** {selected_row['india_link_type']} | State: {selected_row['india_state']} | City: {selected_row['india_city']}")
            else:
                st.info("ℹ️ **No India-linked synthetic context observed for this global transaction.**")

            st.markdown("---")
            st.json({
                "txid": selected_row['txid'],
                "timestamp": selected_row['timestamp'],
                "amount_btc": selected_row['amount_btc'],
                "fee_ratio": selected_row['fee_ratio'],
                "src_ip": selected_row['src_ip'],
                "dst_ip": selected_row['dst_ip'],
                "geo_country": selected_row['geo_country'],
                "reasons": selected_row['reasons'],
                "priority_explanation": selected_row['priority_explanation']
            })

    # -------------------------------------------------------------
    # TAB 5: Cross-Border Intelligence
    # -------------------------------------------------------------
    with tabs[4]:
        st.subheader("🌐 Cross-Border Flow Intelligence")
        st.caption("Mapping synthetic transaction routing between sovereign jurisdictions and network zones.")

        if not df_tx.empty and 'cross_border_flag' in df_tx.columns:
            cb_df = df_tx[df_tx['cross_border_flag'] == True].copy()
            st.write(f"Total Cross-Border Corridors Monitored: **{len(cb_df)}**")

            corridor_summary = cb_df.groupby(['geo_country', 'external_country']).size().reset_index(name='Transaction Volume')
            corridor_summary['Corridor'] = corridor_summary['geo_country'] + " ➔ " + corridor_summary['external_country']

            top_corridors = corridor_summary.sort_values('Transaction Volume', ascending=False).head(15)
            fig_corridor = px.bar(top_corridors, x='Corridor', y='Transaction Volume', color='Transaction Volume',
                                  color_continuous_scale='Viridis', title="Top Global Cross-Border Corridors")
            fig_corridor.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=30, b=20))
            st.plotly_chart(fig_corridor, use_container_width=True)

    # -------------------------------------------------------------
    # TAB 6: Network Intelligence
    # -------------------------------------------------------------
    with tabs[5]:
        st.subheader("⚡ Network Infrastructure & Timing Intelligence")
        st.caption("Analysis of IP repeat occurrences, ASN clustering, and event window bursts.")

        if not df_tx.empty:
            ip_counts = df_tx['src_ip'].value_counts().head(10).reset_index()
            ip_counts.columns = ['Source IP (Synthetic)', 'Frequency']

            fig_ips = px.bar(ip_counts, x='Source IP (Synthetic)', y='Frequency', color='Frequency',
                             color_continuous_scale='Magma', title="Most Active Source IPs")
            fig_ips.update_layout(template="plotly_dark", margin=dict(l=20, r=20, t=30, b=20))
            st.plotly_chart(fig_ips, use_container_width=True)

    # -------------------------------------------------------------
    # TAB 7: Methodology & Safeguards
    # -------------------------------------------------------------
    with tabs[6]:
        st.subheader("🛡️ Methodology & Technical Safeguards")
        st.markdown("""
        ### Architectural Guardrails & Scoring Methodology
        
        #### 1. Dual-Scoring Architecture
        - **Behavioral Anomaly Score (0.0 – 1.0):** Derived strictly from technical and behavioral features (Isolation Forest + Graph Metrics: Amount, Fee Ratio, Fan-in, Fan-out, Timing Delays, Port Patterns, Repeat Activity).
        - **India Relevance Score (0.0 – 1.0):** Derived purely from network/graph context indicators (Inbound/Outbound link types, direct graph adjacency, observation points).
        - **Final Priority Formula:**  
          $$\\text{Final Priority Score} = 0.70 \\times \\text{Behavioral Anomaly Score} + 0.30 \\times \\text{India Relevance Score}$$

        #### 2. Strict Privacy & Ethical Rules
        - **No Identity Attribution:** Public Bitcoin transactions cannot establish real citizen identity, Aadhaar, PAN, bank accounts, or exchange account ownership.
        - **Non-Discriminatory ML Features:** Country, state, city, and nationality are strictly **excluded** from the Isolation Forest anomaly feature vector.
        - **Analyst Triage Only:** The platform produces investigative leads for prioritization, never automated findings of guilt.
        - **100% Offline Compatible:** Operates entirely within air-gapped environments without mandatory cloud or external API dependencies.
        """)

if __name__ == "__main__":
    run_streamlit_app()
