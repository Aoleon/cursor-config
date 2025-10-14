/**
 * Fixtures de test réutilisables pour les tests E2E
 */

// ========================================
// DONNÉES DE PROJETS
// ========================================

export const testProject = {
  name: 'Projet Test E2E',
  client: 'Client Test',
  budget: 50000,
  location: 'Paris',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'etude' as const
};

export const testProjects = [
  {
    name: 'Rénovation Bureau A',
    client: 'Entreprise Alpha',
    budget: 75000,
    location: 'Lyon',
    status: 'planification'
  },
  {
    name: 'Construction Entrepôt B',
    client: 'Société Beta',
    budget: 150000,
    location: 'Marseille',
    status: 'chantier'
  },
  {
    name: 'Aménagement Magasin C',
    client: 'Commerce Gamma',
    budget: 35000,
    location: 'Lille',
    status: 'approvisionnement'
  }
];

// ========================================
// DONNÉES DE DEVIS/OFFRES
// ========================================

export const testOffer = {
  title: 'Devis Menuiserie Extérieure',
  client: 'Client VIP',
  reference: `DEV-${Date.now()}`,
  montantEstime: 25000,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'draft'
};

export const testOffers = [
  {
    title: 'Fourniture Fenêtres PVC',
    client: 'Résidence Les Lilas',
    montantEstime: 45000,
    status: 'en_cours_chiffrage'
  },
  {
    title: 'Portes Coupe-feu Immeuble',
    client: 'Syndic Horizon',
    montantEstime: 18000,
    status: 'en_cours_chiffrage'
  },
  {
    title: 'Bardage Bois Façade Nord',
    client: 'Mairie de Vincennes',
    montantEstime: 62000,
    status: 'validé'
  }
];

// ========================================
// DONNÉES DPGF
// ========================================

export const testDpgfLines = [
  {
    designation: 'Fenêtre PVC double vitrage 120x140',
    quantity: 10,
    unitPrice: 450,
    unit: 'U'
  },
  {
    designation: 'Pose et réglage fenêtre',
    quantity: 10,
    unitPrice: 150,
    unit: 'U'
  },
  {
    designation: 'Habillage intérieur',
    quantity: 10,
    unitPrice: 75,
    unit: 'U'
  }
];

// ========================================
// QUESTIONS CHATBOT
// ========================================

export const testQuestions = {
  simple: [
    'Quel est le CA total ?',
    'Combien de projets en cours ?',
    'Liste des derniers devis'
  ],
  
  medium: [
    'Montre les projets en retard avec leurs responsables',
    'Compare les marges par type de projet',
    'Évolution du CA sur 6 mois'
  ],
  
  complex: [
    'Analyse la rentabilité par zone géographique et type de client sur Q1 2025',
    'Prédis les besoins en ressources pour les 3 prochains mois',
    'Identifie les patterns de retard dans les projets de rénovation'
  ],
  
  invalid: [
    '',
    '   ',
    'a'.repeat(501), // Dépasse la limite de 500 caractères
  ],
  
  malicious: [
    "'; DROP TABLE users; --",
    '<script>alert("XSS")</script>',
    '${process.env.DATABASE_URL}',
    '../../../etc/passwd'
  ]
};

// ========================================
// DONNÉES FOURNISSEURS
// ========================================

export const testSuppliers = [
  {
    name: 'Fournisseur Bois Premium',
    contact: 'Jean Dupont',
    email: 'contact@bois-premium.fr',
    phone: '01 23 45 67 89',
    scoreQuality: 4.5,
    scorePrice: 3.8,
    scoreDelay: 4.2
  },
  {
    name: 'PVC Solutions Pro',
    contact: 'Marie Martin',
    email: 'info@pvc-solutions.fr',
    phone: '01 98 76 54 32',
    scoreQuality: 4.0,
    scorePrice: 4.5,
    scoreDelay: 4.0
  }
];

// ========================================
// DONNÉES UTILISATEURS
// ========================================

export const testUsers = {
  admin: {
    username: 'admin@test.com',
    password: 'Admin123!',
    role: 'admin'
  },
  manager: {
    username: 'manager@test.com',
    password: 'Manager123!',
    role: 'manager'
  },
  user: {
    username: 'user@test.com',
    password: 'User123!',
    role: 'user'
  }
};

// ========================================
// HELPERS DE GÉNÉRATION
// ========================================

