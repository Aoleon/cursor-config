/**
 * Batigest Integration Type Definitions
 */

export interface BatigestSyncStatus {
  pending: number;
  ready: number;
  downloaded: number;
  imported: number;
  errors: number;
  lastSync: Date | null;
  queueHealth: 'healthy' | 'warning' | 'critical';
}

export interface BatigestExportParams {
  documentType: 'devis_client' | 'facture' | 'bon_commande' | 'avoir';
  documentId: string;
  documentReference: string;
  exportData: {
    xml?: string;
    csv?: string;
    metadata: Record<string, unknown>;
  };
}

export interface BatigestAgentInfo {
  agentId: string;
  agentVersion: string;
  lastPing?: Date;
  status: 'active' | 'inactive' | 'error';
}
