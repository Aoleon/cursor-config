import type {
  MenuiserieDomain,
  MenuiserieMaterial,
  MenuiserieProcess,
  MenuiserieNorm
} from "@shared/schema";

// ========================================
// BASE DE CONNAISSANCES MENUISERIE FRANÇAISE COMPLÈTE
// ========================================

/**
 * Base de connaissances spécialisée pour l'industrie de la menuiserie française
 * Conforme aux normes et pratiques de JLM (entreprise de POSE)
 * 
 * Sources :
 * - DTU 36.5 (Mise en œuvre des fenêtres et portes extérieures)
 * - RT2012/RE2020 (Réglementations thermiques)
 * - Normes CE et Acotherm
 * - Calendrier BTP français
 * - Pratiques secteur menuiserie/pose
 */

// ========================================
// MATÉRIAUX DE MENUISERIE
// ========================================

const MENUISERIE_MATERIALS: MenuiserieMaterial[] = [
  // === PVC ===
  {
    name: "PVC",
    aliases: [
      "polychlorure de vinyle", "chlorure de polyvinyle", "plastique",
      "PVC blanc", "PVC couleur", "PVC plaxé", "PVC structuré"
    ],
    properties: {
      thermal: 1.4, // Uw moyen (W/m²K)
      durability: 8, // Sur 10
      cost_category: "economique",
      installation_complexity: "simple"
    },
    suppliers: [
      "REHAU", "VEKA", "PROFINE (Kömmerling/Trocal)", "DECEUNINCK",
      "SALAMANDER", "GEALAN", "THYSSEN POLYMER"
    ],
    seasonal_constraints: [
      "Dilatation été importante",
      "Contrainte UV exposition sud",
      "Installation optimale 5-25°C"
    ],
    technical_specs: {
      coefficient_thermique_moyen: "1.1 à 1.6 W/m²K",
      classes_ew: ["E4-9A", "E6-12A", "E7-15A"],
      resistance_effraction: "Jusqu'à RC2 avec ferrage adapté",
      maintenance: "Faible - nettoyage annuel",
      duree_vie: "30-40 ans",
      recyclable: true,
      garantie_standard: "10 ans couleur + étanchéité",
      certifications: ["CE", "Acotherm", "Qualibat"],
      finitions_disponibles: [
        "Blanc brillant", "Blanc satiné", "Gris anthracite",
        "Chêne doré", "Noyer", "Décors bois variés"
      ]
    }
  },

  // === ALUMINIUM ===
  {
    name: "Aluminium",
    aliases: [
      "alu", "aluminium thermolaqué", "alu anodisé", "aluminium à rupture de pont thermique",
      "RPT", "alu couleur", "RAL personnalisé"
    ],
    properties: {
      thermal: 1.8, // Uw moyen avec RPT
      durability: 9,
      cost_category: "premium",
      installation_complexity: "moyenne"
    },
    suppliers: [
      "TECHNAL", "SCHÜCO", "REYNAERS", "KAWNEER", "WICONA",
      "ALIPLAST", "CORTIZO", "K•LINE (K-Line)"
    ],
    seasonal_constraints: [
      "Conductivité thermique élevée sans RPT",
      "Dilatation importante (zones climatiques)",
      "Oxydation marine (littoral)"
    ],
    technical_specs: {
      coefficient_thermique_moyen: "1.4 à 2.2 W/m²K (avec RPT)",
      classes_ew: ["E9-18A", "E12-21A", "E15-27A"],
      resistance_effraction: "Excellente - jusqu'à RC3/RC4",
      maintenance: "Très faible",
      duree_vie: "50+ ans",
      recyclable: true,
      garantie_standard: "10-15 ans selon traitement surface",
      certifications: ["CE", "Acotherm", "Qualimarine"],
      finitions_disponibles: [
        "Anodisé naturel", "Anodisé bronze", "Thermolaqué RAL",
        "Finition bois (placage)", "Sublimation", "Finition mate"
      ],
      traitement_surface: [
        "Anodisation 15-25 microns",
        "Thermolaquage 60-80 microns",
        "Sublimation (imitation bois)"
      ]
    }
  },

  // === BOIS ===
  {
    name: "Bois",
    aliases: [
      "bois massif", "lamellé-collé", "bois-alu", "mixte bois-alu",
      "pin", "chêne", "mélèze", "douglas", "bois exotique"
    ],
    properties: {
      thermal: 1.3, // Uw moyen
      durability: 7, // Variable selon essence et traitement
      cost_category: "standard",
      installation_complexity: "complexe"
    },
    suppliers: [
      "FERIMAT", "ZILTEN", "JELD-WEN", "BOIS ET DÉRIVÉS",
      "INTERNATIONAL WOOD", "ÉCHENOZ", "CLASSIC WOOD"
    ],
    seasonal_constraints: [
      "Sensible humidité/variations climatiques",
      "Maintenance périodique obligatoire",
      "Résineux : éviter pose période gel",
      "Séchage/retrait selon saisons"
    ],
    technical_specs: {
      coefficient_thermique_moyen: "1.2 à 1.8 W/m²K",
      classes_ew: ["E6-9A", "E9-15A", "E12-18A"],
      resistance_effraction: "Bonne à excellente selon épaisseur",
      maintenance: "Élevée - lasure/peinture tous les 3-5 ans",
      duree_vie: "30-60 ans selon entretien",
      recyclable: true,
      garantie_standard: "10 ans structure, 2-3 ans finition",
      certifications: ["CE", "PEFC/FSC", "CTB"],
      essences_courantes: [
        "Pin sylvestre (économique)",
        "Chêne (haut de gamme)",
        "Mélèze (résistance naturelle)",
        "Douglas (bon rapport qualité/prix)",
        "Exotique (meranti, moabi)"
      ]
    }
  },

  // === COMPOSITES MODERNES ===
  {
    name: "Composites",
    aliases: [
      "composite bois-PVC", "WPC", "fibre de verre", "matériaux composites",
      "hybride", "mixte", "bi-matière", "tri-matière"
    ],
    properties: {
      thermal: 1.1, // Performance optimisée
      durability: 9,
      cost_category: "premium",
      installation_complexity: "moyenne"
    },
    suppliers: [
      "FINSTRAL", "UNILUX", "ART ET FENÊTRES", "INTERNORM",
      "OKNOPLAST", "SOKN", "TRYBA (gammes premium)"
    ],
    seasonal_constraints: [
      "Excellente stabilité dimensionnelle",
      "Résistance UV optimisée",
      "Mise en œuvre toutes saisons"
    ],
    technical_specs: {
      coefficient_thermique_moyen: "0.9 à 1.3 W/m²K",
      classes_ew: ["E7-12A", "E9-15A", "E12-21A"],
      resistance_effraction: "Excellente",
      maintenance: "Très faible",
      duree_vie: "40+ ans",
      recyclable: "Partiellement",
      garantie_standard: "15-20 ans",
      certifications: ["CE", "Acotherm Premium", "Passivhaus"],
      innovations: [
        "Tri-couche bois-isolant-alu",
        "Fibres carbone/verre",
        "Nano-technologies",
        "Auto-nettoyant"
      ]
    }
  },

  // === ACIER/INOX ===
  {
    name: "Acier",
    aliases: [
      "acier galvanisé", "inox", "acier thermolaqué", "métal",
      "acier corten", "acier patinable"
    ],
    properties: {
      thermal: 2.5, // Performance thermique limitée
      durability: 9,
      cost_category: "premium",
      installation_complexity: "complexe"
    },
    suppliers: [
      "INSTALLUX", "JANSEN", "FORSTER", "STEEL WINDOWS",
      "METALNET", "HUECK (Allemagne)"
    ],
    seasonal_constraints: [
      "Pont thermique important",
      "Condensation hivernale",
      "Corrosion marine (littoral)"
    ],
    technical_specs: {
      coefficient_thermique_moyen: "2.0 à 3.0 W/m²K",
      classes_ew: ["E9-15A", "E12-18A"],
      resistance_effraction: "Excellente - RC3/RC4 standard",
      maintenance: "Moyenne à faible selon traitement",
      duree_vie: "50+ ans",
      recyclable: true,
      garantie_standard: "10-15 ans",
      certifications: ["CE", "Qualimarine"],
      applications_specifiques: [
        "Architecture contemporaine",
        "Rénovation monuments historiques",
        "Très grandes dimensions",
        "Sécurité renforcée"
      ]
    }
  }
];