export function generateTestOffer(overrides?: Partial<typeof testOffer>) {
  return {
    ...testOffer,
    reference: `DEV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...overrides
  };
}

export function generateTestProject(overrides?: Partial<typeof testProject>) {
  return {
    ...testProject,
    name: `${testProject.name} - ${Date.now()}`,
    ...overrides
  };
}

export function generateDpgfLine(overrides?: Partial<typeof testDpgfLines[0]>) {
  const baseLine = testDpgfLines[0];
  return {
    ...baseLine,
    ...overrides,
    total: (overrides?.quantity || baseLine.quantity) * (overrides?.unitPrice || baseLine.unitPrice)
  };
}

// ========================================
// DONNÉES DE VALIDATION
// ========================================

export const validationRules = {
  offer: {
    titleMinLength: 3,
    titleMaxLength: 200,
    clientMinLength: 2,
    clientMaxLength: 100,
    montantMin: 0,
    montantMax: 10000000,
    referencePattern: /^[A-Z]{2,}-\d+/
  },
  
  chatbot: {
    queryMinLength: 1,
    queryMaxLength: 500,
    maxQueriesPerMinute: 10,
    responseTimeout: 30000
  },
  
  dpgf: {
    designationMinLength: 3,
    quantityMin: 0.01,
    quantityMax: 99999,
    unitPriceMin: 0,
    unitPriceMax: 999999
  }
};

// ========================================
// MOCK RESPONSES
// ========================================

export const mockResponses = {
  chatbot: {
    success: {
      success: true,
      response: 'Voici les résultats de votre requête',
      execution_time_ms: 250,
      confidence: 0.95,
      sql: 'SELECT * FROM projects WHERE status = "active"',
      results: [
        { id: 1, name: 'Projet A', status: 'active' },
        { id: 2, name: 'Projet B', status: 'active' }
      ]
    },
    
    error: {
      success: false,
      error: {
        message: 'Erreur lors du traitement de la requête',
        code: 'QUERY_ERROR'
      }
    },
    
    rateLimit: {
      success: false,
      error: {
        message: 'Trop de requêtes. Veuillez patienter.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      }
    }
  },
  
  database: {
    connectionError: {
      error: 'Database connection lost',
      message: 'Impossible de se connecter à la base de données'
    },
    
    timeout: {
      error: 'Query timeout',
      message: 'La requête a pris trop de temps'
    }
  }
};

// ========================================
// DONNÉES DE PERFORMANCE
// ========================================

export const performanceThresholds = {
  pageLoad: 3000, // 3 secondes max
  apiResponse: 5000, // 5 secondes max
  chatbotResponse: 30000, // 30 secondes max (IA)
  dpgfCalculation: 500, // 500ms max
  searchResults: 2000 // 2 secondes max
};

// ========================================
// SÉLECTEURS RÉUTILISABLES
// ========================================

export const selectors = {
  chatbot: {
    input: 'input[placeholder*="Posez votre question"]',
    sendButton: 'button[type="submit"]',
    messageUser: '[role="article"]:has-text("user")',
    messageAssistant: '[role="article"]:has-text("assistant")',
    debugToggle: '[data-testid="debug-mode-toggle"]',
    healthBadge: 'text=/Opérationnel|Dégradé/',
    presetQuery: '[data-testid^="preset-query-"]'
  },
  
  offers: {
    newButton: 'button:has-text("Nouvel AO")',
    offerCard: '[data-testid^="offer-card-"]',
    titleInput: 'input[name="title"], label:has-text("Titre") + input',
    clientInput: 'input[name="client"], label:has-text("Client") + input',
    amountInput: 'input[name="amount"], label:has-text("Montant") + input',
    submitButton: 'button:has-text("Créer"), button:has-text("Soumettre")'
  },
  
  dpgf: {
    addLineButton: 'button:has-text("Ajouter une ligne")',
    designationInput: 'input[placeholder*="Désignation"]',
    quantityInput: 'input[placeholder*="Quantité"]',
    unitPriceInput: 'input[placeholder*="Prix unitaire"]',
    lineTotal: '[data-testid^="line-total-"]',
    grandTotal: '[data-testid="grand-total"]'
  }
};

// ========================================
// EXPORT PAR DÉFAUT
// ========================================

export default {
  testProject,
  testProjects,
  testOffer,
  testOffers,
  testDpgfLines,
  testQuestions,
  testSuppliers,
  testUsers,
  generateTestOffer,
  generateTestProject,
  generateDpgfLine,
  validationRules,
  mockResponses,
  performanceThresholds,
  selectors
};