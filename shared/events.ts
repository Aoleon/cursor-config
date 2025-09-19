import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// ========================================
// Types d'événements métier prioritaires
// ========================================

export enum EventType {
  // Offres
  OFFER_STATUS_CHANGED = 'offer.status_changed',
  OFFER_SIGNED = 'offer.signed',
  OFFER_VALIDATED = 'offer.validated',
  OFFER_CREATED = 'offer.created',
  
  // Projets  
  PROJECT_CREATED = 'project.created',
  PROJECT_STATUS_CHANGED = 'project.status_changed',
  PROJECT_TASK_ASSIGNED = 'project.task_assigned',
  
  // Tâches
  TASK_OVERDUE = 'task.overdue', 
  TASK_STATUS_CHANGED = 'task.status_changed',
  TASK_DEADLINE_APPROACHING = 'task.deadline_approaching',
  
  // Validations
  VALIDATION_MILESTONE_VALIDATED = 'validation_milestone.validated',
  VALIDATION_MILESTONE_REJECTED = 'validation_milestone.rejected',
  
  // Chiffrage
  CHIFFRAGE_COMPLETED = 'chiffrage.completed',
  SUPPLIER_QUOTE_RECEIVED = 'supplier_quote.received',
  
  // KPIs & Système
  KPI_REFRESH_HINT = 'kpi.refresh_hint',
  SYSTEM_MAINTENANCE = 'system.maintenance',
  
  // Fournisseurs
  SUPPLIER_REQUEST_SENT = 'supplier_request.sent',
  SUPPLIER_RESPONSE_RECEIVED = 'supplier_response.received',
  
  // Priorités intelligentes
  PRIORITY_SCORE_UPDATED = 'priority.score_updated',
  PRIORITY_LEVEL_CHANGED = 'priority.level_changed',
  PRIORITY_OVERRIDE_APPLIED = 'priority.override_applied',
  PRIORITY_ALERT_CREATED = 'priority.alert_created',
  PRIORITY_CONFIG_UPDATED = 'priority.config_updated',
  
  // Métriques et performances
  WORKLOAD_UPDATED = 'workload.updated',
  PERFORMANCE_METRICS_UPDATED = 'performance.metrics_updated',
  HOURS_VARIANCE_ALERT = 'hours.variance_alert',
  ESTIMATION_ACCURACY_ALERT = 'estimation.accuracy_alert',
  
  // Gantt et planification
  GANTT_TASK_MOVED = 'gantt.task_moved',
  GANTT_TASK_RESIZED = 'gantt.task_resized',
  GANTT_DEPENDENCY_CREATED = 'gantt.dependency_created',
  GANTT_MILESTONE_CREATED = 'gantt.milestone_created',
  
  // Alertes techniques OCR
  TECHNICAL_ALERT = 'technical.alert'
}

// ========================================
// Schema événement temps réel
// ========================================

export const realtimeEventSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(EventType),
  entity: z.enum(['offer', 'project', 'task', 'validation', 'supplier', 'system', 'technical']),
  entityId: z.string(),
  
  // Relations pour navigation et contexte
  projectId: z.string().optional(),
  offerId: z.string().optional(),
  taskId: z.string().optional(),
  
  // Informations de changement d'état
  prevStatus: z.string().optional(),
  newStatus: z.string().optional(),
  
  // Métadonnées de notification
  severity: z.enum(['info', 'warning', 'success', 'error']),
  message: z.string(),
  title: z.string().optional(),
  
  // Pour invalidation cache ciblée TanStack Query
  affectedQueryKeys: z.array(z.array(z.string())),
  
  // Métadonnées système
  timestamp: z.string().datetime(),
  userId: z.string().optional(), // Pour filtrage futur
  
  // Données additionnelles contextuelles
  metadata: z.record(z.any()).optional(),
});

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

// ========================================
// Schema pour filtrage des événements
// ========================================

export const eventFilterSchema = z.object({
  eventTypes: z.array(z.nativeEnum(EventType)).optional(),
  entities: z.array(z.string()).optional(),
  entityIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
  offerIds: z.array(z.string()).optional(),
  severities: z.array(z.enum(['info', 'warning', 'success', 'error'])).optional(),
  userId: z.string().optional(),
});