// ========================================
// PROCESSUS DE MENUISERIE (WORKFLOW JLM)
// ========================================

const MENUISERIE_PROCESSES: MenuiserieProcess[] = [
  // === PHASE 1: PASSATION ===
  {
    phase: "passation",
    name: "Passation marché et obtention VIS",
    description: "Première phase du projet : envoi dossier complet au client et obtention du Visa (VIS) pour démarrage effectif",
    typical_duration_days: {
      min: 15,
      max: 45,
      average: 30
    },
    critical_checkpoints: [
      "Signature contrat client",
      "Réception acompte (30-40%)",
      "Constitution dossier technique complet",
      "Obtention VIS (Visa) client/maître d'ouvrage",
      "Validation assurances et garanties",
      "Planning prévisionnel validé"
    ],
    required_roles: ["commercial", "admin", "chef_projet"],
    dependencies: [
      "Offre signée et validée",
      "Dossier technique finalisé",
      "Conditions générales acceptées"
    ],
    seasonal_factors: {
      "fin_annee": 1.5, // Ralentissement administratif
      "rentree_septembre": 0.8, // Accélération reprise
      "ete": 1.3 // Congés ralentissent validations
    }
  },

  // === PHASE 2: ÉTUDE ===
  {
    phase: "etude",
    name: "Étude technique et conception",
    description: "Phase d'étude technique approfondie : relevés, plans, calculs thermiques, choix techniques définitifs",
    typical_duration_days: {
      min: 10,
      max: 25,
      average: 15
    },
    critical_checkpoints: [
      "Relevé de mesures sur site",
      "Plans techniques et cotes de fabrication",
      "Calculs thermiques (RT2012/RE2020)",
      "Choix définitifs : matériaux, couleurs, quincaillerie",
      "Validation client sur plans",
      "CCTP (Cahier Clauses Techniques Particulières)",
      "Dossier fabrication complet"
    ],
    required_roles: ["technicien_be", "chef_projet", "commercial"],
    dependencies: [
      "VIS obtenu",
      "Accès site client",
      "Validation choix esthétiques client"
    ],
    seasonal_factors: {
      "hiver": 1.2, // Difficultés accès chantier pour relevés
      "printemps": 0.9, // Conditions optimales
      "conges_ete": 1.4 // Indisponibilités équipes BE
    }
  },

  // === PHASE 3: VISA ARCHITECTE ===
  {
    phase: "visa_architecte",
    name: "VISA Architecte et validations réglementaires",
    description: "Validation par architecte/bureau de contrôle : conformité réglementaire, intégration architecturale, performance énergétique",
    typical_duration_days: {
      min: 5,
      max: 20,
      average: 10
    },
    critical_checkpoints: [
      "VISA plans par architecte",
      "Validation conformité DTU 36.5",
      "Contrôle performance thermique",
      "Validation intégration architecturale",
      "Accord bureau de contrôle si requis",
      "Validation maître d'ouvrage final"
    ],
    required_roles: ["technicien_be", "architecte_externe"],
    dependencies: [
      "Dossier étude complet",
      "Plans techniques validés",
      "Calculs thermiques finalisés"
    ],
    seasonal_factors: {
      "conges_ete": 1.8, // Indisponibilité architectes
      "fin_annee": 1.4, // Bouclage dossiers avant congés
      "rentree": 0.8 // Efficacité reprise
    }
  },

  // === PHASE 4: PLANIFICATION ===
  {
    phase: "planification",
    name: "Planification et ordonnancement",
    description: "Planification détaillée : commandes fournisseurs, planning fabrication, coordination chantier, ressources",
    typical_duration_days: {
      min: 5,
      max: 15,
      average: 8
    },
    critical_checkpoints: [
      "Planning fabrication détaillé",
      "Commandes matériaux et composants",
      "Réservation équipes pose",
      "Coordination avec autres corps d'état",
      "Planning livraison optimisé",
      "Validation délais client"
    ],
    required_roles: ["chef_projet", "planificateur", "acheteur"],
    dependencies: [
      "VISA architecte obtenu",
      "Budgets finalisés",
      "Disponibilités équipes"
    ],
    seasonal_factors: {
      "printemps": 1.2, // Forte charge planification
      "automne": 1.1, // Préparation campagne hiver
      "periode_normale": 1.0
    }
  },

  // === PHASE 5: APPROVISIONNEMENT ===
  {
    phase: "approvisionnement",
    name: "Approvisionnement et commandes",
    description: "Gestion des approvisionnements : commandes fournisseurs, gestion stocks, réceptions, contrôles qualité",
    typical_duration_days: {
      min: 15,
      max: 45,
      average: 25
    },
    critical_checkpoints: [
      "Passation commandes fournisseurs",
      "Suivi délais de livraison",
      "Réception et contrôle qualité",
      "Stockage sécurisé",
      "Gestion des non-conformités",
      "Préparation expédition chantier"
    ],
    required_roles: ["acheteur", "magasinier", "controleur_qualite"],
    dependencies: [
      "Planning validé",
      "Commandes lancées",
      "Espaces stockage disponibles"
    ],
    seasonal_factors: {
      "conges_ete": 1.6, // Fermetures fournisseurs
      "fin_annee": 1.4, // Congés + fermetures
      "rentree": 0.9, // Reprise efficace approvisionnements
      "hiver": 1.1 // Retards transport/livraisons
    }
  },

  // === PHASE 6: CHANTIER ===
  {
    phase: "chantier",
    name: "Exécution chantier et pose",
    description: "Phase de réalisation sur site : livraison, dépose ancien, pose, étanchéité, finitions, contrôles",
    typical_duration_days: {
      min: 2,
      max: 15,
      average: 5
    },
    critical_checkpoints: [
      "Livraison sécurisée sur chantier",
      "Dépose ancienne menuiserie si requis",
      "Pose selon DTU 36.5",
      "Étanchéité et isolation",
      "Réglages et finitions",
      "Contrôles conformité et tests",
      "Réception client",
      "Nettoyage et évacuation déchets"
    ],
    required_roles: ["chef_equipe", "poseur", "etancheur"],
    dependencies: [
      "Matériaux réceptionnés",
      "Site accessible",
      "Conditions météo favorables"
    ],
    seasonal_factors: {
      "hiver": 1.8, // Conditions météo difficiles
      "conges_ete": 1.3, // Réduction équipes
      "printemps": 0.8, // Conditions optimales
      "automne": 0.9, // Bonnes conditions avant hiver
      "pluie": 2.0, // Arrêts météo
      "gel": 3.0 // Impossible si températures négatives
    }
  },

  // === PHASE 7: SAV ===
  {
    phase: "sav",
    name: "Service après-vente",
    description: "Suivi post-installation : réglages, maintenance, garanties, interventions correctives",
    typical_duration_days: {
      min: 1,
      max: 10,
      average: 3
    },
    critical_checkpoints: [
      "Visite de réception finale (J+30)",
      "Réglages et ajustements",
      "Formation client (utilisation/entretien)",
      "Activation garanties",
      "Suivi périodique première année",
      "Interventions correctives si nécessaires"
    ],
    required_roles: ["technicien_sav", "chef_projet"],
    dependencies: [
      "Réception chantier",
      "Délai stabilisation (30 jours)",
      "Disponibilité équipes SAV"
    ],
    seasonal_factors: {
      "hiver": 1.4, // Plus d'interventions (condensation, réglages)
      "ete": 0.8, // Moins de problèmes
      "periode_normale": 1.0
    }
  }
];

