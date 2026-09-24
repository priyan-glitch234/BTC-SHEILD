import { AlertItem, AlertSeverity, AlertStatus, EntityType } from '../../src/types.js';

export class AlertEngine {
  private alerts = new Map<string, AlertItem>();

  public clear(): void {
    this.alerts.clear();
  }

  public addAlert(alert: AlertItem): void {
    this.alerts.set(alert.id, alert);
  }

  public getAlert(id: string): AlertItem | undefined {
    return this.alerts.get(id);
  }

  public getAllAlerts(): AlertItem[] {
    return Array.from(this.alerts.values()).sort((a, b) => {
      // Sort by severity (CRITICAL -> HIGH -> MEDIUM -> LOW) then by riskScore
      const severityRank: Record<AlertSeverity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = severityRank[b.severity] - severityRank[a.severity];
      if (diff !== 0) return diff;
      return b.riskScore - a.riskScore;
    });
  }

  public updateStatus(id: string, status: AlertStatus): AlertItem | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.status = status;
    }
    return alert;
  }

  public addNote(id: string, author: string, text: string): AlertItem | undefined {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        author: author || 'Analyst',
        text,
        createdAt: new Date().toISOString()
      });
    }
    return alert;
  }
}
