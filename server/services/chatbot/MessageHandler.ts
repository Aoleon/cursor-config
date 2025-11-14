/**
 * MESSAGE HANDLER - Chatbot Message Processing
 * 
 * Extracted from ChatbotOrchestrationService to reduce file size.
 * Handles message analysis, pattern detection, and query processing.
 * 
 * Target LOC: ~500-600
 */

import { db } from '../../db';
import { sql, eq, and, desc, gte } from 'drizzle-orm';
import { chatbotConversations } from '@shared/schema';
import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/error-handler';

// Suggestions prédéfinies par rôle métier JLM
const DEFAULT_SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  admin: [
    "Quels sont les indicateurs de performance globaux ce mois ?",
    "Affiche-moi un résumé des alertes critiques",
    "Quels projets sont en retard et pourquoi ?",
    "Analyse la rentabilité par type de projet",
    "Montre-moi les tendances de charge BE"
  ],
  chef_projet: [
    "Mes projets en cours avec leurs échéances",
    "Les alertes de mes projets cette semaine", 
    "Prochaines livraisons matériaux attendues",
    "État d'avancement de mes chantiers",
    "Ressources disponibles pour nouveaux projets"
  ],
  be_manager: [
    "Charge actuelle de l'équipe BE",
    "Projets en attente de validation technique",
    "Alertes techniques non résolues",
    "Planning des validations cette semaine",
    "Projets nécessitant expertise spécialisée"
  ],
  commercial: [
    "Nouvelles opportunités ce mois",
    "État des offres en cours",
    "Taux de conversion AO vers offres",
    "Clients potentiels à relancer",
    "Performance commerciale par région"
  ]
};

export interface QueryPattern {
  queryType: 'kpi' | 'list' | 'detail' | 'comparison' | 'aggregation' | 'action' | 'unknown';
  entities: string[];
  temporalContext?: {
    type: 'absolute' | 'relative' | 'range' | 'comparison' | 'none';
    period?: string;
  };
  aggregations?: string[];
  filters?: unknown[];
}

export class MessageHandler {
  /**
   * Détecte la complexité d'une requête
   */
  detectQueryComplexity(query: string): "simple" | "complex" | "expert" {
    const queryLower = query.toLowerCase();
    const complexKeywords = ['jointure', 'join', 'agrégation', 'group by', 'having', 'sous-requête', 'corrélation'];
    const expertKeywords = ['window function', 'cte', 'récursif', 'pivot', 'analyse temporelle'];
    
    if (expertKeywords.some(keyword => queryLower.includes(keyword))) {
      return "expert";
    }
    if (complexKeywords.some(keyword => queryLower.includes(keyword)) || query.length > 200) {
      return "complex";
    }
    return "simple";
  }

  /**
   * Analyse le pattern d'une requête
   */
  analyzeQueryPattern(query: string): QueryPattern {
    const queryLower = query.toLowerCase();
    const entities = this.detectEntities(query);
    const temporalContext = this.analyzeTemporalContext(query);
    const aggregations = this.detectAggregations(query);
    const filters = this.detectQueryFilters(query);

    let queryType: QueryPattern['queryType'] = 'unknown';
    
    // Détection du type de requête
    if (/kpi|indicateur|métrique|performance|statistique/.test(queryLower)) {
      queryType = 'kpi';
    } else if (/liste|affiche|montre|donne|voir/.test(queryLower)) {
      queryType = 'list';
    } else if (/détail|informations?|caractéristiques?/.test(queryLower)) {
      queryType = 'detail';
    } else if (/compar|vs|versus|par rapport|différence/.test(queryLower)) {
      queryType = 'comparison';
    } else if (/total|somme|moyenne|compte|nombre|agrég/.test(queryLower)) {
      queryType = 'aggregation';
    } else if (/crée|modifie|supprime|action|exécute/.test(queryLower)) {
      queryType = 'action';
    }

    return {
      queryType,
      entities,
      temporalContext,
      aggregations,
      filters
    };
  }