// ========================================
// NORMES ET RÉGLEMENTATIONS MENUISERIE
// ========================================

const MENUISERIE_NORMS: MenuiserieNorm[] = [
  // === NORMES THERMIQUES ===
  {
    name: "Réglementation Thermique RT2012",
    code: "RT2012",
    description: "Réglementation thermique française pour bâtiments neufs, imposant des performances énergétiques minimales",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Composites"],
    applicable_types: ["fenetre", "porte", "baie_vitree", "veranda"],
    mandatory: true,
    check_points: [
      "Coefficient Uw ≤ 1.3 W/m²K (fenêtres)",
      "Coefficient Uw ≤ 1.7 W/m²K (portes)",
      "Facteur solaire Sw adapté selon orientation",
      "Transmission lumineuse TLw ≥ 0.3",
      "Perméabilité air ≤ A4 sous 600 Pa"
    ],
    compliance_requirements: [
      "Calcul réglementaire RT2012",
      "Attestation conformité",
      "Tests laboratoire accrédité COFRAC",
      "Marquage CE obligatoire",
      "DOP (Déclaration Performance) fournie"
    ]
  },

  {
    name: "Réglementation Environnementale RE2020",
    code: "RE2020",
    description: "Nouvelle réglementation environnementale, remplace RT2012 pour bâtiments neufs (applicable depuis 2022)",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Composites"],
    applicable_types: ["fenetre", "porte", "baie_vitree"],
    mandatory: true,
    check_points: [
      "Coefficient Uw ≤ 1.1 W/m²K (fenêtres)",
      "Coefficient Uw ≤ 1.5 W/m²K (portes)",
      "Analyse Cycle de Vie (ACV) produit",
      "Calcul impact carbone",
      "Confort d'été renforcé"
    ],
    compliance_requirements: [
      "FDES (Fiche Déclaration Environnementale Sanitaire)",
      "Calcul impact environnemental",
      "Tests performance été",
      "Certification environnementale"
    ]
  },

  // === NORMES TECHNIQUES DTU ===
  {
    name: "DTU 36.5 - Mise en œuvre fenêtres et portes extérieures",
    code: "DTU36.5",
    description: "Document Technique Unifié pour la pose de menuiseries extérieures, règles de l'art",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Acier", "Composites"],
    applicable_types: ["fenetre", "porte", "baie_vitree", "coulissant"],
    mandatory: true,
    check_points: [
      "Choix fixation selon matériau support",
      "Étanchéité air/eau/vent",
      "Isolation thermique périphérique",
      "Évacuation eaux pluviales",
      "Accessibilité PMR si requis",
      "Résistance au vent selon zone climatique"
    ],
    compliance_requirements: [
      "Respect règles pose DTU 36.5",
      "Utilisation matériaux certifiés",
      "Tests étanchéité in-situ",
      "PV conformité pose",
      "Garantie décennale pose"
    ]
  },

  // === ACCESSIBILITÉ PMR ===
  {
    name: "Accessibilité PMR",
    code: "PMR2015",
    description: "Réglementation accessibilité personnes à mobilité réduite (Ad'AP - Agenda Accessibilité Programmée)",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Composites"],
    applicable_types: ["porte", "fenetre", "baie_vitree"],
    mandatory: true, // Pour ERP et logements neufs
    check_points: [
      "Largeur passage ≥ 0.77m (portes)",
      "Effort ouverture ≤ 50N",
      "Hauteur poignée 0.90-1.30m",
      "Seuil ≤ 2cm (portes extérieures)",
      "Contraste visuel si requis",
      "Manœuvre d'une seule main"
    ],
    compliance_requirements: [
      "Attestation conformité PMR",
      "Tests effort ouverture",
      "Validation accessibilité",
      "Certification produit PMR"
    ]
  },

  // === SÉCURITÉ ===
  {
    name: "Résistance effraction RC (Resistance Class)",
    code: "EN1627-RC",
    description: "Classification européenne résistance à l'effraction, 6 classes de RC1 (basique) à RC6 (très haute sécurité)",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Acier", "Composites"],
    applicable_types: ["fenetre", "porte", "porte_entree"],
    mandatory: false, // Selon besoins client
    check_points: [
      "RC1: Résistance vandalisme léger",
      "RC2: Outils simples 3min (standard habitat)",
      "RC3: Outils mécaniques 5min (recommandé)",
      "RC4: Outils électriques 10min",
      "RC5: Outils électriques 15min",
      "RC6: Outils haute puissance 20min"
    ],
    compliance_requirements: [
      "Tests laboratoire EN1627-1630",
      "Certification RC par organisme notifié",
      "Conformité ensemble menuiserie+quincaillerie",
      "Marquage classe RC sur produit"
    ]
  },

  // === CERTIFICATION QUALITÉ ===
  {
    name: "Certification Acotherm",
    code: "ACOTHERM",
    description: "Certification française performance thermique et acoustique des menuiseries",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Composites"],
    applicable_types: ["fenetre", "porte", "coulissant", "baie_vitree"],
    mandatory: false, // Certification volontaire qualité
    check_points: [
      "Performance thermique Th (6 à 11)",
      "Performance acoustique Ac (28 à 42 dB)",
      "Étanchéité air/eau/vent",
      "Contrôles qualité fabrication",
      "Suivi performance in-situ"
    ],
    compliance_requirements: [
      "Tests CSTB (Centre Scientifique Technique Bâtiment)",
      "Contrôles fabrication périodiques",
      "Marquage Acotherm produit",
      "Suivi qualité post-certification"
    ]
  },

  // === MARQUAGE CE ===
  {
    name: "Marquage CE",
    code: "CE_MARKING",
    description: "Marquage de conformité européen obligatoire pour commercialisation menuiseries",
    applicable_materials: ["PVC", "Aluminium", "Bois", "Acier", "Composites"],
    applicable_types: ["fenetre", "porte", "baie_vitree", "coulissant"],
    mandatory: true,
    check_points: [
      "Conformité EN14351-1 (fenêtres/portes)",
      "DOP (Déclaration Performance) établie",
      "Système QPC (Qualité Production Certifiée)",
      "Tests performance par organisme notifié",
      "Marquage visible sur produit"
    ],
    compliance_requirements: [
      "DOP conforme à la norme produit",
      "Tests laboratoire accrédité",
      "Système qualité ISO9001 recommandé",
      "Dossier technique complet",
      "Marquage réglementaire apposé"
    ]
  }
];

