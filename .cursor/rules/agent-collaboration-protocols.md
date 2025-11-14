<!-- 
Context: agent-collaboration, protocols, consensus, escalation, cross-validation, collaborative-learning
Priority: P1
Auto-load: when sub-agents need to collaborate, reach consensus, resolve conflicts, validate cross-agents
Dependencies: core.md, sub-agents-communication.md, sub-agents-orchestration.md, sub-agents-roles.md
Score: 70
-->

# Protocoles de Collaboration Inter-Agents - Saxium

**Objectif:** Définir les protocoles avancés de collaboration entre sub-agents pour consensus, escalation, validation croisée et apprentissage collaboratif.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Les sub-agents DOIVENT utiliser des protocoles de collaboration avancés pour atteindre consensus, gérer escalations, effectuer validation croisée et apprendre collaborativement.

**Bénéfices:**
- ✅ Consensus pour décisions partagées
- ✅ Escalation pour résolution conflits
- ✅ Validation croisée multi-agents
- ✅ Apprentissage collaboratif
- ✅ Coordination efficace

**Référence:** `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents  
**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents

## 📋 Protocole 1: Consensus pour Décisions Partagées

### Principe

**TOUJOURS:**
- ✅ Collecter opinions de tous agents concernés
- ✅ Analyser convergence opinions
- ✅ Atteindre consensus si possible
- ✅ Documenter processus consensus

**Pattern:**
```typescript
// Protocole consensus
interface ConsensusProtocol {
  decisionId: string;
  participants: Role[];
  proposals: Proposal[];
  votes: Vote[];
  consensus: ConsensusResult;
}

class ConsensusProtocol {
  async reachConsensus(
    decision: Decision,
    participants: Role[],
    context: Context
  ): Promise<ConsensusResult> {
    // 1. Collecter propositions de chaque participant
    const proposals = await this.collectProposals(
      decision,
      participants,
      context
    );
    
    // 2. Analyser convergence
    const convergence = await this.analyzeConvergence(
      proposals,
      context
    );
    
    // 3. Si convergence suffisante, créer consensus
    if (convergence.score >= 0.8) { // 80% convergence
      const consensus = await this.createConsensus(
        proposals,
        convergence,
        context
      );
      
      return {
        reached: true,
        consensus,
        participants,
        proposals
      };
    }
    
    // 4. Sinon, négocier compromis
    const compromise = await this.negotiateCompromise(
      proposals,
      participants,
      context
    );
    
    return {
      reached: compromise.agreed,
      consensus: compromise.consensus,
      participants,
      proposals,
      negotiation: compromise
    };
  }
  
  private async collectProposals(
    decision: Decision,
    participants: Role[],
    context: Context
  ): Promise<Proposal[]> {
    const proposals: Proposal[] = [];
    
    for (const participant of participants) {
      const proposal = await this.requestProposal(
        participant,
        decision,
        context
      );
      proposals.push(proposal);
    }
    
    return proposals;
  }
  
  private async analyzeConvergence(
    proposals: Proposal[],
    context: Context
  ): Promise<ConvergenceAnalysis> {
    // Analyser similarité entre propositions
    const similarities: number[] = [];
    
    for (let i = 0; i < proposals.length; i++) {
      for (let j = i + 1; j < proposals.length; j++) {
        const similarity = await this.calculateSimilarity(
          proposals[i],
          proposals[j],
          context
        );
        similarities.push(similarity);
      }
    }
    
    const averageSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    return {
      score: averageSimilarity,
      converged: averageSimilarity >= 0.8,
      similarities
    };
  }
  
  private async createConsensus(
    proposals: Proposal[],
    convergence: ConvergenceAnalysis,
    context: Context
  ): Promise<Consensus> {
    // Créer consensus basé sur propositions convergentes
    const consensusElements = await this.extractConsensusElements(
      proposals,
      convergence,
      context
    );
    
    return {
      id: generateConsensusId(),
      elements: consensusElements,
      participants: proposals.map(p => p.participant),
      confidence: convergence.score,
      timestamp: Date.now()
    };
  }
}
```

**Exemple Consensus:**
- **Décision:** "Quelle approche pour migration routes-poc.ts ?"
- **Propositions:**
  - Architect: "Migration progressive par modules"
  - Developer: "Migration progressive avec tests"
  - Tester: "Migration progressive avec validation continue"
- **Consensus:** "Migration progressive par modules avec tests et validation continue"
- **Convergence:** 0.85 (85%)

## 📋 Protocole 2: Escalation pour Conflits

### Principe

**TOUJOURS:**
- ✅ Détecter conflits entre agents
- ✅ Tenter résolution niveau local
- ✅ Escalader si résolution impossible
- ✅ Documenter escalation

**Pattern:**
```typescript
// Protocole escalation
interface EscalationProtocol {
  conflictId: string;
  level: EscalationLevel;
  participants: Role[];
  attempts: ResolutionAttempt[];
  escalated: boolean;
}

