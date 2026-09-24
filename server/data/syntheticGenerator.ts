import {
  RawTransactionRecord,
  ScriptType,
  PatternType,
  IndiaLinkType,
  IndiaRegion,
  TransactionScope,
  PriorityBand,
  SYNTHETIC_BTC_TO_INR
} from '../../src/types.js';
import { OfflineGeoIPService } from './geoipDb.js';

export interface GeneratorOptions {
  recordCount: number;
  walletCount?: number;
  ipCount?: number;
  anomalyPercentage?: number; // 0 - 100
  clusterCount?: number;
  timeRangeHours?: number;
}

interface IndiaCityData {
  city: string;
  state: string;
  region: IndiaRegion;
}

export class SyntheticDataGenerator {
  private static readonly SCRIPT_TYPES: ScriptType[] = ['P2PKH', 'P2SH', 'P2WPKH', 'P2WSH', 'TAPROOT'];
  
  // Global country distribution with weights
  private static readonly GLOBAL_COUNTRIES = [
    { code: 'US', weight: 0.22, name: 'United States', asn: 'AS15169', org: 'Google Cloud / Tier-1 US' },
    { code: 'IN', weight: 0.18, name: 'India', asn: 'AS45609', org: 'Bharti Airtel Ltd' },
    { code: 'GB', weight: 0.08, name: 'United Kingdom', asn: 'AS2856', org: 'BT Group UK' },
    { code: 'DE', weight: 0.08, name: 'Germany', asn: 'AS3320', org: 'Deutsche Telekom AG' },
    { code: 'SG', weight: 0.07, name: 'Singapore', asn: 'AS4657', org: 'StarHub Singapore' },
    { code: 'AE', weight: 0.06, name: 'United Arab Emirates', asn: 'AS5384', org: 'Emirates Telecom UAE' },
    { code: 'JP', weight: 0.06, name: 'Japan', asn: 'AS2516', org: 'KDDI Corporation Japan' },
    { code: 'NL', weight: 0.05, name: 'Netherlands', asn: 'AS1103', org: 'SURF B.V. Netherlands' },
    { code: 'CH', weight: 0.05, name: 'Switzerland', asn: 'AS3303', org: 'Swisscom Switzerland' },
    { code: 'KR', weight: 0.04, name: 'South Korea', asn: 'AS4766', org: 'Korea Telecom' },
    { code: 'BR', weight: 0.04, name: 'Brazil', asn: 'AS28573', org: 'Claro Brazil' },
    { code: 'NG', weight: 0.04, name: 'Nigeria', asn: 'AS37105', org: 'MainOne Nigeria' },
    { code: 'RU', weight: 0.03, name: 'Russia', asn: 'AS12389', org: 'Rostelecom Russia' },
  ];

  private static readonly INDIA_LOCATIONS: IndiaCityData[] = [
    { city: 'Chennai', state: 'Tamil Nadu', region: 'South' },
    { city: 'Vellore', state: 'Tamil Nadu', region: 'South' },
    { city: 'Coimbatore', state: 'Tamil Nadu', region: 'South' },
    { city: 'Madurai', state: 'Tamil Nadu', region: 'South' },
    { city: 'Bengaluru', state: 'Karnataka', region: 'South' },
    { city: 'Mysuru', state: 'Karnataka', region: 'South' },
    { city: 'Mumbai', state: 'Maharashtra', region: 'West' },
    { city: 'Pune', state: 'Maharashtra', region: 'West' },
    { city: 'Hyderabad', state: 'Telangana', region: 'South' },
    { city: 'New Delhi', state: 'Delhi NCR', region: 'North' },
    { city: 'Kochi', state: 'Kerala', region: 'South' },
    { city: 'Kolkata', state: 'West Bengal', region: 'East' },
    { city: 'Ahmedabad', state: 'Gujarat', region: 'West' },
    { city: 'Noida', state: 'Uttar Pradesh', region: 'North' },
    { city: 'Lucknow', state: 'Uttar Pradesh', region: 'North' },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh', region: 'South' },
  ];