// ========================================
// TERMINOLOGIE ET TRADUCTIONS MÉTIER
// ========================================

const MENUISERIE_TERMINOLOGY = {
  technical_terms: {
    // Performances thermiques
    "coefficient thermique": ["uw", "coefficient u", "transmission thermique", "performance thermique"],
    "facteur solaire": ["sw", "transmission énergétique", "apport solaire", "g"],
    "transmission lumineuse": ["tlw", "facteur lumière", "transparence"],
    
    // Étanchéité
    "étanchéité": ["air", "eau", "vent", "perméabilité", "AEV"],
    "perméabilité air": ["infiltrométrie", "test blower door", "n50"],
    "étanchéité eau": ["test arrosage", "résistance pluie battante"],
    
    // Matériaux
    "rupture pont thermique": ["rpt", "coupure thermique", "barrette polyamide"],
    "vitrage": ["double vitrage", "triple vitrage", "vir", "gaz argon"],
    "quincaillerie": ["ferrage", "paumelles", "crémones", "espagnolettes"],
    
    // Sécurité
    "résistance effraction": ["rc", "anti-effraction", "sécurité", "a2p"],
    "verrouillage": ["multipoints", "3 points", "5 points", "fermeture"],
    
    // Pose
    "calfeutrement": ["étanchéité périphérique", "mousse pu", "joint"],
    "appui": ["appui fenêtre", "rejingot", "evacuation eau"],
    "dormant": ["cadre fixe", "bâti", "huisserie"],
    "ouvrant": ["vantail", "battant", "partie mobile"],
    
    // Règlementaire
    "pmr": ["accessibilité", "handicap", "personnes mobilité réduite"],
    "rt2012": ["réglementation thermique", "bbc", "bâtiment basse consommation"],
    "re2020": ["réglementation environnementale", "carbone", "ges"]
  },
  
  sql_to_business: {
    // Tables principales
    "projects": "projets de menuiserie",
    "offers": "offres commerciales",
    "project_timelines": "planning des phases",
    "materials": "matériaux et composants",
    "suppliers": "fournisseurs menuiserie",
    
    // Colonnes courantes
    "project_status": "statut du projet",
    "date_echeance": "date d'échéance",
    "responsible_user_id": "responsable projet",
    "material_type": "type de matériau",
    "material_color": "couleur/finition",
    "coefficient_thermique": "performance thermique Uw",
    "price_total": "montant total",
    "date_creation": "date de création",
    "date_livraison": "date de livraison prévue",
    "phase_status": "statut de la phase",
    
    // Colonnes spécialisées
    "uw_coefficient": "coefficient thermique Uw",
    "aev_class": "classe étanchéité AEV",
    "rc_level": "niveau résistance effraction",
    "pmr_compliant": "conforme PMR",
    "ce_marking": "marquage CE",
    "warranty_years": "années de garantie"
  },
  
  business_to_sql: {
    // Traduction inverse
    "projets de menuiserie": "projects",
    "offres commerciales": "offers", 
    "planning des phases": "project_timelines",
    "matériaux et composants": "materials",
    "fournisseurs menuiserie": "suppliers",
    
    "statut du projet": "project_status",
    "date d'échéance": "date_echeance", 
    "responsable projet": "responsible_user_id",
    "type de matériau": "material_type",
    "couleur/finition": "material_color",
    "performance thermique": "coefficient_thermique",
    "montant total": "price_total",
    
    // Expressions métier courantes
    "projets en retard": "projects WHERE date_echeance < NOW() AND status != 'termine'",
    "projets de l'équipe": "projects WHERE responsible_user_id IN (team_members)",
    "offres en cours": "offers WHERE status IN ('etude_technique', 'en_cours_chiffrage')",
    "planning cette semaine": "project_timelines WHERE date_debut <= DATE_ADD(NOW(), INTERVAL 7 DAY)",
    "matériaux PVC": "materials WHERE material_type = 'PVC'",
    "projets RT2012": "projects WHERE rt2012_compliant = true"
  }
};

