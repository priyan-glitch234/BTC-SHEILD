import {
  collection,
  query,
  limit,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { NormalizedTransaction } from '../types.js';

export type FirebaseConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface NewTransactionInput {
  transactionId: string;
  amount: number;
  riskScore: number;
  status: 'pending' | 'confirmed' | 'flagged' | 'blocked' | string;
  script_type?: string;
  src_ip?: string;
  dst_ip?: string;
  geo_country?: string;
  asn?: string;
  pattern_type?: string;
  input_addresses?: string[];
  output_addresses?: string[];
  fee?: number;
}

class FirestoreService {
  private connectionState: FirebaseConnectionState = 'connecting';
  private connectionListeners: Set<(state: FirebaseConnectionState) => void> = new Set();
  private transactionsListeners: Set<{
    onNext: (transactions: NormalizedTransaction[]) => void;
    onError?: (error: Error) => void;
  }> = new Set();
  private lastError: Error | null = null;
  private unsubscribeTransactions: Unsubscribe | null = null;
  private cachedTransactions: NormalizedTransaction[] = [];
  private hasInitialized = false;

  constructor() {
    this.init();
  }

  public getConnectionState(): FirebaseConnectionState {
    return this.connectionState;
  }

  public subscribeToConnection(listener: (state: FirebaseConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private notifyConnection(state: FirebaseConnectionState) {
    this.connectionState = state;
    this.connectionListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in connection listener:', err);
      }
    });
  }

  public subscribeToRealtimeTransactions(
    callback: (txs: NormalizedTransaction[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const subscriber = { onNext: callback, onError };
    this.transactionsListeners.add(subscriber);

    if (this.cachedTransactions.length > 0) {
      try {
        callback(this.cachedTransactions);
      } catch (err: any) {
        if (onError) onError(err);
      }
    } else if (this.lastError && onError) {
      onError(this.lastError);
    }

    return () => {
      this.transactionsListeners.delete(subscriber);
    };
  }

  private notifyTransactions(txs: NormalizedTransaction[]) {
    this.cachedTransactions = txs;
    this.lastError = null;
    this.transactionsListeners.forEach((listener) => {
      try {
        listener.onNext(txs);
      } catch (err) {
        console.error('Error in transaction listener:', err);
      }
    });
  }

  private notifyError(error: Error) {
    this.lastError = error;
    this.transactionsListeners.forEach((listener) => {
      try {
        if (listener.onError) {
          listener.onError(error);
        }
      } catch (err) {
        console.error('Error notifying transaction error listener:', err);
      }
    });
  }

  /**
   * Helper to normalize a Firestore document snapshot into standard BTC-SHIELD NormalizedTransaction
   */
  public normalizeFirestoreDoc(docSnap: DocumentSnapshot<DocumentData> | DocumentData, fallbackId?: string): NormalizedTransaction {
    const data = typeof docSnap.data === 'function' ? docSnap.data() || {} : (docSnap as DocumentData);
    const id = docSnap.id || fallbackId || data.transactionId || data.txid || 'TX_UNKNOWN';

    // Parse timestamp (support Firestore Timestamp, ISO string, Date object, or number)
    let parsedTimestamp = new Date().toISOString();
    if (data.timestamp) {
      if (typeof data.timestamp.toDate === 'function') {
        parsedTimestamp = data.timestamp.toDate().toISOString();
      } else if (typeof data.timestamp === 'string') {
        parsedTimestamp = data.timestamp;
      } else if (data.timestamp instanceof Date) {
        parsedTimestamp = data.timestamp.toISOString();
      } else if (typeof data.timestamp.seconds === 'number') {
        parsedTimestamp = new Date(data.timestamp.seconds * 1000).toISOString();
      }
    } else if (data.createdAt) {
      if (typeof data.createdAt.toDate === 'function') {
        parsedTimestamp = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        parsedTimestamp = data.createdAt;
      }
    }

    const txid = data.transactionId || data.txid || id;
    const amountVal = data.amount !== undefined ? Number(data.amount) : (data.total_input_amount !== undefined ? Number(data.total_input_amount) : Number(data.total_output_amount) || 0.05);
    const riskVal = data.riskScore !== undefined ? Number(data.riskScore) : (data.risk_score !== undefined ? Number(data.risk_score) : 25);
    const statusVal = data.status || (riskVal >= 65 ? 'flagged' : 'pending');

    const inputAddrs = Array.isArray(data.input_addresses) && data.input_addresses.length > 0
      ? data.input_addresses
      : [`1${txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}...`];

    const outputAddrs = Array.isArray(data.output_addresses) && data.output_addresses.length > 0
      ? data.output_addresses
      : [`3${txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}...`];

    return {
      id,
      txid,
      transactionId: txid,
      amount: amountVal,
      status: statusVal,
      riskScore: riskVal,
      timestamp: parsedTimestamp,
      src_ip: data.src_ip || '198.51.100.24',
      dst_ip: data.dst_ip || '203.0.113.19',
      src_port: data.src_port || 8333,
      dst_port: data.dst_port || 8333,
      input_addresses: inputAddrs,
      output_addresses: outputAddrs,
      input_amounts: Array.isArray(data.input_amounts) ? data.input_amounts : [amountVal],
      output_amounts: Array.isArray(data.output_amounts) ? data.output_amounts : [amountVal],
      input_count: data.input_count || inputAddrs.length,
      output_count: data.output_count || outputAddrs.length,
      fee: data.fee !== undefined ? Number(data.fee) : 0.0001,
      script_type: data.script_type || 'P2WPKH',
      geo_country: data.geo_country || data.country || 'US',
      country: data.country || data.geo_country || 'US',
      asn: data.asn || 'AS13335',
      organization: data.organization || 'Cloudflare Internet Transit',
      total_input_amount: amountVal,
      total_output_amount: amountVal,
      risk_score: riskVal,
      anomaly_score: data.anomaly_score !== undefined ? Number(data.anomaly_score) : (riskVal / 100),
      is_anomalous: data.is_anomalous !== undefined ? Boolean(data.is_anomalous) : (riskVal >= 65 || statusVal === 'flagged' || statusVal === 'blocked'),
      cluster_id: data.cluster_id || 1,
      synthetic_anomaly_label: data.synthetic_anomaly_label || (riskVal >= 65 ? 1 : 0),
      pattern_type: data.pattern_type || (riskVal >= 65 ? 'RAPID_MULTI_HOP' : 'NORMAL'),
      india_state: data.india_state,
      india_city: data.india_city,
      india_region: data.india_region,
      transaction_value_inr: data.transaction_value_inr || (amountVal * 7500000),
      india_link_type: data.india_link_type || (data.geo_country === 'IN' || data.country === 'IN' ? 'India Domestic' : 'None'),
      is_india_linked: Boolean(data.is_india_linked || data.geo_country === 'IN' || data.country === 'IN'),
      event_window_id: data.event_window_id || 'WIN_LIVE',
      priority_band: data.priority_band || (riskVal >= 80 ? 'Critical' : riskVal >= 60 ? 'High' : 'Low')
    } as NormalizedTransaction;
  }

  /**
   * Initializes real-time listener with onSnapshot()
   */
  public init() {
    if (this.hasInitialized) return;
    this.hasInitialized = true;
    this.notifyConnection('connecting');

    this.testConnection();

    try {
      const txCollection = collection(db, 'transactions');
      const txQuery = query(txCollection, limit(200));

      this.unsubscribeTransactions = onSnapshot(
        txQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          this.notifyConnection('connected');
          const txs: NormalizedTransaction[] = [];
          
          snapshot.forEach((docSnap) => {
            try {
              const normalized = this.normalizeFirestoreDoc(docSnap);
              txs.push(normalized);
            } catch (err) {
              console.warn('Error normalizing transaction doc:', docSnap.id, err);
            }
          });

          // Sort by timestamp desc
          txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          this.notifyTransactions(txs);
        },
        (error) => {
          console.error('Firestore onSnapshot error:', error);
          this.notifyConnection('error');
          try {
            handleFirestoreError(error, OperationType.GET, 'transactions');
          } catch (wrappedErr: any) {
            this.notifyError(wrappedErr);
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to initialize Firestore listener:', err);
      this.notifyConnection('error');
      try {
        handleFirestoreError(err, OperationType.GET, 'transactions');
      } catch (wrappedErr: any) {
        this.notifyError(wrappedErr);
      }
    }
  }

  /**
   * Initial connection validation
   */
  public async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  }

  /**
   * Reconnect or retry snapshot listener
   */
  public retry() {
    if (this.unsubscribeTransactions) {
      try {
        this.unsubscribeTransactions();
      } catch (e) {
        console.warn('Error unsubscribing before retry:', e);
      }
      this.unsubscribeTransactions = null;
    }
    this.hasInitialized = false;
    this.init();
  }

  /**
   * Insert a new transaction into Firestore with strict validation
   */
  public async insertTransaction(input: NewTransactionInput): Promise<string> {
    // 1. Validation
    if (!input.transactionId || typeof input.transactionId !== 'string' || !input.transactionId.trim()) {
      throw new Error('Validation failed: transactionId cannot be empty');
    }

    const amountNum = Number(input.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Validation failed: amount must be a positive number greater than 0');
    }

    const riskNum = Number(input.riskScore);
    if (isNaN(riskNum) || riskNum < 0 || riskNum > 100) {
      throw new Error('Validation failed: riskScore must be a valid number between 0 and 100');
    }

    const validStatuses = ['pending', 'confirmed', 'flagged', 'blocked'];
    const statusVal = input.status?.toLowerCase().trim() || 'pending';
    if (!validStatuses.includes(statusVal)) {
      throw new Error(`Validation failed: status must be one of ${validStatuses.join(', ')}`);
    }

    const cleanTxId = input.transactionId.trim();
    const docRef = doc(collection(db, 'transactions'), cleanTxId);

    const isAnomalous = riskNum >= 65 || statusVal === 'flagged' || statusVal === 'blocked';

    const payload = {
      transactionId: cleanTxId,
      txid: cleanTxId,
      amount: amountNum,
      total_input_amount: amountNum,
      total_output_amount: amountNum,
      riskScore: riskNum,
      risk_score: riskNum,
      status: statusVal,
      timestamp: serverTimestamp(),
      script_type: input.script_type || 'P2WPKH',
      src_ip: input.src_ip || '198.51.100.24',
      dst_ip: input.dst_ip || '203.0.113.19',
      src_port: 8333,
      dst_port: 8333,
      geo_country: input.geo_country || 'US',
      country: input.geo_country || 'US',
      asn: input.asn || 'AS13335',
      organization: 'Verified Network Node',
      fee: input.fee !== undefined ? Number(input.fee) : 0.0001,
      input_addresses: input.input_addresses || [`1${cleanTxId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}...`],
      output_addresses: input.output_addresses || [`3${cleanTxId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}...`],
      is_anomalous: isAnomalous,
      anomaly_score: riskNum / 100,
      pattern_type: input.pattern_type || (isAnomalous ? 'RAPID_MULTI_HOP' : 'NORMAL'),
      priority_band: riskNum >= 80 ? 'Critical' : riskNum >= 60 ? 'High' : 'Low',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(docRef, payload, { merge: true });
      return cleanTxId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions/${cleanTxId}`);
    }
  }

  /**
   * Update an existing transaction document in Firestore
   */
  public async updateTransaction(id: string, updates: Partial<{
    status: 'pending' | 'confirmed' | 'flagged' | 'blocked' | string;
    riskScore: number;
    risk_score: number;
    amount: number;
    is_anomalous: boolean;
    pattern_type: string;
    notes: string;
  }>): Promise<void> {
    if (!id) throw new Error('Transaction ID is required for update');
    const docRef = doc(collection(db, 'transactions'), id);

    const updatePayload: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.riskScore !== undefined) {
      updatePayload.risk_score = updates.riskScore;
      updatePayload.anomaly_score = updates.riskScore / 100;
      updatePayload.is_anomalous = updates.riskScore >= 65 || updates.status === 'flagged' || updates.status === 'blocked';
    }

    try {
      await updateDoc(docRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
    }
  }

  /**
   * Delete a transaction document from Firestore
   */
  public async deleteTransaction(id: string): Promise<void> {
    if (!id) throw new Error('Transaction ID is required for deletion');
    const docRef = doc(collection(db, 'transactions'), id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  }

  /**
   * Direct one-off fetch of all Firestore transactions
   */
  public async getFirestoreTransactions(): Promise<NormalizedTransaction[]> {
    try {
      const txCollection = collection(db, 'transactions');
      const snapshot = await getDocs(query(txCollection, limit(100)));
      const results: NormalizedTransaction[] = [];
      snapshot.forEach((docSnap) => {
        results.push(this.normalizeFirestoreDoc(docSnap));
      });
      return results;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    }
  }

  /**
   * Cleanup method to unsubscribe from active snapshot listeners
   */
  public destroy() {
    if (this.unsubscribeTransactions) {
      this.unsubscribeTransactions();
      this.unsubscribeTransactions = null;
    }
    this.transactionsListeners.clear();
    this.connectionListeners.clear();
    this.hasInitialized = false;
  }
}

export const firestoreService = new FirestoreService();
