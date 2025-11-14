import crypto from 'node:crypto';
import type { IStorage } from '../storage-poc';
import { withErrorHandling, NotFoundError } from './utils/error-handler';
import { logger } from '../utils/logger';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import {
  aos,
  aoLots,
  offers,
  projects,
  type AIContextualData,
  type BusinessContext,
  type RelationalContext,
  type TemporalContext,
  type AdministrativeContext,
  type TechnicalContext,
  type ContextGenerationConfig,
  type ContextGenerationResult,
  type TieredContextGenerationConfig,
  type TieredContextGenerationResult,
} from '@shared/schema';
import { TechnicalMetricsService, getTechnicalMetricsService } from './consolidated/TechnicalMetricsService';

const DEFAULT_CONTEXT_TYPES: AIContextualData['contextTypes'] = [
  'technique',
  'metier',
  'relationnel',
  'temporel',
  'administratif',
];

const DEFAULT_SCOPE: AIContextualData['scope'] = 'entity_focused';
const DEFAULT_COMPRESSION: AIContextualData['compressionLevel'] = 'light';

interface QueryMetrics {
  tablesQueried: string[];
  totalQueries: number;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export class ContextBuilderService {
  private metrics: QueryMetrics = { tablesQueried: [], totalQueries: 0 };
  private readonly terminology: Record<string, string> = {
    window: 'fenêtre',
    door: 'porte',
    shutter: 'volet',
    pvc: 'PVC',
    wood: 'bois',
    aluminum: 'aluminium',
    steel: 'acier',
    composite: 'composite',
    installation: 'pose',
    delivery: 'livraison',
    measurement: 'métré',
    assembly: 'montage',
    adjustment: 'réglage',
  };

  constructor(
    private readonly storage: IStorage,
    private readonly metricsService?: TechnicalMetricsService
  ) {}

  async buildContextualData(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
    this.resetMetrics();
    const startedAt = Date.now();

    return withErrorHandling(
      async () => {
        const data = await this.generateContext(config);
        const duration = Date.now() - startedAt;

        data.generationMetrics.executionTimeMs = duration;
        data.generationMetrics.totalTablesQueried = this.metrics.totalQueries;

        return {
          success: true,
          data,
          performance: this.buildPerformance(duration),
          recommendations: {
            suggestedOptimizations: [],
            relevanceWarnings: [],
            dataGaps: [],
          },
        } satisfies ContextGenerationResult;
      },
      {
        operation: 'buildContextualData',
        service: 'ContextBuilderService',
        metadata: {
          entityType: config.entityType,
          entityId: config.entityId,
        },
      }
    );
  }

  async buildTieredContext(config: TieredContextGenerationConfig): Promise<TieredContextGenerationResult> {
    const result = await this.buildContextualData(config);
    return {
      ...result,
      tier: config.tier ?? 'standard',
    } satisfies TieredContextGenerationResult;
  }

  private async generateContext(config: ContextGenerationConfig): Promise<AIContextualData> {
    const base = this.createBaseContext(config);

    switch (config.entityType) {
      case 'ao':
        return this.enrichAoContext(base, config.entityId);
      case 'offer':
        return this.enrichOfferContext(base, config.entityId);
      case 'project':
        return this.enrichProjectContext(base, config.entityId);
      default:
        return base;
    }
  }

  private createBaseContext(config: ContextGenerationConfig): AIContextualData {
    const filters = config.contextFilters ?? {
      includeTypes: DEFAULT_CONTEXT_TYPES,
      scope: DEFAULT_SCOPE,
    };
    const compression = config.performance?.compressionLevel ?? DEFAULT_COMPRESSION;

    return {
      entityType: config.entityType,
      entityId: config.entityId,
      requestId: crypto.randomUUID(),
      contextTypes: filters.includeTypes ?? DEFAULT_CONTEXT_TYPES,
      scope: filters.scope ?? DEFAULT_SCOPE,
      compressionLevel: compression,
      technicalContext: undefined,
      businessContext: undefined,
      relationalContext: undefined,
      temporalContext: undefined,
      administrativeContext: undefined,
      generationMetrics: {
        totalTablesQueried: 0,
        executionTimeMs: 0,
        cachingUsed: false,
        dataFreshnessScore: 1,
        relevanceScore: 1,
      },
      tokenEstimate: 0,
      frenchTerminology: { ...this.terminology },
      keyInsights: [],
    } satisfies AIContextualData;
  }

  private async enrichAoContext(base: AIContextualData, aoId: string): Promise<AIContextualData> {
    this.trackQuery('aos');
    const aoRecord = await db.query.aos.findFirst({ where: eq(aos.id, aoId) });
    if (!aoRecord) {
      throw new NotFoundError(`Appel d'offres ${aoId} introuvable`);
    }

    const lots = await this.fetchAoLots(aoId);

    base.businessContext = this.buildBusinessContextFromAo(aoRecord, lots);
    base.technicalContext = this.buildTechnicalContextFromLots(lots);
    base.relationalContext = this.buildRelationalContextFromAo(aoRecord);
    base.temporalContext = this.buildTemporalContextFromAo(aoRecord, lots);
    base.administrativeContext = this.buildAdministrativeContextFromAo(aoRecord);
    base.keyInsights.push(`AO ${aoRecord.reference} – statut ${aoRecord.status ?? 'inconnu'}`);

    return base;
  }

  private async enrichOfferContext(base: AIContextualData, offerId: string): Promise<AIContextualData> {
    this.trackQuery('offers');
    const offerRecord = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
    if (!offerRecord) {
      throw new NotFoundError(`Offre ${offerId} introuvable`);
    }

    const aoLotsForOffer = offerRecord.aoId ? await this.fetchAoLots(offerRecord.aoId) : [];

    base.businessContext = this.buildBusinessContextFromOffer(offerRecord, aoLotsForOffer);
    base.technicalContext = this.buildTechnicalContextFromLots(aoLotsForOffer);
    base.relationalContext = this.buildRelationalContextFromOffer(offerRecord);
    base.temporalContext = this.buildTemporalContextFromOffer(offerRecord);
    base.administrativeContext = this.buildAdministrativeContextFromOffer(offerRecord);
    base.keyInsights.push(`Offre ${offerRecord.reference ?? offerRecord.id} – statut ${offerRecord.status ?? 'inconnu'}`);

    return base;
  }

  private async enrichProjectContext(base: AIContextualData, projectId: string): Promise<AIContextualData> {
    this.trackQuery('projects');
    const projectRecord = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
    if (!projectRecord) {
      throw new NotFoundError(`Projet ${projectId} introuvable`);
    }

    base.businessContext = this.buildBusinessContextFromProject(projectRecord);
    base.technicalContext = this.buildTechnicalContextFromProject(projectRecord);
    base.relationalContext = this.buildRelationalContextFromProject(projectRecord);
    base.temporalContext = this.buildTemporalContextFromProject(projectRecord);
    base.administrativeContext = this.buildAdministrativeContextFromProject(projectRecord);
    base.keyInsights.push(`Projet ${projectRecord.reference ?? projectRecord.id} – avancement ${projectRecord.status ?? 'inconnu'}`);

    return base;
  }

  private async fetchAoLots(aoId: string): Promise<Array<Record<string, any>>> {
    this.trackQuery('ao_lots');
    return db.query.aoLots.findMany({ where: eq(aoLots.aoId, aoId) });
  }

  private buildBusinessContextFromAo(aoRecord: Record<string, any>, lots: Array<Record<string, any>>): BusinessContext {
    const estimatedAmount = toNumber(aoRecord.montantEstime ?? aoRecord.amountEstimate);
    const priority = (aoRecord.priority as BusinessContext['projectClassification']['priority'])
      ?? ('normale' as BusinessContext['projectClassification']['priority']);

    return {
      currentPhase: aoRecord.status ?? 'inconnu',
      completedPhases: this.extractCompletedPhases(aoRecord.status),
      nextMilestones: this.buildMilestonesFromDates({
        remise: aoRecord.dateLimiteRemise,
        demarrage: aoRecord.demarragePrevu,
        livraison: aoRecord.dateLivraisonPrevue,
      }),
      financials: {
        estimatedAmount: estimatedAmount,
        confirmedAmount: toNumber(aoRecord.amountSigned),
        margin: toNumber(aoRecord.expectedMargin),
        profitabilityScore: undefined,
      },
      projectClassification: {
        size: this.classifyProjectSize(estimatedAmount),
        complexity: this.estimateComplexity(lots.length),
        priority,
        riskLevel: this.estimateRiskLevel(lots.length, aoRecord.typeMarche),
      },
      menuiserieSpecifics: {
        productTypes: this.extractProductTypes(lots),
        installationMethods: this.inferInstallationMethods(lots),
        qualityStandards: this.identifyQualityStandards(aoRecord.menuiserieType),
        commonIssues: this.predictCommonIssues(lots.length),
      },
    } satisfies BusinessContext;
  }

  private buildBusinessContextFromOffer(offerRecord: Record<string, any>, lots: Array<Record<string, any>>): BusinessContext {
    const estimatedAmount = toNumber(offerRecord.amountTotal ?? offerRecord.amountEstimate);
    const priority = (offerRecord.priority as BusinessContext['projectClassification']['priority'])
      ?? ('normale' as BusinessContext['projectClassification']['priority']);

    return {
      currentPhase: offerRecord.status ?? 'inconnu',
      completedPhases: this.extractCompletedPhases(offerRecord.status),
      nextMilestones: this.buildMilestonesFromDates({
        remise: offerRecord.submissionDeadline,
        demarrage: offerRecord.expectedStart,
        livraison: offerRecord.expectedDelivery,
      }),
      financials: {
        estimatedAmount,
        confirmedAmount: toNumber(offerRecord.amountAwarded),
        margin: toNumber(offerRecord.marginRate),
        profitabilityScore: undefined,
      },
      projectClassification: {
        size: this.classifyProjectSize(estimatedAmount),
        complexity: this.estimateComplexity(lots.length),
        priority,
        riskLevel: this.estimateRiskLevel(lots.length, offerRecord.contractType),
      },
      menuiserieSpecifics: {
        productTypes: this.extractProductTypes(lots),
        installationMethods: this.inferInstallationMethods(lots),
        qualityStandards: this.identifyQualityStandards(offerRecord.menuiserieType),
        commonIssues: this.predictCommonIssues(lots.length),
      },
    } satisfies BusinessContext;
  }

  private buildBusinessContextFromProject(projectRecord: Record<string, any>): BusinessContext {
    const estimatedAmount = toNumber(projectRecord.amountInitial ?? projectRecord.amountCurrent);
    const priority = (projectRecord.priority as BusinessContext['projectClassification']['priority'])
      ?? ('normale' as BusinessContext['projectClassification']['priority']);

    return {
      currentPhase: projectRecord.status ?? 'inconnu',
      completedPhases: this.extractCompletedPhases(projectRecord.status),
      nextMilestones: this.buildMilestonesFromDates({
        remise: projectRecord.nextMilestoneDate,
        demarrage: projectRecord.startDate,
        livraison: projectRecord.endDate,
      }),
      financials: {
        estimatedAmount,
        confirmedAmount: toNumber(projectRecord.amountInvoiced),
        margin: toNumber(projectRecord.marginAchieved),
        profitabilityScore: toNumber(projectRecord.profitabilityScore),
      },
      projectClassification: {
        size: this.classifyProjectSize(estimatedAmount),
        complexity: this.estimateProjectComplexity(projectRecord),
        priority,
        riskLevel: this.estimateProjectRiskLevel(projectRecord),
      },
      menuiserieSpecifics: {
        productTypes: this.extractProjectProducts(projectRecord),
        installationMethods: this.inferProjectInstallationMethods(projectRecord),
        qualityStandards: this.identifyProjectStandards(projectRecord),
        commonIssues: this.predictProjectIssues(projectRecord),
      },
    } satisfies BusinessContext;
  }

  private buildTechnicalContextFromLots(lots: Array<Record<string, any>>): TechnicalContext | undefined {
    if (!lots.length) {
      return undefined;
    }

    const primary = new Set<string>();
    const finishes = new Set<string>();
    const certifications = new Set<string>();

    lots.forEach((lot) => {
      if (typeof lot.material === 'string') {
        primary.add(lot.material);
      }
      if (Array.isArray(lot.materials)) {
        lot.materials.forEach((material: unknown) => {
          if (typeof material === 'string') {
            primary.add(material);
          }
        });
      }
      if (typeof lot.finish === 'string') {
        finishes.add(lot.finish);
      }
      if (Array.isArray(lot.certifications)) {
        lot.certifications.forEach((cert: unknown) => {
          if (typeof cert === 'string') {
            certifications.add(cert);
          }
        });
      }
    });

    return {
      materials: {
        primary: Array.from(primary),
        secondary: [],
        finishes: Array.from(finishes),
        certifications: Array.from(certifications),
      },
      performance: {},
      standards: {
        dt: this.identifyDTUStandards(lots),
        nf: this.identifyNFStandards(lots),
        ce: ['EN 14351-1'],
        other: ['QUALIBAT 3512'],
      },
      constraints: {
        structural: ['Coordination multi-lots'],
        installation: ['Respect planning fournisseur'],
        environmental: ['Gestion intempéries'],
      },
    } satisfies TechnicalContext;
  }

  private buildTechnicalContextFromProject(projectRecord: Record<string, any>): TechnicalContext | undefined {
    if (!projectRecord) {
      return undefined;
    }
    return {
      materials: {
        primary: this.extractProjectProducts(projectRecord),
        secondary: [],
        finishes: [],
        certifications: projectRecord.certifications ?? [],
      },
      performance: projectRecord.performanceMetrics ?? {},
      standards: {
        dt: projectRecord.dtuReferences ?? [],
        nf: projectRecord.nfReferences ?? [],
        ce: projectRecord.ceReferences ?? [],
        other: projectRecord.otherStandards ?? [],
      },
      constraints: {
        structural: projectRecord.structuralConstraints ?? [],
        installation: projectRecord.installationConstraints ?? [],
        environmental: projectRecord.environmentalConstraints ?? [],
      },
    } satisfies TechnicalContext;
  }

  private buildRelationalContextFromAo(aoRecord: Record<string, any>): RelationalContext {
    return {
      mainActors: {
        client: {
          name: aoRecord.clientName ?? aoRecord.client ?? 'Client non renseigné',
          type: aoRecord.typeMarche === 'public' ? 'public' : 'private',
          recurrency: (aoRecord.clientRecurrency as RelationalContext['mainActors']['client']['recurrency'])
            ?? 'occasionnel',
          criticalRequirements: [],
        },
        suppliers: [],
      },
      collaborationHistory: {
        withClient: {
          previousProjects: 0,
          successRate: 0,
          averageMargin: 0,
        },
        withSuppliers: {},
      },
      network: {
        recommendedSuppliers: [],
        blacklistedSuppliers: [],
        strategicPartners: [],
      },
    } satisfies RelationalContext;
  }

  private buildRelationalContextFromOffer(offerRecord: Record<string, any>): RelationalContext {
    return {
      mainActors: {
        client: {
          name: offerRecord.clientName ?? 'Client non renseigné',
          type: offerRecord.contractType === 'public' ? 'public' : 'private',
          recurrency: 'occasionnel',
          criticalRequirements: [],
        },
        suppliers: [],
      },
      collaborationHistory: {
        withClient: {
          previousProjects: 0,
          successRate: 0,
          averageMargin: 0,
        },
        withSuppliers: {},
      },
      network: {
        recommendedSuppliers: [],
        blacklistedSuppliers: [],
        strategicPartners: [],
      },
    } satisfies RelationalContext;
  }

  private buildRelationalContextFromProject(projectRecord: Record<string, any>): RelationalContext {
    return {
      mainActors: {
        client: {
          name: projectRecord.clientName ?? 'Client non renseigné',
          type: projectRecord.clientType ?? 'private',
          recurrency: projectRecord.clientRecurrency ?? 'occasionnel',
          criticalRequirements: [],
        },
        suppliers: projectRecord.suppliers?.map((supplier: Record<string, any>) => ({
          name: supplier.name ?? 'Fournisseur',
          role: supplier.role ?? 'fabricant',
          reliability: toNumber(supplier.reliability) ?? 0.7,
          specialties: supplier.specialties ?? [],
          currentStatus: supplier.status ?? 'actif',
        })) ?? [],
      },
      collaborationHistory: {
        withClient: {
          previousProjects: projectRecord.previousProjects ?? 0,
          successRate: toNumber(projectRecord.clientSuccessRate) ?? 0,
          averageMargin: toNumber(projectRecord.clientAverageMargin) ?? 0,
        },
        withSuppliers: {},
      },
      network: {
        recommendedSuppliers: projectRecord.recommendedSuppliers ?? [],
        blacklistedSuppliers: projectRecord.blacklistedSuppliers ?? [],
        strategicPartners: projectRecord.strategicPartners ?? [],
      },
    } satisfies RelationalContext;
  }

  private buildTemporalContextFromAo(aoRecord: Record<string, any>, lots: Array<Record<string, any>>): TemporalContext {
    const seasonalFactors = this.deriveSeasonalFactors(aoRecord.demarragePrevu);

    return {
      timeline: {
        projectStart: formatDate(aoRecord.demarragePrevu) ?? 'inconnu',
        estimatedEnd: formatDate(aoRecord.dateLivraisonPrevue) ?? 'inconnu',
        criticalDeadlines: this.buildDeadlinesFromAo(aoRecord),
      },
      temporalConstraints: {
        seasonalFactors,
        weatherDependencies: ['Conditions météo chantier'],
        resourceAvailability: this.estimateResourceAvailability(lots.length),
        externalDependencies: [],
      },
      delayHistory: {
        averageProjectDuration: 0,
        commonDelayFactors: [],
        seasonalVariations: {},
      },
      alerts: this.buildTemporalAlerts(aoRecord),
    } satisfies TemporalContext;
  }

  private buildTemporalContextFromOffer(offerRecord: Record<string, any>): TemporalContext {
    return {
      timeline: {
        projectStart: formatDate(offerRecord.expectedStart) ?? 'inconnu',
        estimatedEnd: formatDate(offerRecord.expectedDelivery) ?? 'inconnu',
        criticalDeadlines: this.buildDeadlinesFromOffer(offerRecord),
      },
      temporalConstraints: {
        seasonalFactors: this.deriveSeasonalFactors(offerRecord.expectedStart),
        weatherDependencies: ['Prévoir marges intempéries'],
        resourceAvailability: {},
        externalDependencies: [],
      },
      delayHistory: {
        averageProjectDuration: 0,
        commonDelayFactors: [],
        seasonalVariations: {},
      },
      alerts: [],
    } satisfies TemporalContext;
  }

  private buildTemporalContextFromProject(projectRecord: Record<string, any>): TemporalContext {
    return {
      timeline: {
        projectStart: formatDate(projectRecord.startDate) ?? 'inconnu',
        estimatedEnd: formatDate(projectRecord.endDate) ?? 'inconnu',
        criticalDeadlines: projectRecord.milestones?.map((milestone: Record<string, any>) => ({
          date: formatDate(milestone.date) ?? 'inconnu',
          description: milestone.label ?? 'jalon',
          importance: milestone.importance ?? 'milestone',
        })) ?? [],
      },
      temporalConstraints: {
        seasonalFactors: projectRecord.seasonalConstraints ?? [],
        weatherDependencies: projectRecord.weatherDependencies ?? [],
        resourceAvailability: projectRecord.resourceAvailability ?? {},
        externalDependencies: projectRecord.externalDependencies ?? [],
      },
      delayHistory: {
        averageProjectDuration: toNumber(projectRecord.averageDuration) ?? 0,
        commonDelayFactors: projectRecord.delayFactors ?? [],
        seasonalVariations: projectRecord.seasonalVariations ?? {},
      },
      alerts: projectRecord.temporalAlerts ?? [],
    } satisfies TemporalContext;
  }

  private buildAdministrativeContextFromAo(aoRecord: Record<string, any>): AdministrativeContext {
    return {
      requiredDocuments: {
        completed: aoRecord.completedDocuments ?? [],
        pending: aoRecord.pendingDocuments ?? [],
        missing: aoRecord.missingDocuments ?? [],
        upcoming: [],
      },
      regulatory: {
        permits: aoRecord.permits ?? [],
        inspections: aoRecord.inspections ?? [],
      },
      internalProcesses: {
        validationSteps: [],
        qualityControls: [],
      },
      insurance: {
        coverage: aoRecord.insuranceCoverage ?? [],
        validUntil: formatDate(aoRecord.insuranceValidUntil) ?? 'inconnu',
        specificConditions: aoRecord.insuranceConditions ?? [],
      },
    } satisfies AdministrativeContext;
  }

  private buildAdministrativeContextFromOffer(offerRecord: Record<string, any>): AdministrativeContext {
    return {
      requiredDocuments: {
        completed: offerRecord.completedDocuments ?? [],
        pending: offerRecord.pendingDocuments ?? [],
        missing: offerRecord.missingDocuments ?? [],
        upcoming: [],
      },
      regulatory: {
        permits: [],
        inspections: [],
      },
      internalProcesses: {
        validationSteps: [],
        qualityControls: [],
      },
      insurance: {
        coverage: [],
        validUntil: 'inconnu',
        specificConditions: [],
      },
    } satisfies AdministrativeContext;
  }

  private buildAdministrativeContextFromProject(projectRecord: Record<string, any>): AdministrativeContext {
    return {
      requiredDocuments: {
        completed: projectRecord.completedDocuments ?? [],
        pending: projectRecord.pendingDocuments ?? [],
        missing: projectRecord.missingDocuments ?? [],
        upcoming: projectRecord.upcomingDocuments ?? [],
      },
      regulatory: {
        permits: projectRecord.permits ?? [],
        inspections: projectRecord.inspections ?? [],
      },
      internalProcesses: {
        validationSteps: projectRecord.validationSteps ?? [],
        qualityControls: projectRecord.qualityControls ?? [],
      },
      insurance: {
        coverage: projectRecord.insuranceCoverage ?? [],
        validUntil: formatDate(projectRecord.insuranceValidUntil) ?? 'inconnu',
        specificConditions: projectRecord.insuranceConditions ?? [],
      },
    } satisfies AdministrativeContext;
  }

  private extractCompletedPhases(status: unknown): string[] {
    const phases = ['brouillon', 'etude', 'offre', 'execution', 'livraison'];
    const index = typeof status === 'string' ? phases.indexOf(status) : -1;
    return index > 0 ? phases.slice(0, index) : [];
  }

  private buildMilestonesFromDates(dates: Record<string, unknown>): BusinessContext['nextMilestones'] {
    const milestones: BusinessContext['nextMilestones'] = [];
    if (dates.remise) {
      milestones.push({
        type: 'remise',
        deadline: formatDate(dates.remise) ?? 'inconnu',
        criticality: 'critical',
      });
    }
    if (dates.demarrage) {
      milestones.push({
        type: 'demarrage',
        deadline: formatDate(dates.demarrage) ?? 'inconnu',
        criticality: 'medium',
      });
    }
    if (dates.livraison) {
      milestones.push({
        type: 'livraison',
        deadline: formatDate(dates.livraison) ?? 'inconnu',
        criticality: 'high',
      });
    }
    return milestones;
  }

  private extractProductTypes(lots: Array<Record<string, any>>): string[] {
    const products = new Set<string>();
    lots.forEach((lot) => {
      if (typeof lot.designation === 'string') {
        products.add(lot.designation);
      }
      if (typeof lot.category === 'string') {
        products.add(lot.category);
      }
    });
    return Array.from(products);
  }

  private inferInstallationMethods(lots: Array<Record<string, any>>): string[] {
    const methods = new Set<string>();
    lots.forEach((lot) => {
      const label = (lot.designation ?? '').toString().toLowerCase();
      if (label.includes('pose')) {
        methods.add('pose traditionnelle');
      }
      if (label.includes('scellement')) {
        methods.add('scellement chimique');
      }
      if (label.includes('vissage')) {
        methods.add('vissage direct');
      }
    });
    return Array.from(methods);
  }

  private identifyQualityStandards(menuiserieType: unknown): string[] {
    if (typeof menuiserieType !== 'string') {
      return [];
    }
    const normalized = menuiserieType.toLowerCase();
    if (normalized.includes('alu')) {
      return ['EN 14351-1', 'QUALICOAT'];
    }
    if (normalized.includes('pvc')) {
      return ['NF 126', 'CE'];
    }
    return ['NF DTU 36.5'];
  }

  private predictCommonIssues(lotCount: number): string[] {
    if (lotCount > 5) {
      return ['Coordination multi-lots', 'Suivi fournisseur critique'];
    }
    if (lotCount > 0) {
      return ['Respect planning livraison'];
    }
    return [];
  }

  private predictProjectIssues(projectRecord: Record<string, any>): string[] {
    const issues: string[] = [];
    if (projectRecord.riskAlerts?.length) {
      issues.push(...projectRecord.riskAlerts);
    }
    if (projectRecord.weatherConstraints) {
      issues.push('Sensibilité météo');
    }
    return issues;
  }

  private estimateComplexity(lotCount: number): BusinessContext['projectClassification']['complexity'] {
    if (lotCount <= 1) return 'simple';
    if (lotCount <= 3) return 'standard';
    if (lotCount <= 5) return 'complex';
    return 'expert';
  }

  private estimateRiskLevel(lotCount: number, marcheType: unknown): BusinessContext['projectClassification']['riskLevel'] {
    if (lotCount > 5) {
      return 'high';
    }
    if (marcheType === 'public') {
      return 'medium';
    }
    return 'low';
  }

  private estimateProjectComplexity(projectRecord: Record<string, any>): BusinessContext['projectClassification']['complexity'] {
    const lots = toNumber(projectRecord.lotCount) ?? 0;
    if (lots <= 1) return 'simple';
    if (lots <= 3) return 'standard';
    if (lots <= 6) return 'complex';
    return 'expert';
  }

  private estimateProjectRiskLevel(projectRecord: Record<string, any>): BusinessContext['projectClassification']['riskLevel'] {
    if (projectRecord.riskLevel && ['low', 'medium', 'high'].includes(projectRecord.riskLevel)) {
      return projectRecord.riskLevel as BusinessContext['projectClassification']['riskLevel'];
    }
    return projectRecord.isCritical ? 'high' : 'medium';
  }

  private identifyDTUStandards(lots: Array<Record<string, any>>): string[] {
    const standards = new Set<string>();
    lots.forEach((lot) => {
      const category = (lot.category ?? '').toString().toLowerCase();
      if (category.includes('menuiserie')) {
        standards.add('DTU 36.5 - Menuiseries extérieures');
      }
      if (category.includes('cloison')) {
        standards.add('DTU 25.41 - Cloisons sèches');
      }
    });
    return Array.from(standards);
  }

  private identifyNFStandards(lots: Array<Record<string, any>>): string[] {
    const standards = new Set<string>();
    lots.forEach((lot) => {
      const label = (lot.designation ?? '').toString().toLowerCase();
      if (label.includes('pvc')) {
        standards.add('NF 126');
      }
      if (label.includes('bois')) {
        standards.add('NF B 54-002');
      }
    });
    return Array.from(standards);
  }

  private deriveSeasonalFactors(start: unknown): string[] {
    const factors: string[] = [];
    const date = start ? new Date(start as string) : undefined;
    if (date && !Number.isNaN(date.getTime())) {
      const month = date.getMonth();
      if (month >= 10 || month <= 1) {
        factors.push('Risques hivernaux');
      }
      if (month >= 5 && month <= 7) {
        factors.push('Période estivale - planifier congés');
      }
    }
    return factors;
  }

  private buildDeadlinesFromAo(aoRecord: Record<string, any>): TemporalContext['timeline']['criticalDeadlines'] {
    const deadlines: TemporalContext['timeline']['criticalDeadlines'] = [];
    if (aoRecord.dateLimiteRemise) {
      deadlines.push({
        date: formatDate(aoRecord.dateLimiteRemise) ?? 'inconnu',
        description: 'Date limite de remise',
        importance: 'contractual',
      });
    }
    if (aoRecord.demarragePrevu) {
      deadlines.push({
        date: formatDate(aoRecord.demarragePrevu) ?? 'inconnu',
        description: 'Démarrage prévu',
        importance: 'milestone',
      });
    }
    if (aoRecord.dateLivraisonPrevue) {
      deadlines.push({
        date: formatDate(aoRecord.dateLivraisonPrevue) ?? 'inconnu',
        description: 'Livraison estimée',
        importance: 'milestone',
      });
    }
    return deadlines;
  }

  private buildDeadlinesFromOffer(offerRecord: Record<string, any>): TemporalContext['timeline']['criticalDeadlines'] {
    const deadlines: TemporalContext['timeline']['criticalDeadlines'] = [];
    if (offerRecord.submissionDeadline) {
      deadlines.push({
        date: formatDate(offerRecord.submissionDeadline) ?? 'inconnu',
        description: 'Remise offre',
        importance: 'contractual',
      });
    }
    if (offerRecord.expectedDelivery) {
      deadlines.push({
        date: formatDate(offerRecord.expectedDelivery) ?? 'inconnu',
        description: 'Livraison attendue',
        importance: 'milestone',
      });
    }
    return deadlines;
  }

  private estimateResourceAvailability(lotCount: number): Record<string, string> {
    if (!lotCount) {
      return {};
    }
    return {
      'Équipe étude': lotCount > 3 ? 'fortement sollicitée' : 'disponible',
      'Équipe pose': lotCount > 5 ? 'planification nécessaire' : 'disponible',
    };
  }

  private buildTemporalAlerts(aoRecord: Record<string, any>): TemporalContext['alerts'] {
    const alerts: TemporalContext['alerts'] = [];
    if (aoRecord.dateLimiteRemise) {
      const deadline = new Date(aoRecord.dateLimiteRemise);
      const now = new Date();
      const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (!Number.isNaN(diff) && diff <= 7) {
        alerts.push({
          type: 'deadline',
          severity: 'warning',
          message: 'Échéance proche pour la remise de l\'offre',
          daysToDeadline: diff,
        });
      }
    }
    return alerts;
  }

  private extractProjectProducts(projectRecord: Record<string, any>): string[] {
    if (Array.isArray(projectRecord.products)) {
      return projectRecord.products.filter((item: unknown): item is string => typeof item === 'string');
    }
    if (typeof projectRecord.productType === 'string') {
      return [projectRecord.productType];
    }
    return [];
  }

  private inferProjectInstallationMethods(projectRecord: Record<string, any>): string[] {
    return projectRecord.installationMethods ?? [];
  }

  private identifyProjectStandards(projectRecord: Record<string, any>): string[] {
    return projectRecord.standards ?? ['DTU 36.5'];
  }

  private buildPerformance(duration: number): ContextGenerationResult['performance'] {
    return {
      executionTimeMs: duration,
      tablesQueried: [...this.metrics.tablesQueried],
      cacheHitRate: 0,
      dataFreshness: 1,
    };
  }

  private trackQuery(table: string): void {
    this.metrics.totalQueries += 1;
    if (!this.metrics.tablesQueried.includes(table)) {
      this.metrics.tablesQueried.push(table);
    }
  }

  private resetMetrics(): void {
    this.metrics = { tablesQueried: [], totalQueries: 0 };
  }
}

let globalContextBuilderService: ContextBuilderService | null = null;

export function getContextBuilderService(
  storage: IStorage,
  performanceMetricsService?: TechnicalMetricsService
): ContextBuilderService {
  if (!globalContextBuilderService) {
    const metricsService = performanceMetricsService ?? getTechnicalMetricsService(storage);
    globalContextBuilderService = new ContextBuilderService(storage, metricsService);
    logger.info('ContextBuilderService initialisé', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'initialize',
      },
    });
  }
  return globalContextBuilderService;
}

export function resetContextBuilderService(): void {
  globalContextBuilderService = null;
}