// ========================================
// CALENDRIER BTP ET SAISONNALITÉ 2025
// ========================================

const BTP_CALENDAR_2025 = {
  // Congés BTP traditionnels
  btp_holidays: [
    {
      start: "2025-07-14", // 14 juillet
      end: "2025-08-24", // Fin août traditionnelle
      impact: "Ralentissement général chantiers et fournisseurs (80% activité)"
    },
    {
      start: "2025-12-22", // Semaine Noël
      end: "2026-01-06", // Épiphanie
      impact: "Arrêt quasi-total activité BTP et administrative"
    },
    {
      start: "2025-04-21", // Lundi Pâques
      end: "2025-04-21",
      impact: "Pont de Pâques - ralentissement ponctuel"
    },
    {
      start: "2025-05-01", // 1er mai
      end: "2025-05-01", 
      impact: "Fermeture générale"
    },
    {
      start: "2025-05-08", // 8 mai
      end: "2025-05-09", // Vendredi pont
      impact: "Pont du 8 mai - activité réduite"
    },
    {
      start: "2025-05-29", // Ascension
      end: "2025-05-30", // Vendredi pont
      impact: "Pont Ascension - ralentissement"
    },
    {
      start: "2025-06-09", // Lundi Pentecôte
      end: "2025-06-09",
      impact: "Pentecôte - journée de solidarité"
    }
  ],
  
  // Périodes de forte demande
  peak_seasons: [
    {
      months: [3, 4, 5], // Printemps
      demand_factor: 1.4, // +40% demande
      lead_time_factor: 1.3, // +30% délais
      description: "Printemps - reprise activité post-hiver, préparation campagne été"
    },
    {
      months: [9, 10, 11], // Automne
      demand_factor: 1.5, // +50% demande 
      lead_time_factor: 1.4, // +40% délais
      description: "Automne - course finition avant hiver, commandes avant congés"
    },
    {
      months: [1, 2], // Début année
      demand_factor: 1.2, // +20% demande
      lead_time_factor: 1.1, // +10% délais
      description: "Reprise janvier - rattrapage retards fin d'année"
    }
  ],
  
  // Contraintes météorologiques
  weather_constraints: [
    {
      months: [11, 12, 1, 2], // Hiver
      affected_phases: ["chantier", "approvisionnement"],
      impact_factor: 1.8, // +80% délais
      description: "Hiver - gel, neige, conditions difficiles chantier"
    },
    {
      months: [6, 7, 8], // Été
      affected_phases: ["chantier"],
      impact_factor: 1.2, // +20% délais
      description: "Été - fortes chaleurs, orages, contraintes horaires"
    },
    {
      months: [3, 4], // Printemps pluvieux
      affected_phases: ["chantier"],
      impact_factor: 1.3, // +30% délais
      description: "Printemps - période pluvieuse, retards météo"
    }
  ],
  
  // Événements spéciaux secteur
  industry_events: [
    {
      name: "Salon EQUIP'BAIE METALEXPO",
      month: 11, // Novembre années impaires
      impact: "Indisponibilité fournisseurs et fabricants 1 semaine"
    },
    {
      name: "Congrès UFME (Union Française Menuiserie Extérieure)",
      month: 6,
      impact: "Réunions professionnelles, planifications annuelles"
    }
  ]
};

