<!-- 
Context: saxium-specific, domain-intelligence, JLM-menuiserie, BTP, business-rules, domain-knowledge
Priority: P1
Auto-load: when agent needs domain-specific knowledge, when validating business rules, when understanding JLM/BTP context
Dependencies: core.md, client-consultant-oversight.md
Score: 70
-->

# Intelligence Spécifique Domaine Saxium - Saxium

**Objectif:** Implémenter une intelligence spécifique au domaine JLM Menuiserie/BTP permettant à l'agent de comprendre le métier, mémoriser règles business et valider décisions avec règles métier.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT comprendre le domaine JLM Menuiserie/BTP, mémoriser règles business et valider toutes décisions avec règles métier.

**Bénéfices:**
- ✅ Compréhension profonde métier menuiserie/BTP
- ✅ Patterns spécifiques planning chantier
- ✅ Règles métier JLM mémorisées
- ✅ Workflows spécifiques validés
- ✅ Validation décisions avec règles métier

**Référence:** `@.cursor/rules/client-consultant-oversight.md` - Supervision consultant client  
**Référence:** `@attached_assets/Audit process et fonctionnement JLM.txt` - Documentation métier JLM  
**Référence:** `@attached_assets/Cahier des charges POC.txt` - Cahier des charges

## 📋 Contexte Domaine JLM Menuiserie

### Domaine Métier

**JLM Menuiserie** est une entreprise française de menuiserie/BTP spécialisée dans:
- Menuiserie sur mesure
- Chantiers BTP
- Gestion projets
- Planning chantiers
- Suivi production

**Contexte Projet Saxium:**
- Application de gestion de projets pour JLM
- Migration depuis Monday.com
- Gestion planning chantiers
- Suivi production
- Gestion clients et fournisseurs

### Patterns Spécifiques Planning Chantier

**TOUJOURS:**
- ✅ Comprendre workflows planning chantier
- ✅ Respecter contraintes métier
- ✅ Valider avec règles métier