  /**
   * Generates a global Bitcoin transaction & network dataset with an India Priority Lens.
   */
  public static generate(options: GeneratorOptions): RawTransactionRecord[] {
    const recordCount = Math.max(20, Math.min(options.recordCount, 50000));
    const walletCount = Math.max(10, options.walletCount || Math.floor(recordCount * 0.45));
    const ipCount = Math.max(5, options.ipCount || Math.floor(recordCount * 0.25));
    const anomalyPct = options.anomalyPercentage !== undefined ? options.anomalyPercentage : 15;
    const anomalyCount = Math.floor(recordCount * (anomalyPct / 100));
    const normalCount = recordCount - anomalyCount;
    const clusterCount = Math.max(2, options.clusterCount || 6);
    const timeSpanSec = (options.timeRangeHours || 48) * 3600;

    const baseTime = Date.now() - (timeSpanSec * 1000);

    const wallets = Array.from({ length: walletCount }, (_, i) => this.generateWalletAddress(i));
    const ips = Array.from({ length: ipCount }, (_, i) => this.generateIpAddress(i));

    const records: RawTransactionRecord[] = [];

    const pickCountry = (index: number) => {
      const rand = (index * 13 + 7) % 100;
      let cumulative = 0;
      for (const c of this.GLOBAL_COUNTRIES) {
        cumulative += c.weight * 100;
        if (rand < cumulative) return c;
      }
      return this.GLOBAL_COUNTRIES[0];
    };

    // 1. Generate Normal Transactions
    for (let i = 0; i < normalCount; i++) {
      const timeOffset = Math.floor((i / normalCount) * timeSpanSec + (Math.random() * 300 - 150));
      const txTime = new Date(baseTime + Math.max(0, timeOffset) * 1000).toISOString();

      const srcWallet = wallets[Math.floor(Math.random() * wallets.length)];
      let dstWallet = wallets[Math.floor(Math.random() * wallets.length)];
      while (dstWallet === srcWallet) {
        dstWallet = wallets[Math.floor(Math.random() * wallets.length)];
      }

      const srcIp = ips[Math.floor(Math.random() * ips.length)];
      const dstIp = ips[Math.floor(Math.random() * ips.length)];

      const countryObj = pickCountry(i);
      const isIndia = countryObj.code === 'IN';
      const isCrossBorder = (i % 3 === 0);
      let externalCountry = 'None';
      let transactionScope: TransactionScope = 'Domestic';

      if (isCrossBorder) {
        transactionScope = 'Cross-Border';
        const otherCountries = this.GLOBAL_COUNTRIES.filter(c => c.code !== countryObj.code);
        externalCountry = otherCountries[i % otherCountries.length].code;
      }

      let indiaLinkType: IndiaLinkType = 'None';
      let isIndiaLinked = false;
      let indiaState = 'Not Applicable';
      let indiaCity = 'Not Applicable';
      let indiaRegion: IndiaRegion = 'Not Applicable';

      if (isIndia) {
        isIndiaLinked = true;
        const loc = this.INDIA_LOCATIONS[i % this.INDIA_LOCATIONS.length];
        indiaState = loc.state;
        indiaCity = loc.city;
        indiaRegion = loc.region;
        indiaLinkType = isCrossBorder ? ((i % 2 === 0) ? 'India Outbound' : 'India Inbound') : 'India Domestic';
      } else if (isCrossBorder && externalCountry === 'IN') {
        isIndiaLinked = true;
        indiaLinkType = 'India Inbound';
      }

      const ipMeta = OfflineGeoIPService.enrichIP(srcIp, countryObj.code);
      const inAmount = +(0.05 + Math.random() * 2.5).toFixed(6);
      const fee = +(0.00008 + Math.random() * 0.0003).toFixed(6);
      const outAmount = +(inAmount - fee).toFixed(6);
      const valInr = +(inAmount * SYNTHETIC_BTC_TO_INR).toFixed(2);
      const scriptType = this.SCRIPT_TYPES[Math.floor(Math.random() * this.SCRIPT_TYPES.length)];
      const eventWindow = `WIN_${String(Math.floor(i / 15) + 101).padStart(3, '0')}`;

      // Calculate baseline scores
      const behavioralScore = +(0.15 + (inAmount > 2.0 ? 0.15 : 0) + (isCrossBorder ? 0.08 : 0)).toFixed(3);
      const indiaScore = isIndiaLinked ? 0.70 : 0.0;
      const finalScore = +(0.70 * behavioralScore + 0.30 * indiaScore).toFixed(3);
      const band: PriorityBand = finalScore >= 0.75 ? 'Critical' : finalScore >= 0.55 ? 'High' : finalScore >= 0.35 ? 'Medium' : 'Low';
      const explanation = isIndiaLinked 
        ? 'Standard baseline transaction with India-linked contextual metadata.'
        : 'Standard global transaction baseline; no high-priority anomalies detected.';

      records.push({
        timestamp: txTime,
        src_ip: srcIp,
        dst_ip: dstIp,
        src_port: 8333,
        dst_port: 8333,
        txid: this.generateTxid(i, 'NORM'),
        input_addresses: [srcWallet],
        output_addresses: [dstWallet],
        input_amounts: [inAmount],
        output_amounts: [outAmount],
        fee: fee,
        script_type: scriptType,
        geo_country: countryObj.code,
        asn: ipMeta.asn,
        organization: ipMeta.organization,
        synthetic_anomaly_label: 0,
        pattern_type: 'NORMAL',
        transaction_scope: transactionScope,
        cross_border_flag: isCrossBorder,
        external_country: externalCountry,
        india_state: indiaState,
        india_city: indiaCity,
        india_region: indiaRegion,
        transaction_value_inr: valInr,
        india_link_type: indiaLinkType,
        is_india_linked: isIndiaLinked,
        event_window_id: eventWindow,
        behavioral_anomaly_score: behavioralScore,
        india_relevance_score: indiaScore,
        final_priority_score: finalScore,
        priority_band: band,
        priority_explanation: explanation
      });
    }

    // 2. Generate Anomalous Transactions
    const anomalyPatterns: PatternType[] = [
      'HIGH_FREQUENCY_BOT',
      'RAPID_MULTI_HOP',
      'FAN_IN_CONSOLIDATION',
      'FAN_OUT_DISTRIBUTION',
      'PEEL_CHAIN',
      'SYBIL_IP_CLUSTER',
      'GEOGRAPHIC_ANOMALY',
      'UNUSUAL_TIMING_BURST'
    ];

    const anomalousWallets = wallets.slice(0, Math.max(5, Math.floor(walletCount * 0.12)));
    const anomalousIPs = ips.slice(0, Math.max(3, Math.floor(ipCount * 0.1)));

    let anomalyIdx = 0;
    while (anomalyIdx < anomalyCount) {
      const pattern = anomalyPatterns[anomalyIdx % anomalyPatterns.length];
      const baseAnomalyTime = baseTime + Math.floor(Math.random() * (timeSpanSec * 0.8) + (timeSpanSec * 0.1)) * 1000;
      const eventWindow = `WIN_${String(Math.floor((normalCount + anomalyIdx) / 15) + 101).padStart(3, '0')}`;

      const countryObj = pickCountry(normalCount + anomalyIdx);
      const isIndia = countryObj.code === 'IN';
      const isCrossBorder = true;
      const otherCountries = this.GLOBAL_COUNTRIES.filter(c => c.code !== countryObj.code);
      const externalCountry = otherCountries[(anomalyIdx * 7) % otherCountries.length].code;

      let indiaLinkType: IndiaLinkType = 'None';
      let isIndiaLinked = false;
      let indiaState = 'Not Applicable';
      let indiaCity = 'Not Applicable';
      let indiaRegion: IndiaRegion = 'Not Applicable';

      if (isIndia) {
        isIndiaLinked = true;
        const loc = this.INDIA_LOCATIONS[(normalCount + anomalyIdx) % this.INDIA_LOCATIONS.length];
        indiaState = loc.state;
        indiaCity = loc.city;
        indiaRegion = loc.region;
        indiaLinkType = (anomalyIdx % 2 === 0) ? 'India Outbound' : 'India Inbound';
      } else if (externalCountry === 'IN') {
        isIndiaLinked = true;
        indiaLinkType = 'India Inbound';
      }

      if (pattern === 'HIGH_FREQUENCY_BOT') {
        const botWallet = anomalousWallets[anomalyIdx % anomalousWallets.length];
        const botIp = anomalousIPs[0];
        const ipMeta = OfflineGeoIPService.enrichIP(botIp, countryObj.code);
        const burstSize = Math.min(5, anomalyCount - anomalyIdx);

        for (let b = 0; b < burstSize; b++) {
          const targetW = wallets[Math.floor(Math.random() * wallets.length)];
          const bTime = new Date(baseAnomalyTime + b * 2500).toISOString();
          const amt = 0.045;
          const fee = 0.0028;
          const inrVal = +(amt * SYNTHETIC_BTC_TO_INR).toFixed(2);

          const bScore = 0.82;
          const iScore = isIndiaLinked ? 0.85 : 0.0;
          const fScore = +(0.70 * bScore + 0.30 * iScore).toFixed(3);
          const band: PriorityBand = fScore >= 0.75 ? 'Critical' : 'High';
          const expl = isIndiaLinked 
            ? 'High behavioral anomaly (Bot burst) combined with direct India-linked network context.'
            : 'Global anomaly detected (Bot burst); no India-linked context was observed.';

          records.push({
            timestamp: bTime,
            src_ip: botIp,
            dst_ip: ips[Math.floor(Math.random() * ips.length)],
            src_port: 9050,
            dst_port: 8333,
            txid: this.generateTxid(records.length, 'BOT'),
            input_addresses: [botWallet],
            output_addresses: [targetW],
            input_amounts: [amt],
            output_amounts: [+(amt - fee).toFixed(6)],
            fee: fee,
            script_type: 'P2WPKH',
            geo_country: countryObj.code,
            asn: ipMeta.asn,
            organization: ipMeta.organization,
            synthetic_anomaly_label: 1,
            pattern_type: 'HIGH_FREQUENCY_BOT',
            transaction_scope: 'Cross-Border',
            cross_border_flag: true,
            external_country: externalCountry,
            india_state: indiaState,
            india_city: indiaCity,
            india_region: indiaRegion,
            transaction_value_inr: inrVal,
            india_link_type: indiaLinkType,
            is_india_linked: isIndiaLinked,
            event_window_id: eventWindow,
            behavioral_anomaly_score: bScore,
            india_relevance_score: iScore,
            final_priority_score: fScore,
            priority_band: band,
            priority_explanation: expl
          });
        }
        anomalyIdx += burstSize;
      } else if (pattern === 'FAN_IN_CONSOLIDATION') {
        const collectorWallet = anomalousWallets[1 % anomalousWallets.length];
        const fanInSize = Math.min(6, anomalyCount - anomalyIdx);
        const srcBatch = wallets.slice(0, fanInSize);
        const inAmounts = srcBatch.map(() => +(0.75 + Math.random() * 1.5).toFixed(4));
        const totalIn = inAmounts.reduce((a, b) => a + b, 0);
        const fee = 0.0045;
        const srcIp = anomalousIPs[1 % anomalousIPs.length];
        const ipMeta = OfflineGeoIPService.enrichIP(srcIp, countryObj.code);
        const inrVal = +(totalIn * SYNTHETIC_BTC_TO_INR).toFixed(2);

        const bScore = 0.88;
        const iScore = isIndiaLinked ? 0.85 : 0.0;
        const fScore = +(0.70 * bScore + 0.30 * iScore).toFixed(3);
        const band: PriorityBand = fScore >= 0.75 ? 'Critical' : 'High';
        const expl = isIndiaLinked 
          ? 'High behavioral anomaly (Fan-in aggregation) combined with direct India-linked network context.'
          : 'Global anomaly detected (Fan-in aggregation); no India-linked context was observed.';

        records.push({
          timestamp: new Date(baseAnomalyTime).toISOString(),
          src_ip: srcIp,
          dst_ip: ips[1],
          src_port: 8333,
          dst_port: 8333,
          txid: this.generateTxid(records.length, 'FANIN'),
          input_addresses: srcBatch,
          output_addresses: [collectorWallet],
          input_amounts: inAmounts,
          output_amounts: [+(totalIn - fee).toFixed(6)],
          fee: fee,
          script_type: 'P2SH',
          geo_country: countryObj.code,
          asn: ipMeta.asn,
          organization: ipMeta.organization,
          synthetic_anomaly_label: 1,
          pattern_type: 'FAN_IN_CONSOLIDATION',
          transaction_scope: 'Cross-Border',
          cross_border_flag: true,
          external_country: externalCountry,
          india_state: indiaState,
          india_city: indiaCity,
          india_region: indiaRegion,
          transaction_value_inr: inrVal,
          india_link_type: indiaLinkType,
          is_india_linked: isIndiaLinked,
          event_window_id: eventWindow,
          behavioral_anomaly_score: bScore,
          india_relevance_score: iScore,
          final_priority_score: fScore,
          priority_band: band,
          priority_explanation: expl
        });
        anomalyIdx += fanInSize;
      } else if (pattern === 'FAN_OUT_DISTRIBUTION') {
        const distributor = anomalousWallets[2 % anomalousWallets.length];
        const fanOutSize = Math.min(6, anomalyCount - anomalyIdx);
        const outWallets = wallets.slice(5, 5 + fanOutSize);
        const inAmt = +(fanOutSize * 1.85 + 0.1).toFixed(4);
        const outAmounts = outWallets.map(() => 1.84);
        const fee = 0.008;
        const srcIp = anomalousIPs[2 % anomalousIPs.length];
        const ipMeta = OfflineGeoIPService.enrichIP(srcIp, countryObj.code);
        const inrVal = +(inAmt * SYNTHETIC_BTC_TO_INR).toFixed(2);

        const bScore = 0.89;
        const iScore = isIndiaLinked ? 0.85 : 0.0;
        const fScore = +(0.70 * bScore + 0.30 * iScore).toFixed(3);
        const band: PriorityBand = fScore >= 0.75 ? 'Critical' : 'High';
        const expl = isIndiaLinked 
          ? 'Cross-border anomalous pattern with India outbound distribution context.'
          : 'Global anomaly detected (Fan-out distribution); no India-linked context was observed.';

        records.push({
          timestamp: new Date(baseAnomalyTime).toISOString(),
          src_ip: srcIp,
          dst_ip: ips[2],
          src_port: 8333,
          dst_port: 8333,
          txid: this.generateTxid(records.length, 'FANOUT'),
          input_addresses: [distributor],
          output_addresses: outWallets,
          input_amounts: [inAmt],
          output_amounts: outAmounts,
          fee: fee,
          script_type: 'TAPROOT',
          geo_country: countryObj.code,
          asn: ipMeta.asn,
          organization: ipMeta.organization,
          synthetic_anomaly_label: 1,
          pattern_type: 'FAN_OUT_DISTRIBUTION',
          transaction_scope: 'Cross-Border',
          cross_border_flag: true,
          external_country: externalCountry,
          india_state: indiaState,
          india_city: indiaCity,
          india_region: indiaRegion,
          transaction_value_inr: inrVal,
          india_link_type: isIndiaLinked ? 'India Outbound' : 'None',
          is_india_linked: isIndiaLinked,
          event_window_id: eventWindow,
          behavioral_anomaly_score: bScore,
          india_relevance_score: iScore,
          final_priority_score: fScore,
          priority_band: band,
          priority_explanation: expl
        });
        anomalyIdx += fanOutSize;
      } else {
        const anomalousWallet = anomalousWallets[anomalyIdx % anomalousWallets.length];
        const destWallet = wallets[Math.floor(Math.random() * wallets.length)];
        const anomalousIp = anomalousIPs[anomalyIdx % anomalousIPs.length];
        const ipMeta = OfflineGeoIPService.enrichIP(anomalousIp, countryObj.code);

        const amt = +(4.5 + Math.random() * 12).toFixed(4);
        const fee = +(0.005 + Math.random() * 0.015).toFixed(6);
        const inrVal = +(amt * SYNTHETIC_BTC_TO_INR).toFixed(2);

        const bScore = 0.85;
        const iScore = isIndiaLinked ? 0.85 : 0.0;
        const fScore = +(0.70 * bScore + 0.30 * iScore).toFixed(3);
        const band: PriorityBand = fScore >= 0.75 ? 'Critical' : 'High';
        const expl = isIndiaLinked 
          ? 'High behavioral anomaly combined with direct India-linked network context.'
          : 'Global anomaly detected; no India-linked context was observed.';

        records.push({
          timestamp: new Date(baseAnomalyTime).toISOString(),
          src_ip: anomalousIp,
          dst_ip: ips[Math.floor(Math.random() * ips.length)],
          src_port: 8333,
          dst_port: 8333,
          txid: this.generateTxid(records.length, 'ANOM'),
          input_addresses: [anomalousWallet],
          output_addresses: [destWallet],
          input_amounts: [amt],
          output_amounts: [+(amt - fee).toFixed(6)],
          fee: fee,
          script_type: 'P2SH',
          geo_country: countryObj.code,
          asn: ipMeta.asn,
          organization: ipMeta.organization,
          synthetic_anomaly_label: 1,
          pattern_type: pattern,
          transaction_scope: 'Cross-Border',
          cross_border_flag: true,
          external_country: externalCountry,
          india_state: indiaState,
          india_city: indiaCity,
          india_region: indiaRegion,
          transaction_value_inr: inrVal,
          india_link_type: indiaLinkType,
          is_india_linked: isIndiaLinked,
          event_window_id: eventWindow,
          behavioral_anomaly_score: bScore,
          india_relevance_score: iScore,
          final_priority_score: fScore,
          priority_band: band,
          priority_explanation: expl
        });
        anomalyIdx++;
      }
    }

    return records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private static generateWalletAddress(index: number): string {
    const prefixes = ['1', '3', 'bc1q', 'bc1p'];
    const prefix = prefixes[index % prefixes.length];
    const hash = Math.sin(index + 1) * 10000;
    const hex = Math.abs(Math.floor(hash * 9999999999)).toString(16).padStart(12, '0');
    return `${prefix}btc${index.toString().padStart(4, '0')}${hex.slice(0, 16)}`;
  }

  private static generateIpAddress(index: number): string {
    const subnets = [
      '198.51.100.',
      '203.0.113.',
      '185.220.101.',
      '45.33.32.',
      '104.244.72.',
      '185.195.236.',
      '103.21.244.',
      '194.26.29.'
    ];
    const subnet = subnets[index % subnets.length];
    const host = (index * 7 + 11) % 250 + 1;
    return `${subnet}${host}`;
  }

  private static generateTxid(index: number, prefix: string = 'TX'): string {
    const hash1 = Math.abs(Math.sin(index + 100) * 1e16).toString(16).padStart(16, '0');
    const hash2 = Math.abs(Math.cos(index + 200) * 1e16).toString(16).padStart(16, '0');
    const hash3 = Math.abs(Math.tan(index + 300) * 1e16).toString(16).padStart(16, '0');
    const hash4 = Math.abs(Math.sin(index + 400) * 1e16).toString(16).padStart(16, '0');
    return `${prefix}_${(hash1 + hash2 + hash3 + hash4).slice(0, 60)}`;
  }

  public static toCSV(records: RawTransactionRecord[]): string {
    const headers = [
      'timestamp',
      'src_ip',
      'dst_ip',
      'src_port',
      'dst_port',
      'txid',
      'input_addresses',
      'output_addresses',
      'input_amounts',
      'output_amounts',
      'fee',
      'script_type',
      'geo_country',
      'asn',
      'transaction_scope',
      'cross_border_flag',
      'external_country',
      'india_state',
      'india_city',
      'india_region',
      'transaction_value_inr',
      'india_link_type',
      'is_india_linked',
      'event_window_id',
      'behavioral_anomaly_score',
      'india_relevance_score',
      'final_priority_score',
      'priority_band'
    ];

    const rows = records.map(r => [
      r.timestamp,
      r.src_ip,
      r.dst_ip,
      r.src_port,
      r.dst_port,
      r.txid,
      `"${r.input_addresses.join(';')}"`,
      `"${r.output_addresses.join(';')}"`,
      `"${r.input_amounts.join(';')}"`,
      `"${r.output_amounts.join(';')}"`,
      r.fee,
      r.script_type,
      r.geo_country,
      r.asn,
      `"${r.transaction_scope || 'Domestic'}"`,
      r.cross_border_flag ? 'true' : 'false',
      `"${r.external_country || 'None'}"`,
      `"${r.india_state || 'Not Applicable'}"`,
      `"${r.india_city || 'Not Applicable'}"`,
      `"${r.india_region || 'Not Applicable'}"`,
      r.transaction_value_inr || 0,
      `"${r.india_link_type || 'None'}"`,
      r.is_india_linked ? 'true' : 'false',
      r.event_window_id || 'WIN_001',
      r.behavioral_anomaly_score || 0.15,
      r.india_relevance_score || 0,
      r.final_priority_score || 0.15,
      `"${r.priority_band || 'Low'}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  public static toJSON(records: RawTransactionRecord[]): string {
    return JSON.stringify(records, null, 2);
  }

  public static toXML(records: RawTransactionRecord[]): string {
    const xmlRows = records.map(r => `  <transaction>
    <txid>${r.txid}</txid>
    <timestamp>${r.timestamp}</timestamp>
    <src_ip>${r.src_ip}</src_ip>
    <dst_ip>${r.dst_ip}</dst_ip>
    <geo_country>${r.geo_country}</geo_country>
    <asn>${r.asn}</asn>
    <behavioral_anomaly_score>${r.behavioral_anomaly_score ?? 0.15}</behavioral_anomaly_score>
    <india_relevance_score>${r.india_relevance_score ?? 0.0}</india_relevance_score>
    <final_priority_score>${r.final_priority_score ?? 0.15}</final_priority_score>
    <priority_band>${r.priority_band || 'Low'}</priority_band>
    <is_india_linked>${r.is_india_linked ? 'true' : 'false'}</is_india_linked>
  </transaction>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<transactions>\n${xmlRows}\n</transactions>`;
  }
}