// ========================================
// ASSEMBLAGE FINAL BASE DE CONNAISSANCES
// ========================================

export const MENUISERIE_KNOWLEDGE_BASE: MenuiserieDomain = {
  materials: MENUISERIE_MATERIALS,
  processes: MENUISERIE_PROCESSES,
  norms: MENUISERIE_NORMS,
  seasonal_calendar: BTP_CALENDAR_2025,
  terminology: MENUISERIE_TERMINOLOGY
};

// ========================================
// FONCTIONS UTILITAIRES D'ACCÈS
// ========================================

/**
 * Recherche de matériaux par nom ou alias
 */
export function findMaterialByName(searchTerm: string): MenuiserieMaterial | null {
  const term = searchTerm.toLowerCase();
  return MENUISERIE_MATERIALS.find(material => 
    material.name.toLowerCase().includes(term) ||
    material.aliases.some(alias => alias.toLowerCase().includes(term))
  ) || null;
}

/**
 * Récupération des processus par phase
 */
export function getProcessByPhase(phase: string): MenuiserieProcess | null {
  return MENUISERIE_PROCESSES.find(process => process.phase === phase) || null;
}

/**
 * Recherche de normes applicables à un matériau
 */
export function getNormsForMaterial(material: string): MenuiserieNorm[] {
  return MENUISERIE_NORMS.filter(norm => 
    norm.applicable_materials.includes(material)
  );
}

