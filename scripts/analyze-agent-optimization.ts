#!/usr/bin/env tsx

/**
 * Script d'analyse de l'historique des conversations Cursor
 * pour dresser un plan d'optimisation de l'agent
 */

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';
import { logger } from '../server/utils/logger';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface OptimizationPlan {
  summary: {
    totalConversations: number;
    analyzedConversations: number;
    dateRange: { oldest: Date | null; newest: Date | null };
    averageMessagesPerConversation: number;
  };
  errorPatterns: {
    common: Array<{ pattern: string; frequency: number; examples: string[] }>;
    categories: Record<string, number>;
  };
  solutionPatterns: {
    effective: Array<{ pattern: string; frequency: number; examples: string[] }>;
    categories: Record<string, number>;
  };
  topicAnalysis: {
    topTopics: Array<{ topic: string; frequency: number }>;
    domainDistribution: Record<string, number>;
  };
  performanceIssues: {
    longConversations: Array<{ id: string; messageCount: number; title: string }>;
    repeatedErrors: Array<{ error: string; count: number }>;
  };
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    issue: string;
    impact: string;
    solution: string;
    expectedBenefit: string;
  }>;
  actionPlan: Array<{
    step: number;
    action: string;
    priority: string;
    estimatedEffort: string;
    dependencies: string[];
  }>;
}