export type EventFilter = z.infer<typeof eventFilterSchema>;

// ========================================
// Messages WebSocket
// ========================================

export const wsMessageSchema = z.discriminatedUnion('type', [
  // Événement temps réel
  z.object({
    type: z.literal('event'),
    data: realtimeEventSchema,
  }),
  
  // Heartbeat
  z.object({
    type: z.literal('ping'),
    timestamp: z.string().datetime(),
  }),
  
  z.object({
    type: z.literal('pong'),
    timestamp: z.string().datetime(),
  }),
  
  // Authentification
  z.object({
    type: z.literal('auth'),
    token: z.string().optional(),
  }),
  
  z.object({
    type: z.literal('auth_success'),
    userId: z.string(),
  }),
  
  z.object({
    type: z.literal('auth_error'),
    message: z.string(),
  }),
  
  // Souscription aux événements
  z.object({
    type: z.literal('subscribe'),
    filter: eventFilterSchema.optional(),
  }),
  
  z.object({
    type: z.literal('unsubscribe'),
  }),
  
  // Erreurs système
  z.object({
    type: z.literal('error'),
    message: z.string(),
    code: z.string().optional(),
  }),
]);

export type WsMessage = z.infer<typeof wsMessageSchema>;

// ========================================
// Templates de messages métier
// ========================================