  /**
   * Détecte les zones de focus dans une requête
   */
  detectFocusAreas(query: string): ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] {
    const focusAreas: ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] = [];
    const queryLower = query.toLowerCase();
    
    const focusPatterns: Record<"planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes", RegExp[]> = {
      'finances': [
        /montant|prix|coût|budget|factur|chiffr|rentab|marge|ca\b/,
        /recette|dépense|bénéfice|profit/
      ],
      'planning': [
        /date|période|temps|délai|retard|planning|échéance/,
        /aujourd|hier|demain|semaine|mois|année|trimestre/
      ],
      'performance': [
        /kpi|indicateur|performance|métrique|taux|ratio/,
        /conversion|productivité|efficacité|rendement/,
        /compar|vs\b|versus|évolution|progression|tendance/
      ],
      'ressources': [
        /équipe|ressource|personnel|charge|disponibilité/,
        /be\b|bureau.*étude|planning.*ressource/
      ],
      'qualite': [
        /qualité|conformité|validation|vérification/,
        /non.*conforme|défaut|anomalie/
      ],
      'alertes': [
        /alerte|problème|risque|dépassement/,
        /critique|urgent|bloquant/
      ]
    };

    for (const [area, patterns] of Object.entries(focusPatterns)) {
      if (patterns.some(pattern => pattern.test(queryLower))) {
        focusAreas.push(area as typeof focusAreas[number]);
      }
    }

    return focusAreas;
  }

  /**
   * Détecte les entités métier dans une requête
   */
  private detectEntities(query: string): string[] {
    const entities: string[] = [];
    const queryLower = query.toLowerCase();
    
    const entityPatterns: Record<string, RegExp[]> = {
      'project': [/projet/],
      'offer': [/offre/, /devis/],
      'ao': [/ao\b/, /appel.*offre/],
      'supplier': [/fournisseur/],
      'contact': [/contact/, /client/, /architecte/, /maître.*ouvrage/, /maître.*œuvre/],
      'task': [/tâche/, /activité/],
      'team': [/équipe/, /be\b/, /bureau.*étude/, /ressource/],
      'milestone': [/jalon/, /milestone/, /étape/, /livrable/],
      'lot': [/lot\b/],
      'chantier': [/chantier/, /site/],
      'material': [/matériau/, /matériaux/, /menuiserie/, /fenêtre/, /porte/],
      'validation': [/validation/, /bouclage/, /visa/],
      'invoice': [/facture/, /facturation/],
      'payment': [/paiement/, /règlement/],
      'document': [/document/, /fichier/, /pdf/, /plan/, /cctp/]
    };

    for (const [entity, patterns] of Object.entries(entityPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          if (!entities.includes(entity)) {
            entities.push(entity);
          }
          break;
        }
      }
    }

    return entities;
  }

  /**
   * Analyse le contexte temporel d'une requête
   */
  private analyzeTemporalContext(query: string): {
    type: 'absolute' | 'relative' | 'range' | 'comparison' | 'none';
    period?: string;
  } {
    const queryLower = query.toLowerCase();
    
    // Détection de dates absolues
    const absoluteDatePattern = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/;
    if (absoluteDatePattern.test(query)) {
      return { type: 'absolute', period: 'specific_date' };
    }
    
    // Détection de périodes relatives
    const relativePatterns: Record<string, string> = {
      'aujourd\'hui': 'today',
      'hier': 'yesterday',
      'demain': 'tomorrow',
      'cette semaine': 'this_week',
      'semaine dernière': 'last_week',
      'ce mois': 'this_month',
      'mois dernier': 'last_month',
      'cette année': 'this_year',
      'année dernière': 'last_year',
      'ce trimestre': 'this_quarter',
      'trimestre dernier': 'last_quarter'
    };
    
    for (const [pattern, period] of Object.entries(relativePatterns)) {
      if (queryLower.includes(pattern)) {
        return { type: 'relative', period };
      }
    }
    
    // Détection de plages temporelles
    if (/entre.*et|du.*au|depuis.*jusqu/.test(queryLower)) {
      return { type: 'range', period: 'custom_range' };
    }
    
    // Détection de comparaisons temporelles
    if (/vs|versus|comparé|par rapport/.test(queryLower)) {
      return { type: 'comparison', period: 'period' };
    }
    
    // Détection de périodes glissantes
    if (/derniers?\s+\d+\s+(jours?|semaines?|mois|années?)/.test(queryLower)) {
      return { type: 'relative', period: 'rolling' };
    }
    
    return { type: 'none' };
  }

  /**
   * Détecte les agrégations demandées dans une requête
   */
  private detectAggregations(query: string): string[] {
    const aggregations: string[] = [];
    const queryLower = query.toLowerCase();
    
    const aggregationPatterns: Record<string, RegExp[]> = {
      'sum': [/somme/, /total/, /cumul/],
      'avg': [/moyenne/, /moy\b/],
      'count': [/compte/, /nombre/, /combien/, /quantité/],
      'max': [/maximum/, /max\b/, /plus\s+(grand|élevé|haut)/],
      'min': [/minimum/, /min\b/, /plus\s+(petit|faible|bas)/],
      'group_by': [/par\s+\w+/, /groupé/, /répartition/, /ventilation/],
      'distinct': [/distinct/, /unique/, /différent/],
      'percentage': [/pourcentage/, /%/, /taux/, /ratio/, /proportion/],
      'median': [/médiane/],
      'stddev': [/écart[- ]type/, /variance/, /dispersion/]
    };

    for (const [agg, patterns] of Object.entries(aggregationPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          if (!aggregations.includes(agg)) {
            aggregations.push(agg);
          }
          break;
        }
      }
    }

    return aggregations;
  }

  /**
   * Détecte les filtres dans une requête
   */
  private detectQueryFilters(query: string): unknown[] {
    const filters: unknown[] = [];
    const queryLower = query.toLowerCase();
    
    // Détection des filtres de statut
    const statusPatterns: Record<string, string[]> = {
      'en_cours': ['en cours', 'actif', 'active'],
      'termine': ['terminé', 'fini', 'clos', 'clôturé'],
      'valide': ['validé', 'approuvé', 'confirmé'],
      'brouillon': ['brouillon', 'draft', 'en préparation'],
      'en_attente': ['en attente', 'en suspens', 'pending']
    };
    
    for (const [status, patterns] of Object.entries(statusPatterns)) {
      for (const pattern of patterns) {
        if (queryLower.includes(pattern)) {
          filters.push({ type: 'status', value: status });
          break;
        }
      }
    }
    
    // Détection des filtres numériques
    const numericPatterns = [
      /supérieur\s+à\s+(\d+)/,
      /inférieur\s+à\s+(\d+)/,
      /entre\s+(\d+)\s+et\s+(\d+)/,
      /plus\s+de\s+(\d+)/,
      /moins\s+de\s+(\d+)/
    ];
    
    for (const pattern of numericPatterns) {
      const match = queryLower.match(pattern);
      if (match) {
        filters.push({ 
          type: 'numeric', 
          operator: pattern.source.includes('supérieur') ? '>' : 
                    pattern.source.includes('inférieur') ? '<' : 
                    pattern.source.includes('entre') ? 'between' : '=',
          value: match[1],
          value2: match[2]
        });
      }
    }
    
    return filters;
  }

  /**
   * Vérifie si le SQL doit être inclus dans la réponse
   */
  shouldIncludeSQL(userRole: string): boolean {
    return userRole === "admin" || userRole === "be_manager";
  }

  /**
   * Génère des suggestions contextuelles
   */
  async generateContextualSuggestions(
    userId: string,
    userRole: string,
    query: string,
    results: unknown[]
  ): Promise<string[]> {
    if (results.length === 0) {
      return [
        "Essayez avec des critères plus larges",
        "Vérifiez l'orthographe de votre requête",
        "Consultez les données disponibles dans votre périmètre"
      ];
    }
    
    const roleSuggestions = DEFAULT_SUGGESTIONS_BY_ROLE[userRole] || [];
    return roleSuggestions.slice(0, 3);
  }

  /**
   * Estime la complexité d'un texte
   */
  estimateComplexity(text: string): "simple" | "complex" | "expert" {
    return this.detectQueryComplexity(text);
  }

  /**
   * Estime le temps d'exécution basé sur la complexité
   */
  estimateExecutionTime(query: string, complexity: "simple" | "complex" | "expert"): number {
    switch (complexity) {
      case "simple": return 500;
      case "complex": return 2000;
      case "expert": return 5000;
      default: return 1000;
    }
  }

  /**
   * Obtient le contexte temporel BTP
   */
  getTemporalContext(): string[] {
    const now = new Date();
    const context: string[] = [];
    const month = now.getMonth() + 1;
    
    if (month >= 7 && month <= 8) {
      context.push("Période de congés BTP");
    }
    if (month >= 3 && month <= 5) {
      context.push("Haute saison travaux");
    }
    if (month >= 11 || month <= 2) {
      context.push("Contraintes météorologiques");
    }
    
    return context;
  }

  /**
   * Analyse les patterns récents de l'utilisateur
   */
  async analyzeRecentPatterns(userId: string, userRole: string): Promise<string[]> {
    return withErrorHandling(
      async () => {
        const recentQueries = await db
          .select({ query: chatbotConversations.query })
          .from(chatbotConversations)
          .where(and(
            eq(chatbotConversations.userId, userId),
            gte(chatbotConversations.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          ))
          .orderBy(desc(chatbotConversations.createdAt))
          .limit(10);

        const patterns: string[] = [];
        const queries = recentQueries.map(q => q.query.toLowerCase());
        
        if (queries.some(q => q.includes('projet'))) {
          patterns.push("Questions fréquentes sur les projets");
        }
        if (queries.some(q => q.includes('retard'))) {
          patterns.push("Préoccupation pour les retards");
        }
        if (queries.some(q => q.includes('équipe'))) {
          patterns.push("Gestion d'équipe");
        }
        
        return patterns;
      },
      {
        operation: 'analyzeRecentPatterns',
        service: 'MessageHandler',
        metadata: { userId, userRole }
      }
    ) || [];
  }

  /**
   * Génère une clé de cache normalisée et hashée
   */
  generateCacheKey(userId: string, userRole: string, query: string, complexity: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${userId}_${userRole}_${query}_${complexity}`)
      .digest('hex')
      .substring(0, 16);
    return `chatbot:${hash}`;
  }
}