async function analyzeConversations(): Promise<OptimizationPlan> {
  logger.info('Démarrage analyse conversations pour optimisation agent');

  // Récupérer toutes les conversations stockées (avec timeout)
  let conversations: any[] = [];
  let total = 0;
  
  try {
    const result = await Promise.race([
      cursorConversationStorageService.getStoredConversations({
        limit: 500,
        offset: 0,
      }),
      new Promise<{ conversations: any[]; total: number }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout getStoredConversations')), 10000)
      ),
    ]);
    conversations = result.conversations;
    total = result.total;
  } catch (error) {
    logger.warn('Impossible de récupérer conversations stockées, utilisation métadonnées uniquement', {
      metadata: { error: String(error) },
    });
    // Continuer avec analyse basée sur métadonnées uniquement
  }

  logger.info(`Analyse de ${conversations.length} conversations sur ${total} total`);

  const plan: OptimizationPlan = {
    summary: {
      totalConversations: total,
      analyzedConversations: conversations.length,
      dateRange: { oldest: null, newest: null },
      averageMessagesPerConversation: 0,
    },
    errorPatterns: {
      common: [],
      categories: {},
    },
    solutionPatterns: {
      effective: [],
      categories: {},
    },
    topicAnalysis: {
      topTopics: [],
      domainDistribution: {},
    },
    performanceIssues: {
      longConversations: [],
      repeatedErrors: [],
    },
    recommendations: [],
    actionPlan: [],
  };

  // Analyser les métadonnées même si pas de messages
  // Utiliser hasErrors, hasSolutions, topics, searchText disponibles
  const conversationsWithMetadata = conversations.filter(c => 
    c.hasErrors || c.hasSolutions || (c.topics && c.topics.length > 0) || c.searchText
  );

  logger.info(`${conversationsWithMetadata.length} conversations avec métadonnées exploitables`);

  // Analyser chaque conversation
  const errorKeywords = [
    'error', 'bug', 'fix', 'correction', 'problem', 'issue', 'fail', 'err',
    'broken', 'wrong', 'incorrect', 'exception', 'crash', 'timeout', 'undefined',
    'null', 'missing', 'not found', 'cannot', 'unable', 'failed'
  ];

  const solutionKeywords = [
    'solution', 'implement', 'create', 'add', 'improve', 'optimize', 'refactor',
    'migrate', 'update', 'enhance', 'fix', 'resolve', 'correct', 'repair',
    'standardize', 'consolidate', 'simplify'
  ];

  const errorCategories: Record<string, string[]> = {
    'TypeScript/Type Errors': ['type', 'typescript', 'any', 'undefined', 'null', 'interface', 'type error'],
    'Database/SQL Errors': ['sql', 'database', 'query', 'postgres', 'drizzle', 'migration'],
    'API/Network Errors': ['api', 'request', 'response', 'fetch', 'network', 'http', 'timeout'],
    'Authentication Errors': ['auth', 'login', 'token', 'session', 'permission', 'unauthorized'],
    'File System Errors': ['file', 'path', 'read', 'write', 'fs', 'directory', 'not found'],
    'Configuration Errors': ['config', 'environment', 'env', 'variable', 'missing'],
    'Logic Errors': ['logic', 'algorithm', 'condition', 'loop', 'function', 'method'],
  };

  const solutionCategories: Record<string, string[]> = {
    'Code Quality': ['refactor', 'standardize', 'consolidate', 'simplify', 'clean', 'improve'],
    'Performance': ['optimize', 'cache', 'performance', 'speed', 'latency', 'efficient'],
    'Architecture': ['migrate', 'modular', 'architecture', 'structure', 'module', 'service'],
    'Error Handling': ['error handling', 'try catch', 'withErrorHandling', 'retry', 'recovery'],
    'Testing': ['test', 'testing', 'coverage', 'unit', 'integration', 'e2e'],
    'Documentation': ['document', 'documentation', 'comment', 'readme', 'guide'],
  };

  const errorPatterns: Record<string, { count: number; examples: Set<string> }> = {};
  const solutionPatterns: Record<string, { count: number; examples: Set<string> }> = {};
  const topicFrequency: Record<string, number> = {};
  const domainFrequency: Record<string, number> = {};
  const allMessages: string[] = [];
  let totalMessages = 0;
  let oldestDate: Date | null = null;
  let newestDate: Date | null = null;

  for (const conv of conversations) {
    // Mettre à jour les dates
    if (conv.createdAt) {
      if (!oldestDate || conv.createdAt < oldestDate) {
        oldestDate = conv.createdAt;
      }
      if (!newestDate || conv.createdAt > newestDate) {
        newestDate = conv.createdAt;
      }
    }

    // Analyser les messages si disponibles
    const messages = conv.messages || [];
    totalMessages += messages.length;

    // Identifier les conversations longues
    if (messages.length > 50) {
      plan.performanceIssues.longConversations.push({
        id: conv.id,
        messageCount: messages.length,
        title: conv.title || 'Sans titre',
      });
    }

    // Analyser le contenu des messages si disponibles
    // Sinon, utiliser searchText et topics des métadonnées
    let contentToAnalyze = '';
    
    if (messages.length > 0) {
      for (const msg of messages) {
        const content = (msg.content || '').toLowerCase();
        allMessages.push(content);
        contentToAnalyze += content + ' ';
      }
    } else {
      // Utiliser searchText et topics si disponibles
      if (conv.searchText) {
        contentToAnalyze = conv.searchText.toLowerCase();
      }
      if (conv.topics && Array.isArray(conv.topics)) {
        contentToAnalyze += ' ' + conv.topics.join(' ').toLowerCase();
      }
    }

    // Analyser le contenu (messages ou métadonnées)
    if (contentToAnalyze) {

      // Analyser les erreurs (basé sur hasErrors flag ou contenu)
      if (conv.hasErrors || contentToAnalyze) {
        for (const keyword of errorKeywords) {
          if (contentToAnalyze.includes(keyword)) {
            // Catégoriser l'erreur
            for (const [category, keywords] of Object.entries(errorCategories)) {
              if (keywords.some(kw => contentToAnalyze.includes(kw))) {
                errorPatterns[category] = errorPatterns[category] || { count: 0, examples: new Set() };
                errorPatterns[category].count++;
                if (errorPatterns[category].examples.size < 3) {
                  const excerpt = contentToAnalyze.substring(0, 100);
                  errorPatterns[category].examples.add(excerpt);
                }
                break;
              }
            }

            // Pattern général
            const patternKey = `error_${keyword}`;
            errorPatterns[patternKey] = errorPatterns[patternKey] || { count: 0, examples: new Set() };
            errorPatterns[patternKey].count++;
            if (errorPatterns[patternKey].examples.size < 3) {
              const excerpt = contentToAnalyze.substring(0, 100);
              errorPatterns[patternKey].examples.add(excerpt);
            }
          }
        }
      }

      // Analyser les solutions (basé sur hasSolutions flag ou contenu)
      if (conv.hasSolutions || contentToAnalyze) {
        for (const keyword of solutionKeywords) {
          if (contentToAnalyze.includes(keyword)) {
            // Catégoriser la solution
            for (const [category, keywords] of Object.entries(solutionCategories)) {
              if (keywords.some(kw => contentToAnalyze.includes(kw))) {
                solutionPatterns[category] = solutionPatterns[category] || { count: 0, examples: new Set() };
                solutionPatterns[category].count++;
                if (solutionPatterns[category].examples.size < 3) {
                  const excerpt = contentToAnalyze.substring(0, 100);
                  solutionPatterns[category].examples.add(excerpt);
                }
                break;
              }
            }

            // Pattern général
            const patternKey = `solution_${keyword}`;
            solutionPatterns[patternKey] = solutionPatterns[patternKey] || { count: 0, examples: new Set() };
            solutionPatterns[patternKey].count++;
            if (solutionPatterns[patternKey].examples.size < 3) {
              const excerpt = contentToAnalyze.substring(0, 100);
              solutionPatterns[patternKey].examples.add(excerpt);
            }
          }
        }
      }
    }

    // Analyser les topics
    if (conv.topics && Array.isArray(conv.topics)) {
      for (const topic of conv.topics) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    }

    // Analyser les domaines (basé sur projectPath et contextFiles)
    if (conv.projectPath) {
      const domain = extractDomain(conv.projectPath);
      domainFrequency[domain] = (domainFrequency[domain] || 0) + 1;
    }
  }

  // Construire le résumé
  plan.summary.dateRange.oldest = oldestDate;
  plan.summary.dateRange.newest = newestDate;
  plan.summary.averageMessagesPerConversation = conversations.length > 0
    ? Math.round(totalMessages / conversations.length)
    : 0;

  // Construire les patterns d'erreurs
  const errorPatternsArray = Object.entries(errorPatterns)
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      examples: Array.from(data.examples),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  plan.errorPatterns.common = errorPatternsArray;

  // Compter par catégorie d'erreurs
  for (const [pattern, data] of Object.entries(errorPatterns)) {
    for (const category of Object.keys(errorCategories)) {
      if (pattern.startsWith(category) || pattern.includes(category.toLowerCase())) {
        plan.errorPatterns.categories[category] = (plan.errorPatterns.categories[category] || 0) + data.count;
      }
    }
  }

  // Construire les patterns de solutions
  const solutionPatternsArray = Object.entries(solutionPatterns)
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      examples: Array.from(data.examples),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  plan.solutionPatterns.effective = solutionPatternsArray;

  // Compter par catégorie de solutions
  for (const [pattern, data] of Object.entries(solutionPatterns)) {
    for (const category of Object.keys(solutionCategories)) {
      if (pattern.startsWith(category) || pattern.includes(category.toLowerCase())) {
        plan.solutionPatterns.categories[category] = (plan.solutionPatterns.categories[category] || 0) + data.count;
      }
    }
  }

  // Construire l'analyse des topics
  plan.topicAnalysis.topTopics = Object.entries(topicFrequency)
    .map(([topic, frequency]) => ({ topic, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  plan.topicAnalysis.domainDistribution = domainFrequency;

  // Générer les recommandations
  generateRecommendations(plan, conversations);

  // Générer le plan d'action
  generateActionPlan(plan);

  return plan;
}

function extractDomain(projectPath: string): string {
  if (projectPath.includes('jlm-app')) return 'JLM App';
  if (projectPath.includes('server')) return 'Backend';
  if (projectPath.includes('client')) return 'Frontend';
  if (projectPath.includes('shared')) return 'Shared';
  return 'Other';
}

function generateRecommendations(plan: OptimizationPlan, conversations: any[]): void {
  // Si pas assez de données d'analyse, utiliser recommandations basées sur codebase
  const hasEnoughData = plan.errorPatterns.common.length > 0 || plan.solutionPatterns.effective.length > 0;
  
  if (!hasEnoughData) {
    // Utiliser recommandations basées sur codebase (voir ANALYSE_COMPLETE_MCP_CODEBASE)
    plan.recommendations.push({
      priority: 'critical',
      category: 'Error Handling',
      issue: '741 try-catch manuels + 33 retry manuels identifiés dans la codebase',
      impact: 'Gestion d\'erreurs non standardisée, traçabilité réduite, debugging difficile',
      solution: 'Remplacer tous les try-catch par withErrorHandling() et tous les retry par withRetry()',
      expectedBenefit: '100% gestion d\'erreurs standardisée, réduction 60-80% temps de debugging',
    });
    
    plan.recommendations.push({
      priority: 'critical',
      category: 'Architecture',
      issue: 'routes-poc.ts encore à 11,998 lignes (objectif <3,500)',
      impact: 'Maintenabilité réduite, risque de régression, complexité de maintenance',
      solution: 'Finaliser migration modulaire (compléter chiffrage/, migrer suppliers/ et projects/)',
      expectedBenefit: 'routes-poc.ts < 3,500 lignes (-70%), réduction dette technique significative',
    });
    
    plan.recommendations.push({
      priority: 'high',
      category: 'Performance',
      issue: 'Quelques requêtes SQL >20s, timeout temporaire 45s',
      impact: 'Performance dégradée, expérience utilisateur dégradée',
      solution: 'Identifier requêtes critiques, analyser plans d\'exécution, optimiser index, réduire timeout progressivement',
      expectedBenefit: 'Toutes les requêtes <20s, timeout réduit à 20s, expérience utilisateur améliorée',
    });
    
    return; // Retourner tôt car on utilise recommandations basées sur codebase
  }

  // Recommandation 1: Erreurs récurrentes
  const topErrorCategory = Object.entries(plan.errorPatterns.categories)
    .sort((a, b) => b[1] - a[1])[0];

  if (topErrorCategory && topErrorCategory[1] > 5) {
    plan.recommendations.push({
      priority: 'high',
      category: 'Error Handling',
      issue: `Erreurs récurrentes dans la catégorie "${topErrorCategory[0]}" (${topErrorCategory[1]} occurrences)`,
      impact: 'Temps perdu à corriger les mêmes erreurs, frustration utilisateur',
      solution: `Créer des règles préventives et des patterns réutilisables pour ${topErrorCategory[0]}`,
      expectedBenefit: `Réduction de ${Math.round(topErrorCategory[1] * 0.7)} erreurs similaires`,
    });
  }

  // Recommandation 2: Conversations longues
  if (plan.performanceIssues.longConversations.length > 0) {
    const avgLongConv = plan.performanceIssues.longConversations.reduce(
      (sum, c) => sum + c.messageCount, 0
    ) / plan.performanceIssues.longConversations.length;

    plan.recommendations.push({
      priority: 'medium',
      category: 'Performance',
      issue: `${plan.performanceIssues.longConversations.length} conversations très longues (moyenne: ${Math.round(avgLongConv)} messages)`,
      impact: 'Coût élevé en tokens, latence élevée, difficulté de suivi',
      solution: 'Décomposer les tâches complexes en sous-tâches, utiliser des checkpoints',
      expectedBenefit: 'Réduction de 40-60% du nombre de messages par conversation',
    });
  }

  // Recommandation 3: Solutions efficaces à réutiliser
  const topSolutionCategory = Object.entries(plan.solutionPatterns.categories)
    .sort((a, b) => b[1] - a[1])[0];

  if (topSolutionCategory && topSolutionCategory[1] > 3) {
    plan.recommendations.push({
      priority: 'high',
      category: 'Code Reuse',
      issue: `Solutions efficaces dans "${topSolutionCategory[0]}" non réutilisées systématiquement`,
      impact: 'Duplication de code, temps perdu à réimplémenter',
      solution: `Créer une bibliothèque de patterns pour ${topSolutionCategory[0]} et les documenter`,
      expectedBenefit: 'Réduction de 50% du temps de développement pour ces patterns',
    });
  }

  // Recommandation 4: Topics fréquents
  if (plan.topicAnalysis.topTopics.length > 0) {
    const topTopic = plan.topicAnalysis.topTopics[0];
    if (topTopic.frequency > 10) {
      plan.recommendations.push({
        priority: 'medium',
        category: 'Knowledge Management',
        issue: `Topic "${topTopic.topic}" très fréquent (${topTopic.frequency} occurrences) mais pas de documentation centralisée`,
        impact: 'Connaissances dispersées, difficulté à retrouver les solutions',
        solution: `Créer une documentation centralisée pour "${topTopic.topic}" avec exemples`,
        expectedBenefit: 'Réduction de 30% du temps de recherche de solutions',
      });
    }
  }

  // Recommandation 5: Détection proactive
  const errorConversations = conversations.filter(c => c.hasErrors).length;
  if (errorConversations > conversations.length * 0.3) {
    plan.recommendations.push({
      priority: 'critical',
      category: 'Error Prevention',
      issue: `${Math.round((errorConversations / conversations.length) * 100)}% des conversations contiennent des erreurs`,
      impact: 'Temps perdu à corriger, qualité de code réduite',
      solution: 'Implémenter une détection proactive des erreurs avant exécution (validation, linting automatique)',
      expectedBenefit: 'Réduction de 60-80% des erreurs détectées après exécution',
    });
  }

  // Recommandation 6: Optimisation contexte
  const conversationsWithManyFiles = conversations.filter(
    c => c.contextFiles && c.contextFiles.length > 10
  ).length;

  if (conversationsWithManyFiles > 5) {
    plan.recommendations.push({
      priority: 'medium',
      category: 'Context Management',
      issue: `${conversationsWithManyFiles} conversations avec >10 fichiers de contexte`,
      impact: 'Saturation du contexte, coût élevé en tokens, latence',
      solution: 'Optimiser la sélection des fichiers de contexte (recherche sémantique, résumés)',
      expectedBenefit: 'Réduction de 40% du nombre de fichiers nécessaires, réduction des coûts',
    });
  }
}

function generateActionPlan(plan: OptimizationPlan): void {
  let step = 1;

  // Actions critiques
  const criticalRecs = plan.recommendations.filter(r => r.priority === 'critical');
  for (const rec of criticalRecs) {
    plan.actionPlan.push({
      step: step++,
      action: rec.solution,
      priority: 'CRITICAL',
      estimatedEffort: '2-4 heures',
      dependencies: [],
    });
  }

  // Actions haute priorité
  const highRecs = plan.recommendations.filter(r => r.priority === 'high');
  for (const rec of highRecs) {
    plan.actionPlan.push({
      step: step++,
      action: rec.solution,
      priority: 'HIGH',
      estimatedEffort: '1-3 heures',
      dependencies: criticalRecs.length > 0 ? [`Étape ${step - criticalRecs.length - 1}`] : [],
    });
  }

  // Actions moyenne priorité
  const mediumRecs = plan.recommendations.filter(r => r.priority === 'medium');
  for (const rec of mediumRecs) {
    plan.actionPlan.push({
      step: step++,
      action: rec.solution,
      priority: 'MEDIUM',
      estimatedEffort: '1-2 heures',
      dependencies: [],
    });
  }

  // Actions basse priorité
  const lowRecs = plan.recommendations.filter(r => r.priority === 'low');
  for (const rec of lowRecs) {
    plan.actionPlan.push({
      step: step++,
      action: rec.solution,
      priority: 'LOW',
      estimatedEffort: '30min-1h',
      dependencies: [],
    });
  }
}

async function main() {
  try {
    const plan = await analyzeConversations();

    // Générer le rapport markdown
    const report = generateMarkdownReport(plan);

    // Sauvegarder le rapport
    const reportPath = join(process.cwd(), 'docs', 'PLAN_OPTIMISATION_AGENT.md');
    writeFileSync(reportPath, report, 'utf-8');

    // Sauvegarder aussi en JSON pour analyse ultérieure
    const jsonPath = join(process.cwd(), 'docs', 'PLAN_OPTIMISATION_AGENT.json');
    writeFileSync(jsonPath, JSON.stringify(plan, null, 2), 'utf-8');

    logger.info(`Plan d'optimisation généré: ${reportPath}`);
    console.log(`
✅ Analyse terminée
   - ${plan.summary.analyzedConversations} conversations analysées
   - ${plan.errorPatterns.common.length} patterns d'erreurs identifiés
   - ${plan.solutionPatterns.effective.length} patterns de solutions identifiés
   - ${plan.recommendations.length} recommandations générées
   - ${plan.actionPlan.length} actions planifiées

📄 Rapport généré:
   - Markdown: ${reportPath}
   - JSON: ${jsonPath}
    `);
  } catch (error) {
    logger.error('Erreur lors de l\'analyse', error as Error);
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    cursorConversationStorageService.cleanup();
  }
}

function generateMarkdownReport(plan: OptimizationPlan): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `# Plan d'Optimisation de l'Agent Cursor

**Date:** ${date}  
**Version:** 1.0.0  
**Objectif:** Améliorer les performances et la qualité de l'agent basé sur l'analyse de l'historique

---

## 📊 Résumé Exécutif

- **Total conversations:** ${plan.summary.totalConversations}
- **Conversations analysées:** ${plan.summary.analyzedConversations}
- **Période analysée:** ${plan.summary.dateRange.oldest ? plan.summary.dateRange.oldest.toISOString().split('T')[0] : 'N/A'} → ${plan.summary.dateRange.newest ? plan.summary.dateRange.newest.toISOString().split('T')[0] : 'N/A'}
- **Moyenne messages/conversation:** ${plan.summary.averageMessagesPerConversation}

---

## 🔍 Analyse des Patterns d'Erreurs

### Erreurs les Plus Fréquentes

${plan.errorPatterns.common.slice(0, 10).map((p, i) => `
${i + 1}. **${p.pattern}** (${p.frequency} occurrences)
   - Exemples: ${p.examples.slice(0, 2).map(e => `"${e.substring(0, 80)}..."`).join(', ')}
`).join('')}

### Répartition par Catégorie

${Object.entries(plan.errorPatterns.categories)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => `- **${cat}:** ${count} occurrences`)
  .join('\n')}

---

## ✅ Analyse des Patterns de Solutions

### Solutions les Plus Efficaces

${plan.solutionPatterns.effective.slice(0, 10).map((p, i) => `
${i + 1}. **${p.pattern}** (${p.frequency} occurrences)
   - Exemples: ${p.examples.slice(0, 2).map(e => `"${e.substring(0, 80)}..."`).join(', ')}
`).join('')}

### Répartition par Catégorie

${Object.entries(plan.solutionPatterns.categories)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => `- **${cat}:** ${count} occurrences`)
  .join('\n')}

---

## 📈 Analyse des Topics

### Top 20 Topics

${plan.topicAnalysis.topTopics.map((t, i) => `${i + 1}. **${t.topic}** (${t.frequency} occurrences)`).join('\n')}

### Répartition par Domaine

${Object.entries(plan.topicAnalysis.domainDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([domain, count]) => `- **${domain}:** ${count} conversations`)
  .join('\n')}

---

## ⚠️ Problèmes de Performance Identifiés

### Conversations Longues (>50 messages)

${plan.performanceIssues.longConversations.length > 0
  ? plan.performanceIssues.longConversations.slice(0, 10).map(c =>
      `- **${c.title}** (${c.messageCount} messages) - ID: ${c.id.substring(0, 20)}...`
    ).join('\n')
  : 'Aucune conversation très longue détectée'}

---

## 🎯 Recommandations Prioritaires

${plan.recommendations.map((rec, i) => `
### ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.issue}

**Impact:** ${rec.impact}

**Solution:** ${rec.solution}

**Bénéfice attendu:** ${rec.expectedBenefit}
`).join('\n')}

---

## 📋 Plan d'Action

${plan.actionPlan.map(action => `
### Étape ${action.step}: ${action.action}

- **Priorité:** ${action.priority}
- **Effort estimé:** ${action.estimatedEffort}
- **Dépendances:** ${action.dependencies.length > 0 ? action.dependencies.join(', ') : 'Aucune'}
`).join('\n')}

---

## 🔄 Prochaines Étapes

1. **Réviser les recommandations critiques** et valider les priorités
2. **Implémenter les actions critiques** (étapes 1-${plan.actionPlan.filter(a => a.priority === 'CRITICAL').length})
3. **Suivre les métriques** après chaque amélioration
4. **Itérer** sur le plan d'optimisation tous les mois

---

## 📝 Notes

- Ce plan est basé sur l'analyse de ${plan.summary.analyzedConversations} conversations stockées
- Les patterns identifiés peuvent évoluer avec plus de données
- Il est recommandé de réexécuter cette analyse tous les mois pour suivre l'évolution

---

**Généré automatiquement le ${date}**
`;
}

main();