enum EscalationLevel {
  LOCAL = 'local',        // Résolution entre agents concernés
  COORDINATOR = 'coordinator', // Escalade vers coordinator
  ARCHITECT = 'architect',     // Escalade vers architect
  CRITICAL = 'critical'       // Escalade critique
}

class EscalationProtocol {
  async resolveConflict(
    conflict: Conflict,
    participants: Role[],
    context: Context
  ): Promise<EscalationResult> {
    let currentLevel = EscalationLevel.LOCAL;
    const attempts: ResolutionAttempt[] = [];
    
    // 1. Tenter résolution niveau local
    const localResolution = await this.attemptLocalResolution(
      conflict,
      participants,
      context
    );
    attempts.push(localResolution);
    
    if (localResolution.resolved) {
      return {
        resolved: true,
        level: EscalationLevel.LOCAL,
        resolution: localResolution.solution,
        attempts
      };
    }
    
    // 2. Escalader vers coordinator
    currentLevel = EscalationLevel.COORDINATOR;
    const coordinatorResolution = await this.escalateToCoordinator(
      conflict,
      participants,
      context
    );
    attempts.push(coordinatorResolution);
    
    if (coordinatorResolution.resolved) {
      return {
        resolved: true,
        level: EscalationLevel.COORDINATOR,
        resolution: coordinatorResolution.solution,
        attempts
      };
    }
    
    // 3. Escalader vers architect
    currentLevel = EscalationLevel.ARCHITECT;
    const architectResolution = await this.escalateToArchitect(
      conflict,
      participants,
      context
    );
    attempts.push(architectResolution);
    
    if (architectResolution.resolved) {
      return {
        resolved: true,
        level: EscalationLevel.ARCHITECT,
        resolution: architectResolution.solution,
        attempts
      };
    }
    
    // 4. Escalade critique
    currentLevel = EscalationLevel.CRITICAL;
    const criticalResolution = await this.escalateCritical(
      conflict,
      participants,
      context
    );
    attempts.push(criticalResolution);
    
    return {
      resolved: criticalResolution.resolved,
      level: EscalationLevel.CRITICAL,
      resolution: criticalResolution.solution,
      attempts
    };
  }
  
  private async attemptLocalResolution(
    conflict: Conflict,
    participants: Role[],
    context: Context
  ): Promise<ResolutionAttempt> {
    // Tenter négociation directe entre participants
    const negotiation = await this.negotiateDirectly(
      conflict,
      participants,
      context
    );
    
    return {
      level: EscalationLevel.LOCAL,
      resolved: negotiation.agreed,
      solution: negotiation.compromise,
      timestamp: Date.now()
    };
  }
  
  private async escalateToCoordinator(
    conflict: Conflict,
    participants: Role[],
    context: Context
  ): Promise<ResolutionAttempt> {
    // Escalader vers coordinator pour médiation
    const coordinator = await this.getCoordinator(context);
    const mediation = await coordinator.mediateConflict(
      conflict,
      participants,
      context
    );
    
    return {
      level: EscalationLevel.COORDINATOR,
      resolved: mediation.resolved,
      solution: mediation.solution,
      timestamp: Date.now()
    };
  }
  