export const eventMessageTemplates: Record<EventType, (event: RealtimeEvent) => { title: string; message: string }> = {
  [EventType.OFFER_SIGNED]: (event) => ({
    title: "Offre signée",
    message: `✅ L'offre ${event.metadata?.reference || event.entityId} a été signée par le client`
  }),
  
  [EventType.OFFER_VALIDATED]: (event) => ({
    title: "Validation terminée",
    message: `🎯 Validation fin d'études terminée pour l'offre ${event.metadata?.reference || event.entityId}`
  }),
  
  [EventType.OFFER_STATUS_CHANGED]: (event) => ({
    title: "Statut offre modifié",
    message: `📋 Offre ${event.metadata?.reference || event.entityId} : ${event.prevStatus} → ${event.newStatus}`
  }),
  
  [EventType.PROJECT_CREATED]: (event) => ({
    title: "Nouveau projet",
    message: `🚀 Nouveau projet créé : ${event.metadata?.name || event.entityId}`
  }),
  
  [EventType.PROJECT_STATUS_CHANGED]: (event) => ({
    title: "Statut projet modifié",
    message: `📊 Projet ${event.metadata?.name || event.entityId} : ${event.prevStatus} → ${event.newStatus}`
  }),
  
  [EventType.TASK_OVERDUE]: (event) => ({
    title: "Tâche en retard",
    message: `⚠️ Tâche en retard : ${event.metadata?.name || event.entityId} (${event.metadata?.delayDays || 'N/A'} jours)`
  }),
  
  [EventType.TASK_STATUS_CHANGED]: (event) => ({
    title: "Tâche mise à jour",
    message: `✓ Tâche ${event.metadata?.name || event.entityId} : ${event.prevStatus} → ${event.newStatus}`
  }),
  
  [EventType.TASK_DEADLINE_APPROACHING]: (event) => ({
    title: "Échéance proche",
    message: `📅 Tâche ${event.metadata?.name || event.entityId} due dans ${event.metadata?.daysUntilDue || 'N/A'} jours`
  }),
  
  [EventType.VALIDATION_MILESTONE_VALIDATED]: (event) => ({
    title: "Jalon validé",
    message: `✅ Jalon ${event.metadata?.milestoneName || 'validation'} validé par ${event.metadata?.validatorName || 'l\'équipe'}`
  }),
  
  [EventType.VALIDATION_MILESTONE_REJECTED]: (event) => ({
    title: "Jalon rejeté",
    message: `❌ Jalon ${event.metadata?.milestoneName || 'validation'} rejeté : ${event.metadata?.reason || 'voir détails'}`
  }),
  
  [EventType.CHIFFRAGE_COMPLETED]: (event) => ({
    title: "Chiffrage terminé",
    message: `💰 Chiffrage terminé pour l'offre ${event.metadata?.reference || event.entityId}`
  }),
  
  [EventType.SUPPLIER_QUOTE_RECEIVED]: (event) => ({
    title: "Devis fournisseur reçu",
    message: `📦 Nouveau devis reçu de ${event.metadata?.supplierName || 'fournisseur'}`
  }),
  
  [EventType.SUPPLIER_REQUEST_SENT]: (event) => ({
    title: "Demande fournisseur envoyée",
    message: `📤 Demande de prix envoyée à ${event.metadata?.supplierName || 'fournisseur'}`
  }),
  
  [EventType.SUPPLIER_RESPONSE_RECEIVED]: (event) => ({
    title: "Réponse fournisseur",
    message: `📥 Réponse reçue de ${event.metadata?.supplierName || 'fournisseur'}`
  }),
  
  [EventType.KPI_REFRESH_HINT]: (event) => ({
    title: "Données mises à jour",
    message: `📊 Les indicateurs ont été actualisés`
  }),
  
  [EventType.SYSTEM_MAINTENANCE]: (event) => ({
    title: "Maintenance système",
    message: `🔧 ${event.message}`
  }),
  
  [EventType.OFFER_CREATED]: (event) => ({
    title: "Nouvelle offre",
    message: `📋 Nouvelle offre créée : ${event.metadata?.reference || event.entityId}`
  }),
  
  [EventType.PROJECT_TASK_ASSIGNED]: (event) => ({
    title: "Tâche assignée",
    message: `👤 Tâche ${event.metadata?.taskName || 'nouvelle'} assignée à ${event.metadata?.assigneeName || 'l\'équipe'}`
  }),
  
  // Priorités intelligentes
  [EventType.PRIORITY_SCORE_UPDATED]: (event) => ({
    title: "Score de priorité mis à jour",
    message: `🎯 Score: ${event.metadata?.oldScore || 'N/A'} → ${event.metadata?.newScore || 'N/A'} pour ${event.metadata?.itemName || event.entityId}`
  }),
  
  [EventType.PRIORITY_LEVEL_CHANGED]: (event) => ({
    title: "Niveau de priorité modifié",
    message: `🔺 Priorité ${event.metadata?.itemName || event.entityId}: ${event.prevStatus} → ${event.newStatus}`
  }),
  
  [EventType.PRIORITY_OVERRIDE_APPLIED]: (event) => ({
    title: "Priorité forcée manuellement",
    message: `⚡ Priorité forcée pour ${event.metadata?.itemName || event.entityId}: ${event.newStatus} (${event.metadata?.reason || 'Aucune raison'})`
  }),
  
  [EventType.PRIORITY_ALERT_CREATED]: (event) => ({
    title: "Alerte de priorité critique",
    message: `🚨 Nouvelle alerte critique: ${event.metadata?.itemName || event.entityId} (Score: ${event.metadata?.score || 'N/A'})`
  }),
  
  [EventType.PRIORITY_CONFIG_UPDATED]: (event) => ({
    title: "Configuration priorité mise à jour",
    message: `⚙️ Règles de priorisation mises à jour par ${event.metadata?.updatedBy || 'admin'}`
  }),
  
  // Métriques et performances  
  [EventType.WORKLOAD_UPDATED]: (event) => ({
    title: "Charge de travail mise à jour",
    message: `📊 Charge BE mise à jour: ${event.metadata?.memberName || 'équipe'} (${event.metadata?.newLoad || 'N/A'}%)`
  }),
  
  [EventType.PERFORMANCE_METRICS_UPDATED]: (event) => ({
    title: "Métriques de performance actualisées",
    message: `📈 Précision: ${event.metadata?.accuracy || 'N/A'}% | Productivité: ${event.metadata?.productivity || 'N/A'}%`
  }),
  
  [EventType.HOURS_VARIANCE_ALERT]: (event) => ({
    title: "Écart important d'heures détecté",
    message: `⚠️ Écart de ${event.metadata?.variancePercent || 'N/A'}% détecté pour ${event.metadata?.itemName || event.entityId}`
  }),
  
  [EventType.ESTIMATION_ACCURACY_ALERT]: (event) => ({
    title: "Précision d'estimation faible",
    message: `📉 Précision d'estimation à ${event.metadata?.accuracy || 'N/A'}% (seuil: ${event.metadata?.threshold || '70'}%)`
  }),
  
  // Gantt et planification
  [EventType.GANTT_TASK_MOVED]: (event) => ({
    title: "Tâche déplacée",
    message: `📅 ${event.metadata?.taskName || 'Tâche'} déplacée: ${event.metadata?.oldDate || 'N/A'} → ${event.metadata?.newDate || 'N/A'}`
  }),
  
  [EventType.GANTT_TASK_RESIZED]: (event) => ({
    title: "Durée de tâche modifiée", 
    message: `⏱️ ${event.metadata?.taskName || 'Tâche'} redimensionnée: ${event.metadata?.oldDuration || 'N/A'} → ${event.metadata?.newDuration || 'N/A'} jours`
  }),
  
  [EventType.GANTT_DEPENDENCY_CREATED]: (event) => ({
    title: "Dépendance créée",
    message: `🔗 Dépendance créée entre ${event.metadata?.fromTask || 'tâche'} → ${event.metadata?.toTask || 'tâche'}`
  }),
  
  [EventType.GANTT_MILESTONE_CREATED]: (event) => ({
    title: "Nouveau jalon créé",
    message: `🎯 Jalon "${event.metadata?.milestoneName || 'Nouveau jalon'}" créé le ${event.metadata?.date || 'N/A'}`
  }),
};

