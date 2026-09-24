import fs from 'fs';
import path from 'path';
import { PublicBlockchainRecord, PublicBlockchainSummary } from '../../src/types.js';

export class PublicBlockchainService {
  private static cachedSummary: PublicBlockchainSummary | null = null;
  private static lastLoadedMtime: number = 0;

  private static getCsvPath(): string {
    const primaryPath = path.join(process.cwd(), 'public_blockchain_sample.csv');
    if (fs.existsSync(primaryPath)) return primaryPath;
    const secondaryPath = path.join(process.cwd(), 'public', 'public_blockchain_sample.csv');
    if (fs.existsSync(secondaryPath)) return secondaryPath;
    return primaryPath;
  }

  public static loadSample(): PublicBlockchainSummary {
    const csvPath = this.getCsvPath();
    let fileContent = '';

    try {
      if (fs.existsSync(csvPath)) {
        const stats = fs.statSync(csvPath);
        if (this.cachedSummary && this.lastLoadedMtime === stats.mtimeMs) {
          return this.cachedSummary;
        }
        fileContent = fs.readFileSync(csvPath, 'utf-8');
        this.lastLoadedMtime = stats.mtimeMs;
      }
    } catch (e) {
      console.warn('Could not read public_blockchain_sample.csv from disk:', e);
    }

    if (!fileContent.trim()) {
      return this.getFallbackSummary();
    }

    const lines = fileContent.trim().split('\n');
    if (lines.length <= 1) {
      return this.getFallbackSummary();
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records: PublicBlockchainRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV parsing
      const cols = line.split(',');
      if (cols.length < 10) continue;

      const txid = cols[0]?.trim() || `tx_${i}`;
      const observed_at = cols[1]?.trim() || new Date().toISOString();
      const block_time = cols[2]?.trim() || undefined;
      const block_height = cols[3]?.trim() ? parseInt(cols[3].trim(), 10) : undefined;
      const confirmed = cols[4]?.trim().toLowerCase() === 'true';
      const fee_sats = parseInt(cols[5]?.trim() || '10000', 10);
      const fee_btc = parseFloat(cols[6]?.trim() || (fee_sats / 1e8).toString());
      const value_sats = parseInt(cols[7]?.trim() || '10000000', 10);
      const value_btc = parseFloat(cols[8]?.trim() || (value_sats / 1e8).toString());
      const vsize = parseInt(cols[9]?.trim() || '200', 10);
      const fee_rate_sat_vb = parseFloat(cols[10]?.trim() || (fee_sats / Math.max(1, vsize)).toFixed(2));
      const input_count = parseInt(cols[11]?.trim() || '1', 10);
      const output_count = parseInt(cols[12]?.trim() || '2', 10);
      const status = cols[13]?.trim() || (confirmed ? 'CONFIRMED' : 'UNCONFIRMED_MEMPOOL');
      const data_source = cols[14]?.trim() || 'Public Bitcoin Blockchain Context (Cached Demo Sample)';
      const collection_mode = cols[15]?.trim() || 'Offline cached sample';
      const india_attribution_status = cols[16]?.trim() || 'No verified India attribution possible from public on-chain data';
      const privacy_note = cols[17]?.trim() || 'Public blockchain fields do not reveal verified wallet owner identity, IP address, state, city, or nationality.';

      records.push({
        txid,
        observed_at,
        block_time,
        block_height,
        confirmed,
        fee_sats,
        fee_btc,
        value_sats,
        value_btc,
        vsize,
        fee_rate_sat_vb,
        input_count,
        output_count,
        status,
        data_source,
        collection_mode,
        india_attribution_status,
        privacy_note
      });
    }

    // Compute aggregates
    const confirmedCount = records.filter(r => r.confirmed).length;
    const unconfirmedCount = records.length - confirmedCount;
    const totalFeeSat = records.reduce((sum, r) => sum + r.fee_sats, 0);
    const totalFeeBTC = +(totalFeeSat / 1e8).toFixed(8);
    const totalValueSats = records.reduce((sum, r) => sum + r.value_sats, 0);
    const totalValueBTC = +(totalValueSats / 1e8).toFixed(6);
    const avgFeeRate = records.length > 0
      ? +(records.reduce((sum, r) => sum + r.fee_rate_sat_vb, 0) / records.length).toFixed(2)
      : 0;
    const avgOutput = records.length > 0
      ? +(records.reduce((sum, r) => sum + r.output_count, 0) / records.length).toFixed(1)
      : 2;
    const avgInput = records.length > 0
      ? +(records.reduce((sum, r) => sum + r.input_count, 0) / records.length).toFixed(1)
      : 1;

    // Fee rate histogram
    const feeRateBuckets: { [key: string]: number } = {
      '30-50 sat/vB': 0,
      '50-70 sat/vB': 0,
      '70-90 sat/vB': 0,
      '90-120 sat/vB': 0,
      '120+ sat/vB': 0
    };
    for (const r of records) {
      if (r.fee_rate_sat_vb < 50) feeRateBuckets['30-50 sat/vB']++;
      else if (r.fee_rate_sat_vb < 70) feeRateBuckets['50-70 sat/vB']++;
      else if (r.fee_rate_sat_vb < 90) feeRateBuckets['70-90 sat/vB']++;
      else if (r.fee_rate_sat_vb < 120) feeRateBuckets['90-120 sat/vB']++;
      else feeRateBuckets['120+ sat/vB']++;
    }

    // Value distribution
    const valBuckets: { [key: string]: number } = {
      '< 0.5 BTC': 0,
      '0.5 - 2.0 BTC': 0,
      '2.0 - 5.0 BTC': 0,
      '5.0 - 10.0 BTC': 0,
      '10+ BTC': 0
    };
    for (const r of records) {
      if (r.value_btc < 0.5) valBuckets['< 0.5 BTC']++;
      else if (r.value_btc < 2.0) valBuckets['0.5 - 2.0 BTC']++;
      else if (r.value_btc < 5.0) valBuckets['2.0 - 5.0 BTC']++;
      else if (r.value_btc < 10.0) valBuckets['5.0 - 10.0 BTC']++;
      else valBuckets['10+ BTC']++;
    }

    const summary: PublicBlockchainSummary = {
      totalRecords: records.length,
      confirmedCount,
      unconfirmedCount,
      avgFeeRateSatVb: avgFeeRate,
      avgOutputCount: avgOutput,
      avgInputCount: avgInput,
      totalValueBTC,
      totalValueSats,
      totalFeeBTC,
      cachedTimestamp: records[0]?.observed_at || new Date().toISOString(),
      dataSource: 'Public Bitcoin Blockchain Context (Cached Demo Sample)',
      collectionMode: 'Offline cached sample',
      indiaAttributionStatus: 'No verified India attribution possible from public on-chain data',
      privacyNote: 'Public blockchain fields do not reveal verified wallet owner identity, IP address, state, city, or nationality.',
      records,
      feeRateDistribution: Object.entries(feeRateBuckets).map(([range, count]) => ({ range, count })),
      valueDistribution: Object.entries(valBuckets).map(([range, count]) => ({ range, count })),
      confirmationRatio: [
        { name: 'Confirmed (Block Included)', value: confirmedCount },
        { name: 'Pending (Mempool Queue)', value: unconfirmedCount }
      ]
    };

    this.cachedSummary = summary;
    return summary;
  }

  public static getRawCSV(): string {
    const csvPath = this.getCsvPath();
    if (fs.existsSync(csvPath)) {
      return fs.readFileSync(csvPath, 'utf-8');
    }
    return '';
  }

  private static getFallbackSummary(): PublicBlockchainSummary {
    return {
      totalRecords: 0,
      confirmedCount: 0,
      unconfirmedCount: 0,
      avgFeeRateSatVb: 0,
      avgOutputCount: 0,
      avgInputCount: 0,
      totalValueBTC: 0,
      totalValueSats: 0,
      totalFeeBTC: 0,
      cachedTimestamp: new Date().toISOString(),
      dataSource: 'Public Bitcoin Blockchain Context (Cached Demo Sample)',
      collectionMode: 'Offline cached sample',
      indiaAttributionStatus: 'No verified India attribution possible from public on-chain data',
      privacyNote: 'Public blockchain fields do not reveal verified wallet owner identity, IP address, state, city, or nationality.',
      records: [],
      feeRateDistribution: [],
      valueDistribution: [],
      confirmationRatio: []
    };
  }
}