  private async escalateToArchitect(
    conflict: Conflict,
    participants: Role[],
    context: Context
  ): Promise<ResolutionAttempt> {
    // Escalader vers architect pour décision architecturale
    const architect = await this.getArchitect(context);
    const decision = await architect.makeArchitecturalDecision(
      conflict,
      participants,
      context
    );
    
    return {
      level: EscalationLevel.ARCHITECT,
      resolved: decision.made,
      solution: decision.solution,
      timestamp: Date.now()
    };
  }
}
```

**Exemple Escalation:**
- **Conflit:** Developer et Tester en désaccord sur approche tests
- **Niveau LOCAL:** Négociation directe échoue
- **Niveau COORDINATOR:** Coordinator médie, propose compromis
- **Résolution:** Approche hybride acceptée

## 📋 Protocole 3: Validation Croisée Multi-Agents

### Principe

**TOUJOURS:**
- ✅ Valider résultats avec plusieurs agents
- ✅ Comparer validations croisées
- ✅ Identifier incohérences
- ✅ Résoudre incohérences

**Pattern:**
```typescript
// Protocole validation croisée
interface CrossValidationProtocol {
  validationId: string;
  target: ValidationTarget;
  validators: Role[];
  validations: Validation[];
  consensus: ValidationConsensus;
}

class CrossValidationProtocol {
  async performCrossValidation(
    target: ValidationTarget,
    validators: Role[],
    context: Context
  ): Promise<CrossValidationResult> {
    // 1. Demander validation à chaque validateur
    const validations = await Promise.all(
      validators.map(validator =>
        this.requestValidation(validator, target, context)
      )
    );
    
    // 2. Analyser validations
    const analysis = await this.analyzeValidations(
      validations,
      context
    );
    
    // 3. Identifier incohérences
    const inconsistencies = await this.identifyInconsistencies(
      validations,
      analysis,
      context
    );
    
    // 4. Résoudre incohérences si nécessaire
    if (inconsistencies.length > 0) {
      const resolution = await this.resolveInconsistencies(
        inconsistencies,
        validators,
        context
      );
      
      return {
        valid: resolution.resolved,
        validations,
        analysis,
        inconsistencies,
        resolution
      };
    }
    
    // 5. Créer consensus validation
    const consensus = await this.createValidationConsensus(
      validations,
      analysis,
      context
    );
    
    return {
      valid: consensus.valid,
      validations,
      analysis,
      inconsistencies: [],
      consensus
    };
  }
  
  private async analyzeValidations(
    validations: Validation[],
    context: Context
  ): Promise<ValidationAnalysis> {
    // Analyser convergence validations
    const validCount = validations.filter(v => v.valid).length;
    const invalidCount = validations.length - validCount;
    const agreement = validCount / validations.length;
    
    return {
      total: validations.length,
      valid: validCount,
      invalid: invalidCount,
      agreement,
      consensus: agreement >= 0.8 // 80% accord
    };
  }
  
  private async identifyInconsistencies(
    validations: Validation[],
    analysis: ValidationAnalysis,
    context: Context
  ): Promise<Inconsistency[]> {
    const inconsistencies: Inconsistency[] = [];
    
    // Identifier validations contradictoires
    for (let i = 0; i < validations.length; i++) {
      for (let j = i + 1; j < validations.length; j++) {
        if (validations[i].valid !== validations[j].valid) {
          inconsistencies.push({
            validator1: validations[i].validator,
            validator2: validations[j].validator,
            validation1: validations[i],
            validation2: validations[j],
            type: 'contradiction'
          });
        }
      }
    }
    
    return inconsistencies;
  }
}
```

**Exemple Validation Croisée:**
- **Cible:** Code review d'une fonction
- **Validateurs:** Developer, Tester, Architect
- **Validations:**
  - Developer: ✅ Valide
  - Tester: ✅ Valide
  - Architect: ⚠️ Suggestions mineures
- **Consensus:** ✅ Valide avec suggestions

## 📋 Protocole 4: Apprentissage Collaboratif

### Principe

**TOUJOURS:**
- ✅ Partager apprentissages entre agents
- ✅ Consolider connaissances collectives
- ✅ Réutiliser apprentissages partagés
- ✅ Améliorer stratégies collaboratives

**Pattern:**
```typescript
// Protocole apprentissage collaboratif
interface CollaborativeLearningProtocol {
  learningId: string;
  participants: Role[];
  learnings: Learning[];
  consolidated: ConsolidatedLearning;
}

class CollaborativeLearningProtocol {
  async performCollaborativeLearning(
    task: Task,
    participants: Role[],
    context: Context
  ): Promise<CollaborativeLearningResult> {
    // 1. Collecter apprentissages de chaque participant
    const learnings = await Promise.all(
      participants.map(participant =>
        this.collectLearning(participant, task, context)
      )
    );
    
    // 2. Consolider apprentissages
    const consolidated = await this.consolidateLearnings(
      learnings,
      context
    );
    
    // 3. Partager apprentissages consolidés
    await this.shareConsolidatedLearnings(
      consolidated,
      participants,
      context
    );
    
    // 4. Appliquer apprentissages partagés
    const application = await this.applySharedLearnings(
      consolidated,
      task,
      context
    );
    
    return {
      learnings,
      consolidated,
      application,
      improvements: this.calculateImprovements(application, context)
    };
  }
  
