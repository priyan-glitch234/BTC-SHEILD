import { RawTransactionRecord, ScriptType, IngestionQualityReport } from '../../src/types.js';
import { OfflineGeoIPService } from '../data/geoipDb.js';

export interface ValidationResult {
  validRecords: RawTransactionRecord[];
  report: IngestionQualityReport;
}

export class DataIngestionValidator {
  /**
   * Ingests and validates raw string data in CSV, JSON, or XML format
   */
  public static ingest(content: string, filename: string = 'uploaded_dataset'): ValidationResult {
    const startTime = Date.now();
    const cleanContent = content.trim();

    let rawList: any[] = [];
    const missingFieldsMap: Record<string, number> = {};
    const normalizedFieldsMap: Record<string, number> = {};
    const validationErrors: { line: number; error: string; sample: string }[] = [];

    // 1. Format Detection & Parsing
    if (cleanContent.startsWith('[') || cleanContent.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanContent);
        rawList = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err: any) {
        validationErrors.push({ line: 1, error: `Malformed JSON: ${err.message}`, sample: cleanContent.slice(0, 100) });
      }
    } else if (cleanContent.startsWith('<?xml') || cleanContent.startsWith('<transactions') || cleanContent.includes('<transaction>')) {
      rawList = this.parseXML(cleanContent, validationErrors);
    } else {
      rawList = this.parseCSV(cleanContent, validationErrors);
    }

    const totalRecords = rawList.length;
    const validRecords: RawTransactionRecord[] = [];
    const seenTxids = new Set<string>();
    let duplicateCount = 0;
    let invalidCount = 0;

    // 2. Record Validation & Normalization
    rawList.forEach((raw, idx) => {
      const lineNum = idx + 1;
      const issues: string[] = [];

      // Check required fields
      const required = ['timestamp', 'src_ip', 'dst_ip', 'txid', 'input_addresses', 'output_addresses', 'input_amounts', 'output_amounts', 'fee'];
      for (const field of required) {
        if (raw[field] === undefined || raw[field] === null || raw[field] === '') {
          issues.push(`Missing field: ${field}`);
          missingFieldsMap[field] = (missingFieldsMap[field] || 0) + 1;
        }
      }

      // Validate Timestamp
      let normalizedTime = '';
      if (raw.timestamp) {
        const d = new Date(raw.timestamp);
        if (isNaN(d.getTime())) {
          issues.push('Invalid timestamp format');
        } else {
          normalizedTime = d.toISOString();
          normalizedFieldsMap['timestamp'] = (normalizedFieldsMap['timestamp'] || 0) + 1;
        }
      }

      // Validate IPs
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const srcIp = String(raw.src_ip || '').trim();
      const dstIp = String(raw.dst_ip || '').trim();
      if (!ipRegex.test(srcIp)) issues.push(`Invalid src_ip: ${srcIp}`);
      if (!ipRegex.test(dstIp)) issues.push(`Invalid dst_ip: ${dstIp}`);

      // Validate Ports
      const srcPort = Number(raw.src_port || 8333);
      const dstPort = Number(raw.dst_port || 8333);
      if (isNaN(srcPort) || srcPort < 1 || srcPort > 65535) issues.push(`Invalid src_port: ${srcPort}`);
      if (isNaN(dstPort) || dstPort < 1 || dstPort > 65535) issues.push(`Invalid dst_port: ${dstPort}`);

      // Validate TXID & Duplicates
      const txid = String(raw.txid || '').trim();
      if (!txid) {
        issues.push('Missing or empty txid');
      } else {
        if (seenTxids.has(txid)) {
          duplicateCount++;
          issues.push(`Duplicate txid detected: ${txid}`);
        } else {
          seenTxids.add(txid);
        }
      }

      // Validate Inputs / Outputs & Amounts
      const inAddresses = this.ensureArray(raw.input_addresses).map(a => String(a).trim()).filter(Boolean);
      const outAddresses = this.ensureArray(raw.output_addresses).map(a => String(a).trim()).filter(Boolean);
      const inAmounts = this.ensureArray(raw.input_amounts).map(a => Number(a));
      const outAmounts = this.ensureArray(raw.output_amounts).map(a => Number(a));
      const fee = Number(raw.fee);

      if (inAddresses.length === 0) issues.push('No valid input addresses provided');
      if (outAddresses.length === 0) issues.push('No valid output addresses provided');
      if (inAddresses.length !== inAmounts.length) issues.push('input_addresses and input_amounts length mismatch');
      if (outAddresses.length !== outAmounts.length) issues.push('output_addresses and output_amounts length mismatch');
      if (inAmounts.some(a => isNaN(a) || a <= 0)) issues.push('Invalid or non-positive input amounts');
      if (outAmounts.some(a => isNaN(a) || a <= 0)) issues.push('Invalid or non-positive output amounts');
      if (isNaN(fee) || fee < 0) issues.push(`Invalid negative fee: ${fee}`);

      // Validate Script Type
      let scriptType = String(raw.script_type || 'P2PKH').toUpperCase() as ScriptType;
      const validScripts: ScriptType[] = ['P2PKH', 'P2SH', 'P2WPKH', 'P2WSH', 'TAPROOT'];
      if (!validScripts.includes(scriptType)) {
        scriptType = 'P2PKH';
      }

      // Geo / ASN Enrichment
      const country = String(raw.geo_country || '').toUpperCase() || undefined;
      const asn = String(raw.asn || '').toUpperCase() || undefined;
      const geoEnriched = OfflineGeoIPService.enrichIP(srcIp, country, asn);

      if (issues.length > 0) {
        invalidCount++;
        if (validationErrors.length < 50) {
          validationErrors.push({
            line: lineNum,
            error: issues.join('; '),
            sample: JSON.stringify(raw).slice(0, 120)
          });
        }
      } else {
        const inrVal = raw.transaction_value_inr !== undefined ? Number(raw.transaction_value_inr) : +(inAmounts.reduce((a, b) => a + b, 0) * 7500000).toFixed(2);
        const isIndia = geoEnriched.countryCode === 'IN' || raw.is_india_linked === true || raw.is_india_linked === 'true';

        validRecords.push({
          timestamp: normalizedTime,
          src_ip: srcIp,
          dst_ip: dstIp,
          src_port: srcPort,
          dst_port: dstPort,
          txid: txid,
          input_addresses: inAddresses,
          output_addresses: outAddresses,
          input_amounts: inAmounts,
          output_amounts: outAmounts,
          fee: fee,
          script_type: scriptType,
          geo_country: geoEnriched.countryCode,
          asn: geoEnriched.asn,
          organization: geoEnriched.organization,
          synthetic_anomaly_label: raw.synthetic_anomaly_label !== undefined ? Number(raw.synthetic_anomaly_label) : 0,
          pattern_type: raw.pattern_type || 'NORMAL',
          india_state: raw.india_state || (isIndia ? 'Tamil Nadu' : 'Not Applicable'),
          india_city: raw.india_city || (isIndia ? 'Chennai' : 'Not Applicable'),
          india_region: raw.india_region || (isIndia ? 'South' : 'Not Applicable'),
          transaction_value_inr: inrVal,
          india_link_type: raw.india_link_type || (isIndia ? 'Domestic India' : 'International Context'),
          is_india_linked: isIndia,
          event_window_id: raw.event_window_id || 'WIN_001'
        });
      }
    });

    const processingTimeMs = Date.now() - startTime;

    const report: IngestionQualityReport = {
      datasetName: filename,
      totalRecords: totalRecords,
      validRecords: validRecords.length,
      invalidRecords: invalidCount,
      duplicateRecords: duplicateCount,
      missingFieldsCount: missingFieldsMap,
      normalizedFieldsCount: normalizedFieldsMap,
      processingTimeMs: processingTimeMs,
      validationErrors: validationErrors,
      timestamp: new Date().toISOString()
    };

    return { validRecords, report };
  }

  private static parseCSV(csvText: string, errors: any[]): any[] {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === 0) continue;
      const obj: any = {};
      headers.forEach((h, idx) => {
        const val = row[idx] !== undefined ? row[idx] : '';
        if (h.endsWith('_addresses') || h.endsWith('_amounts')) {
          obj[h] = val.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
        } else {
          obj[h] = val;
        }
      });
      results.push(obj);
    }
    return results;
  }

  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  }

  private static parseXML(xmlText: string, errors: any[]): any[] {
    const results: any[] = [];
    const txRegex = /<transaction>([\s\S]*?)<\/transaction>/gi;
    let match;

    while ((match = txRegex.exec(xmlText)) !== null) {
      const body = match[1];
      const obj: any = {};
      const tagRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/gi;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(body)) !== null) {
        const key = tagMatch[1];
        const val = tagMatch[2].trim();
        if (key.endsWith('_addresses') || key.endsWith('_amounts')) {
          obj[key] = val.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
        } else {
          obj[key] = val;
        }
      }
      results.push(obj);
    }
    return results;
  }

  private static ensureArray(val: any): any[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      return val.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
    }
    if (val !== undefined && val !== null) return [val];
    return [];
  }
}