**Patterns Identifiés:**
- Planning par phases (préparation, production, installation)
- Gestion ressources (matériaux, main-d'œuvre)
- Suivi avancement
- Gestion aléas chantier
- Coordination équipes

## 📚 Base Connaissances Métier

### Apprentissage Domaine

**TOUJOURS:**
- ✅ Lire docs métier (attached_assets/)
- ✅ Extraire règles business
- ✅ Créer base connaissances métier
- ✅ Mémoriser règles validées

**Pattern:**
```typescript
// Base connaissances métier
interface DomainKnowledgeBase {
  businessRules: BusinessRule[];
  workflows: Workflow[];
  patterns: DomainPattern[];
  constraints: Constraint[];
}

class DomainKnowledgeExtractor {
  async extractBusinessRules(
    documents: Document[],
    context: Context
  ): Promise<BusinessRule[]> {
    const rules: BusinessRule[] = [];
    
    for (const doc of documents) {
      // Extraire règles depuis document
      const extractedRules = await this.extractRulesFromDocument(doc, context);
      rules.push(...extractedRules);
    }
    
    return rules;
  }
  
  private async extractRulesFromDocument(
    doc: Document,
    context: Context
  ): Promise<BusinessRule[]> {
    // Analyser document pour extraire règles
    // Exemple: "Les chantiers doivent avoir un planning par phases"
    const rules: BusinessRule[] = [];
    
    // Rechercher patterns règles
    const rulePatterns = [
      /doit\s+(avoir|être|inclure)/i,
      /obligatoire/i,
      /requis/i,
      /nécessaire/i
    ];
    
    for (const pattern of rulePatterns) {
      const matches = doc.content.matchAll(pattern);
      for (const match of matches) {
        const rule = await this.parseRule(match, doc, context);
        if (rule) {
          rules.push(rule);
        }
      }
    }
    
    return rules;
  }
}
```

### Règles Métier JLM Mémorisées

**Règles Identifiées:**
1. **Planning Chantier:** Les chantiers doivent avoir un planning par phases (préparation, production, installation)
2. **Gestion Ressources:** Les ressources (matériaux, main-d'œuvre) doivent être allouées avant début chantier
3. **Suivi Avancement:** L'avancement doit être mis à jour quotidiennement
4. **Gestion Aléas:** Les aléas chantier doivent être documentés et impactent le planning
5. **Coordination Équipes:** Les équipes doivent être coordonnées selon planning

**Pattern:**
```typescript
// Règles métier JLM
const JLM_BUSINESS_RULES: BusinessRule[] = [
  {
    id: 'rule-001',
    name: 'Planning par phases',
    description: 'Les chantiers doivent avoir un planning par phases',
    phases: ['préparation', 'production', 'installation'],
    validation: (chantier: Chantier) => {
      return chantier.phases.length >= 3 &&
        chantier.phases.includes('préparation') &&
        chantier.phases.includes('production') &&
        chantier.phases.includes('installation');
    }
  },
  {
    id: 'rule-002',
    name: 'Allocation ressources',
    description: 'Les ressources doivent être allouées avant début chantier',
    validation: (chantier: Chantier) => {
      return chantier.ressources.length > 0 &&
        chantier.ressources.every(r => r.allouee);
    }
  },
  {
    id: 'rule-003',
    name: 'Mise à jour avancement',
    description: 'L\'avancement doit être mis à jour quotidiennement',
    validation: (chantier: Chantier) => {
      const lastUpdate = new Date(chantier.avancement.lastUpdate);
      const today = new Date();
      const daysDiff = (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 1; // Mis à jour dans les 24h
    }
  }
];
```

## 🔍 Validation Décisions avec Règles Métier

### Validation Automatique

**TOUJOURS:**
- ✅ Valider décisions avec règles métier
- ✅ Vérifier conformité workflows
- ✅ Respecter contraintes métier
- ✅ Documenter validations

**Pattern:**
```typescript
// Validation décisions avec règles métier
class BusinessRuleValidator {
  async validateDecision(
    decision: Decision,
    context: Context
  ): Promise<ValidationResult> {
    // 1. Charger règles métier applicables
    const applicableRules = await this.getApplicableRules(decision, context);
    
    // 2. Valider avec chaque règle
    const validations: RuleValidation[] = [];
    for (const rule of applicableRules) {
      const validation = await this.validateWithRule(decision, rule, context);
      validations.push(validation);
    }
    
    // 3. Calculer résultat global
    const allValid = validations.every(v => v.valid);
    const violations = validations.filter(v => !v.valid);
    
    return {
      valid: allValid,
      validations,
      violations,
      compliance: this.calculateCompliance(validations, context)
    };
  }
  
  private async validateWithRule(
    decision: Decision,
    rule: BusinessRule,
    context: Context
  ): Promise<RuleValidation> {
    // Exécuter validation règle
    const result = rule.validation(decision.data);
    
    return {
      rule,
      valid: result,
      message: result 
        ? `Règle ${rule.name} respectée`
        : `Règle ${rule.name} violée`
    };
  }
}
```

## 🔄 Workflows Spécifiques Validés

### Workflow Planning Chantier

**Pattern:**
```typescript
// Workflow planning chantier
const PLANNING_CHANTIER_WORKFLOW: Workflow = {
  id: 'workflow-planning-chantier',
  name: 'Planning Chantier',
  steps: [
    {
      order: 1,
      name: 'Création chantier',
      action: 'create-chantier',
      validation: ['rule-001'] // Planning par phases
    },
    {
      order: 2,
      name: 'Allocation ressources',
      action: 'allocate-ressources',
      validation: ['rule-002'] // Allocation ressources
    },
    {
      order: 3,
      name: 'Début chantier',
      action: 'start-chantier',
      validation: ['rule-001', 'rule-002']
    },
    {
      order: 4,
      name: 'Suivi avancement',
      action: 'update-avancement',
      validation: ['rule-003'] // Mise à jour quotidienne
    }
  ]
};
```

## ⚠️ Règles Intelligence Domaine

### TOUJOURS:

- ✅ Comprendre contexte métier JLM/BTP
- ✅ Mémoriser règles business
- ✅ Valider décisions avec règles métier
- ✅ Respecter workflows spécifiques
- ✅ Documenter validations métier

### NE JAMAIS:

- ❌ Ignorer règles métier
- ❌ Prendre décisions sans validation métier
- ❌ Ignorer contraintes métier
- ❌ Ne pas documenter validations

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/client-consultant-oversight.md` - Supervision consultant client

### Documentation Métier

- `@attached_assets/Audit process et fonctionnement JLM.txt` - Documentation métier JLM
- `@attached_assets/Cahier des charges POC.txt` - Cahier des charges

---

**Note:** Ce fichier définit l'intelligence spécifique au domaine JLM Menuiserie/BTP avec compréhension métier, règles business mémorisées et validation décisions.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