  private async consolidateLearnings(
    learnings: Learning[],
    context: Context
  ): Promise<ConsolidatedLearning> {
    // Identifier patterns communs
    const commonPatterns = await this.findCommonPatterns(
      learnings,
      context
    );
    
    // Généraliser apprentissages
    const generalized = await this.generalizeLearnings(
      learnings,
      commonPatterns,
      context
    );
    
    // Créer connaissances consolidées
    return {
      patterns: commonPatterns,
      generalized,
      strategies: await this.extractStrategies(generalized, context),
      bestPractices: await this.extractBestPractices(generalized, context)
    };
  }
  
  private async shareConsolidatedLearnings(
    consolidated: ConsolidatedLearning,
    participants: Role[],
    context: Context
  ): Promise<void> {
    // Partager avec tous les participants
    for (const participant of participants) {
      await this.shareLearning(
        participant,
        consolidated,
        context
      );
    }
    
    // Sauvegarder dans mémoire partagée
    await this.saveToSharedMemory(
      consolidated,
      context
    );
  }
}
```

**Exemple Apprentissage Collaboratif:**
- **Tâche:** Migration module auth/
- **Apprentissages:**
  - Developer: "Migration progressive efficace"
  - Tester: "Tests de non-régression critiques"
  - Architect: "Architecture modulaire validée"
- **Consolidé:** "Migration progressive avec tests de non-régression et validation architecturale"
- **Partagé:** Tous agents peuvent réutiliser cette stratégie

## 🔄 Workflow Protocoles Collaboration

### Workflow Complet

1. **Détecter besoin collaboration** → Consensus/Escalation/Validation/Apprentissage
2. **Sélectionner protocole** → Selon type besoin
3. **Exécuter protocole** → Avec participants appropriés
4. **Résoudre/Valider/Apprendre** → Selon protocole
5. **Documenter résultat** → Pour réutilisation

**Pattern:**
```typescript
// Workflow protocoles collaboration
class CollaborationOrchestrator {
  async orchestrateCollaboration(
    need: CollaborationNeed,
    context: Context
  ): Promise<CollaborationResult> {
    // 1. Identifier type collaboration
    const protocolType = this.identifyProtocolType(need, context);
    
    // 2. Sélectionner participants
    const participants = await this.selectParticipants(
      need,
      protocolType,
      context
    );
    
    // 3. Exécuter protocole approprié
    let result: CollaborationResult;
    
    switch (protocolType) {
      case 'consensus':
        result = await this.consensusProtocol.reachConsensus(
          need.decision,
          participants,
          context
        );
        break;
        
      case 'escalation':
        result = await this.escalationProtocol.resolveConflict(
          need.conflict,
          participants,
          context
        );
        break;
        
      case 'validation':
        result = await this.validationProtocol.performCrossValidation(
          need.target,
          participants,
          context
        );
        break;
        
      case 'learning':
        result = await this.learningProtocol.performCollaborativeLearning(
          need.task,
          participants,
          context
        );
        break;
    }
    
    // 4. Documenter résultat
    await this.documentResult(result, context);
    
    return result;
  }
}
```

## ⚠️ Règles Protocoles Collaboration

### TOUJOURS:

- ✅ Utiliser protocole consensus pour décisions partagées
- ✅ Utiliser protocole escalation pour conflits
- ✅ Utiliser protocole validation croisée pour validations critiques
- ✅ Utiliser protocole apprentissage collaboratif pour amélioration continue
- ✅ Documenter tous les protocoles exécutés
- ✅ Réutiliser apprentissages collaboratifs

### NE JAMAIS:

- ❌ Ignorer conflits sans escalation
- ❌ Prendre décisions sans consensus si nécessaire
- ❌ Valider sans validation croisée si critique
- ❌ Ignorer apprentissages collaboratifs

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents
- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-roles.md` - Rôles des sub-agents

---

**Note:** Ce fichier définit les protocoles avancés de collaboration entre sub-agents pour consensus, escalation, validation croisée et apprentissage collaboratif.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