/**
 * Calcul facteur saisonnier pour une date donnée
 */
export function getSeasonalFactor(date: Date, phase: string): number {
  const month = date.getMonth() + 1;
  
  // Vérification contraintes météo
  const weatherConstraint = BTP_CALENDAR_2025.weather_constraints.find(constraint =>
    constraint.months.includes(month) && 
    constraint.affected_phases.includes(phase)
  );
  
  if (weatherConstraint) {
    return weatherConstraint.impact_factor;
  }
  
  // Vérification périodes de pointe
  const peakSeason = BTP_CALENDAR_2025.peak_seasons.find(season =>
    season.months.includes(month)
  );
  
  if (peakSeason) {
    return peakSeason.lead_time_factor;
  }
  
  return 1.0; // Facteur normal
}

/**
 * Vérification si une date tombe pendant les congés BTP
 */
export function isBTPHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  
  return BTP_CALENDAR_2025.btp_holidays.some(holiday => {
    return dateStr >= holiday.start && dateStr <= holiday.end;
  });
}

/**
 * Traduction terme métier vers SQL
 */
export function translateBusinessToSQL(businessTerm: string): string {
  const term = businessTerm.toLowerCase();
  return MENUISERIE_TERMINOLOGY.business_to_sql[term] || businessTerm;
}

/**
 * Traduction colonne SQL vers terme métier
 */
export function translateSQLToBusiness(sqlColumn: string): string {
  return MENUISERIE_TERMINOLOGY.sql_to_business[sqlColumn] || sqlColumn;
}

/**
 * Recherche synonymes d'un terme technique
 */
export function getTechnicalSynonyms(term: string): string[] {
  const termLower = term.toLowerCase();
  for (const [key, synonyms] of Object.entries(MENUISERIE_TERMINOLOGY.technical_terms)) {
    if (key.includes(termLower) || synonyms.some(syn => syn.includes(termLower))) {
      return [key, ...synonyms];
    }
  }
  return [term];
}

// ========================================
// PATTERNS D'EXTRACTION OCR - CENTRALISÉS
// ========================================

/**
 * Patterns matériaux pour extraction OCR
 * Utilisés par ocrService.ts pour détecter les matériaux dans les documents
 */