// ========================================
// Helpers pour création d'événements
// ========================================

export function createRealtimeEvent(params: {
  type: EventType;
  entity: RealtimeEvent['entity'];
  entityId: string;
  severity: RealtimeEvent['severity'];
  message?: string;
  title?: string;
  affectedQueryKeys: string[][];
  projectId?: string;
  offerId?: string;
  taskId?: string;
  prevStatus?: string;
  newStatus?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): RealtimeEvent {
  const templates = eventMessageTemplates[params.type];
  const generatedMessage = templates ? templates({ ...params, id: '', timestamp: new Date().toISOString() } as RealtimeEvent) : null;
  
  return {
    id: crypto.randomUUID(),
    type: params.type,
    entity: params.entity,
    entityId: params.entityId,
    projectId: params.projectId,
    offerId: params.offerId,
    taskId: params.taskId,
    prevStatus: params.prevStatus,
    newStatus: params.newStatus,
    severity: params.severity,
    message: params.message || generatedMessage?.message || `Événement ${params.type}`,
    title: params.title || generatedMessage?.title,
    affectedQueryKeys: params.affectedQueryKeys,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    metadata: params.metadata,
  };
}

// Helpers pour query keys communes
export const commonQueryKeys = {
  offers: () => ['/api/offers'],
  offer: (id: string) => ['/api/offers', id],
  projects: () => ['/api/projects'],
  project: (id: string) => ['/api/projects', id],
  tasks: () => ['/api/tasks'],
  task: (id: string) => ['/api/tasks', id],
  dashboardKpis: (filter?: string) => filter ? ['/api/dashboard/kpis', filter] : ['/api/dashboard/kpis'],
  dashboardStats: () => ['/api/dashboard/stats'],
  beWorkload: () => ['/api/be-workload'],
  validationMilestones: (entityType?: string, entityId?: string) => 
    entityType && entityId ? ['/api/validation-milestones', entityType, entityId] : ['/api/validation-milestones'],
  suppliers: () => ['/api/suppliers'],
  supplierRequests: () => ['/api/supplier-requests'],
  
  // Nouvelles query keys pour priorités et métriques
  priorities: () => ['/api/priorities'],
  priority: (id: string) => ['/api/priorities', id],
  priorityAlerts: () => ['/api/priorities/alerts'],
  priorityHistory: (itemId: string) => ['/api/priorities', itemId, 'history'],
  priorityStats: () => ['/api/priorities/stats'],
  priorityConfig: () => ['/api/priorities/config'],
  workloadMetrics: (period?: string) => period ? ['/api/workload/performance-history', period] : ['/api/workload/performance-history'],
  projectMetrics: () => ['/api/projects/metrics'],
};