export const MATERIAL_PATTERNS: Record<string, RegExp> = {
  pvc: /\b(?:PVC|P\.?V\.?C\.?|chlorure de polyvinyle|polychlorure de vinyle|vinyle)\b/gi,
  bois: /\b(?:bois|chêne|hêtre|sapin|pin|frêne|érable|noyer|teck|iroko|douglas|mélèze|épicéa|châtaignier|orme|merisier|essence de bois|bois massif|bois lamellé|lamellé-collé|contreplaqué|multiplis)\b/gi,
  aluminium: /\b(?:aluminium|alu|dural|alliage d'aluminium|alu laqué|alu anodisé)\b/gi,
  acier: /\b(?:acier|steel|métal|fer|inox|inoxydable|galvanisé|galva|acier thermolaqué)\b/gi,
  composite: /\b(?:composite|fibre de verre|stratifié|résine|matériau composite|sandwich|panneau composite)\b/gi,
  mixte_bois_alu: /\b(?:mixte|bois.{0,20}alu|alu.{0,20}bois|hybride|bi-matière|menuiserie mixte)\b/gi,
  inox: /\b(?:inox|inoxydable|stainless|acier inoxydable|AISI 304|AISI 316)\b/gi,
  galva: /\b(?:galva|galvanisé|zinc|électro-galvanisé|zingage)\b/gi,
  fibre_de_verre: /\b(?:fibre de verre|polyester|GRP|glass reinforced plastic)\b/gi,
  polycarbonate: /\b(?:polycarbonate|lexan|makrolon)\b/gi,
  verre: /\b(?:verre|vitrage|double vitrage|triple vitrage|verre feuilleté|verre trempé|verre sécurit)\b/gi,
};

/**
 * Patterns couleurs et finitions pour extraction OCR
 * Utilisés par ocrService.ts pour détecter les couleurs dans les documents
 */
export const COLOR_PATTERNS = {
  ralCodes: /\b(?:RAL|ral)[\s-]?(\d{4})\b/gi,
  colorNames: /\b(?:blanc|noir|gris|anthracite|ivoire|beige|taupe|sable|bordeaux|vert|bleu|rouge|jaune|orange|marron|chêne doré|acajou|noyer|wengé|argent|bronze|cuivre|laiton|crème|champagne|titane|graphite|sépia|caramel|chocolat|moka|cappuccino|vanille|perle|nacre)\b/gi,
  finishes: /\b(?:mat|matte?|satiné?|brillant|glossy|texturé?|sablé|anodisé|thermolaqué|laqué|plaxé|brossé|poli|grainé|martelé|structuré|lisse|effet bois|veiné|strié|lisse|rugueux|microtexturé|granité|metallic)\b/gi,
  woodFinishes: /\b(?:chêne naturel|chêne doré|chêne rustique|pin naturel|douglas|mélèze|teinté wengé|teinté noyer|vernis incolore|lasure|saturateur|huile de lin)\b/gi,
  specialFinishes: /\b(?:thermolaquage|anodisation|galvanisation à chaud|peinture époxy|traitement anti-corrosion|protection UV|finition marine)\b/gi,
};

/**
 * Patterns d'extraction pour les Appels d'Offres (AO)
 * Utilisés par ocrService.ts pour extraire les informations des documents AO
 */
export const AO_PATTERNS: Record<string, RegExp[]> = {
  // Références d'AO
  reference: [
    /(?:appel d'offres?|ao|marché)\s*n?°?\s*:?\s*([a-z0-9\-_\/]+)/i,
    /référence\s*:?\s*([a-z0-9\-_\/]+)/i,
    /n°\s*([a-z0-9\-_\/]+)/i,
  ],
  
  // Dates (formats français)
  dates: [
    /(?:date de remise|remise des offres|échéance)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:date limite|limite de remise)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
  ],
  
  // Maître d'ouvrage
  maitreOuvrage: [
    /(?:maître d'ouvrage|maitre d'ouvrage|mo)\s*:?\s*([^\n]+)/i,
    /(?:pour le compte de|client)\s*:?\s*([^\n]+)/i,
  ],
  
  // Maître d'œuvre
  maitreOeuvre: [
    /(?:maître d'œuvre|maitre d'oeuvre|maître d'oeuvre|moe)\s*:?\s*([^\n]+)/i,
    /(?:architecte)\s*:?\s*([^\n]+)/i,
  ],
  
  // Adresses
  adresse: [
    /(?:adresse|lieu|site)\s*:?\s*([^\n]+)/i,
    /(\d{1,3}[,\s]+(?:rue|avenue|boulevard|chemin|allée|place|impasse)[^\n]+)/i,
  ],
  
  // Codes postaux et villes
  codePostal: [
    /\b(\d{5})\b/g,
    /(?:code postal|cp)\s*:?\s*(\d{5})/i,
  ],
  
  ville: [
    /(?:ville)\s*:?\s*([^\n]+)/i,
    /\d{5}\s+([A-Z][A-Za-zÀ-ÿ\s\-']+)/i,
  ],
  
  // Contacts
  email: [
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
  ],
  
  telephone: [
    /(?:tél|téléphone|phone|mobile)\s*:?\s*((?:\+33|0)\s*[1-9](?:\s*\d{2}){4})/gi,
    /((?:\+33|0)\s*[1-9](?:\s*\d{2}){4})/g,
  ],
  
  // Montants et budgets
  montant: [
    /(?:montant|budget|coût|prix)\s*:?\s*([\d\s]+(?:,\d{2})?\s*€)/i,
    /([\d\s]+(?:,\d{2})?\s*€)/g,
  ],
  
  // Classification AEV
  aevClassification: [
    /(?:aev|a\*?\d+\s*e\*?\d+[a-z]?\s*v\*?[a-z]?\d+)/i,
  ],
  
  // Certifications
  certifications: [
    /(?:certifié|certification|norme|conforme)\s+([A-Z0-9\s\-]+)/i,
    /(?:CE|NF|CSTB|ACOTHERM|CEKAL)/g,
  ],
};

/**
 * Patterns pour détecter les lignes de devis
 * Utilisés par ocrService.ts pour extraire les lignes de devis fournisseurs
 */
export const LINE_ITEM_PATTERNS = {
  // Détection des lignes avec quantité et prix
  fullLine: /(\d+(?:[,\.]\d+)?)\s*(?:u|pcs?|m[²²]?|ml?)\s*[xX*]?\s*([^\d\n]+?)\s*((?:\d+(?:[,\.]\d+)?(?:\s*€)?|€\s*\d+(?:[,\.]\d+)?))/gi,
  
  // Détection des désignations de produits
  designation: /^[\s-]*(.+?)(?:\s*\d+[,\.]\d+\s*€|\s*€\s*\d+[,\.]\d+|$)/,
  
  // Détection quantité/unité
  quantityUnit: /(\d+(?:[,\.]\d+)?)\s*(u|pcs?|m[²²]?|ml?|kg|tonnes?)/i,
  
  // Détection prix unitaire et total
  prices: /((?:\d+(?:[,\.]\d+)?(?:\s*€)?|€\s*\d+(?:[,\.]\d+)?))/g,
  
  // Références produits
  reference: /(?:ref|référence|code)\s*:?\s*([A-Z0-9\-_]+)/i,
};