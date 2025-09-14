/**
 * Script pour créer des données d'exemple pour le POC Saxium
 * Exécuter avec: node scripts/seed-data.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from '../shared/schema.ts'

// Configuration WebSocket pour Neon
neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle({ client: pool, schema })

async function seedData() {
  console.log('🌱 Création des données d\'exemple pour le POC Saxium...')

  try {
    // 1. Utilisateurs de test
    console.log('👥 Création des utilisateurs...')
    const users = [
      {
        id: 'test-user-1',
        email: 'sylvie.be@jlm-menuiserie.fr',
        firstName: 'Sylvie',
        lastName: 'Martin',
        role: 'responsable_be'
      },
      {
        id: 'test-user-2',
        email: 'jean.tech@jlm-menuiserie.fr',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'technicien_be'
      },
      {
        id: 'test-user-3',
        email: 'marie.chef@jlm-menuiserie.fr',
        firstName: 'Marie',
        lastName: 'Bernard',
        role: 'chef_projet'
      }
    ]

    for (const user of users) {
      await db.insert(schema.users)
        .values(user)
        .onConflictDoNothing()
    }

    // 2. AOs d'exemple
    console.log('📋 Création des AOs...')
    const aos = [
      {
        id: 'ao-001',
        reference: 'AO-2024-001',
        client: 'Mairie de Caen',
        location: 'Caen (14)',
        departement: '14',
        description: 'Rénovation fenêtres bâtiment municipal',
        menuiserieType: 'fenetre',
        estimatedAmount: '85000',
        maitreOeuvre: 'Cabinet Architecte Normand',
        source: 'website',
        dateOS: new Date('2024-01-15'),
        delaiContractuel: '90',
        selectionComment: 'Dossier intéressant, bon rapport qualité/prix attendu'
      },
      {
        id: 'ao-002',
        reference: 'AO-2024-002',
        client: 'SCI Les Jardins',
        location: 'Bayeux (14)',
        departement: '14',
        description: 'Portes d\'entrée résidence',
        menuiserieType: 'porte',
        estimatedAmount: '45000',
        maitreOeuvre: 'Promoteur Calvados',
        source: 'partner',
        dateOS: new Date('2024-01-20'),
        delaiContractuel: '60',
        selectionComment: 'Client récurrent, délais serrés'
      }
    ]

    for (const ao of aos) {
      await db.insert(schema.aos)
        .values(ao)
        .onConflictDoNothing()
    }

    // 3. Offres d'exemple
    console.log('💼 Création des offres...')
    const offers = [
      {
        id: 'offer-001',
        reference: 'OFF-2024-001',
        aoId: 'ao-001',
        client: 'Mairie de Caen',
        location: 'Caen (14)',
        menuiserieType: 'fenetre',
        estimatedAmount: '85000',
        status: 'en_cours_chiffrage',
        responsibleUserId: 'test-user-1',
        deadline: new Date('2024-02-15'),
        isPriority: true,
        finalAmount: null,
        dpgfData: null,
        batigestRef: null
      },
      {
        id: 'offer-002',
        reference: 'OFF-2024-002',
        aoId: 'ao-002',
        client: 'SCI Les Jardins',
        location: 'Bayeux (14)',
        menuiserieType: 'porte',
        estimatedAmount: '45000',
        status: 'en_attente_validation',
        responsibleUserId: 'test-user-2',
        deadline: new Date('2024-02-10'),
        isPriority: false,
        finalAmount: '43500',
        dpgfData: null,
        batigestRef: null
      }
    ]

    for (const offer of offers) {
      await db.insert(schema.offers)
        .values(offer)
        .onConflictDoNothing()
    }

    // 4. Charges de travail BE
    console.log('⏱️ Création des charges de travail BE...')
    const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    const workloads = [
      {
        id: 'workload-001',
        userId: 'test-user-1',
        weekNumber: currentWeek,
        year: new Date().getFullYear(),
        plannedHours: '38',
        actualHours: '35',
        capacityHours: '40'
      },
      {
        id: 'workload-002',
        userId: 'test-user-2',
        weekNumber: currentWeek,
        year: new Date().getFullYear(),
        plannedHours: '42',
        actualHours: '40',
        capacityHours: '40'
      }
    ]

    for (const workload of workloads) {
      await db.insert(schema.beWorkload)
        .values(workload)
        .onConflictDoNothing()
    }

    // 5. Maîtres d'ouvrage et d'œuvre avec contacts complets
    console.log('🏢 Création des maîtres d\'ouvrage...')
    const maitresOuvrage = [
      {
        id: 'maitre-ouvrage-001',
        nom: 'Mairie de Caen',
        typeOrganisation: 'Collectivité territoriale',
        adresse: '2 rue des Cordeliers',
        codePostal: '14000',
        ville: 'Caen',
        departement: '14',
        telephone: '02.31.30.41.00',
        email: 'urbanisme@ville-caen.fr',
        siteWeb: 'https://www.caen.fr',
        siret: '21140118300019',
        contactPrincipalNom: 'Martine Durand',
        contactPrincipalPoste: 'Directrice des Services Techniques',
        contactPrincipalTelephone: '02.31.30.41.15',
        contactPrincipalEmail: 'martine.durand@ville-caen.fr',
        notes: 'Client institutionnel de confiance, procédures strictes mais partenaire fidèle',
        isActive: true
      },
      {
        id: 'maitre-ouvrage-002',
        nom: 'SCI Les Jardins de Bayeux',
        typeOrganisation: 'Société civile immobilière',
        adresse: '15 Avenue du 6 Juin',
        codePostal: '14400',
        ville: 'Bayeux',
        departement: '14',
        telephone: '02.31.51.25.33',
        email: 'contact@sci-jardins-bayeux.fr',
        contactPrincipalNom: 'Philippe Leclerc',
        contactPrincipalPoste: 'Gérant',
        contactPrincipalTelephone: '06.12.34.56.78',
        contactPrincipalEmail: 'p.leclerc@sci-jardins-bayeux.fr',
        notes: 'Promoteur privé, projets de qualité, délais respectés',
        isActive: true
      },
      {
        id: 'maitre-ouvrage-003',
        nom: 'OPAC du Calvados',
        typeOrganisation: 'Office public de l\'habitat',
        adresse: '12 rue Saint-Laurent',
        codePostal: '14000',
        ville: 'Caen',
        departement: '14',
        telephone: '02.31.95.95.95',
        email: 'technique@opac14.fr',
        siteWeb: 'https://www.opac14.fr',
        siret: '26140001700019',
        contactPrincipalNom: 'Sophie Martin',
        contactPrincipalPoste: 'Responsable Technique',
        contactPrincipalTelephone: '02.31.95.95.12',
        contactPrincipalEmail: 'sophie.martin@opac14.fr',
        notes: 'Bailleur social, volumes importants, prix serrés mais régularité',
        isActive: true
      }
    ]

    for (const maitre of maitresOuvrage) {
      await db.insert(schema.maitresOuvrage)
        .values(maitre)
        .onConflictDoNothing()
    }

    console.log('🏗️ Création des maîtres d\'œuvre...')
    const maitresOeuvre = [
      {
        id: 'maitre-oeuvre-001',
        nom: 'Cabinet Architecte Normand',
        typeOrganisation: 'Cabinet d\'architecture',
        adresse: '8 rue des Jacobins',
        codePostal: '14000',
        ville: 'Caen',
        departement: '14',
        telephone: '02.31.86.45.20',
        email: 'contact@architecte-normand.fr',
        siteWeb: 'https://www.architecte-normand.fr',
        siret: '41234567890123',
        specialites: 'Rénovation patrimoine, Bâtiments publics, Logement collectif',
        notes: 'Cabinet reconnu, spécialiste rénovation énergétique, prescripteur de confiance',
        isActive: true
      },
      {
        id: 'maitre-oeuvre-002',
        nom: 'Promoteur Calvados SARL',
        typeOrganisation: 'Société de promotion immobilière',
        adresse: '25 Boulevard Maréchal Leclerc',
        codePostal: '14400',
        ville: 'Bayeux',
        departement: '14',
        telephone: '02.31.51.40.50',
        email: 'contact@promoteur-calvados.fr',
        specialites: 'Logement neuf, Programmes privés, Maisons individuelles',
        notes: 'Promoteur local dynamique, projets haut de gamme',
        isActive: true
      },
      {
        id: 'maitre-oeuvre-003',
        nom: 'BE Technique Normandie',
        typeOrganisation: 'Bureau d\'études technique',
        adresse: '45 rue de la République',
        codePostal: '14000',
        ville: 'Caen',
        departement: '14',
        telephone: '02.31.75.88.90',
        email: 'etudes@be-normandie.fr',
        siteWeb: 'https://www.be-normandie.fr',
        siret: '52987654321098',
        specialites: 'Études thermiques, Structure, Fluides, Économie',
        notes: 'Bureau d\'études complet, partenaire technique de référence',
        isActive: true
      }
    ]

    for (const maitre of maitresOeuvre) {
      await db.insert(schema.maitresOeuvre)
        .values(maitre)
        .onConflictDoNothing()
    }

    // Contacts des maîtres d'œuvre
    console.log('👥 Création des contacts maîtres d\'œuvre...')
    const contactsMaitreOeuvre = [
      {
        id: 'contact-001',
        maitreOeuvreId: 'maitre-oeuvre-001',
        nom: 'Lefebvre',
        prenom: 'Antoine',
        poste: 'architecte',
        telephone: '02.31.86.45.21',
        mobile: '06.15.25.35.45',
        email: 'a.lefebvre@architecte-normand.fr',
        isContactPrincipal: true,
        isActive: true
      },
      {
        id: 'contact-002',
        maitreOeuvreId: 'maitre-oeuvre-001',
        nom: 'Moreau',
        prenom: 'Claire',
        poste: 'ingenieur',
        telephone: '02.31.86.45.22',
        email: 'c.moreau@architecte-normand.fr',
        isContactPrincipal: false,
        isActive: true
      },
      {
        id: 'contact-003',
        maitreOeuvreId: 'maitre-oeuvre-002',
        nom: 'Leclerc',
        prenom: 'Philippe',
        poste: 'directeur',
        telephone: '02.31.51.40.50',
        mobile: '06.12.34.56.78',
        email: 'p.leclerc@promoteur-calvados.fr',
        isContactPrincipal: true,
        isActive: true
      },
      {
        id: 'contact-004',
        maitreOeuvreId: 'maitre-oeuvre-003',
        nom: 'Bernard',
        prenom: 'Thomas',
        poste: 'ingenieur',
        telephone: '02.31.75.88.91',
        mobile: '06.87.65.43.21',
        email: 't.bernard@be-normandie.fr',
        isContactPrincipal: true,
        isActive: true
      }
    ]

    for (const contact of contactsMaitreOeuvre) {
      await db.insert(schema.contactsMaitreOeuvre)
        .values(contact)
        .onConflictDoNothing()
    }

    // 6. Jalons de validation pour les offres
    console.log('✅ Création des jalons de validation...')
    const milestones = [
      {
        id: 'milestone-001',
        offerId: 'offer-001',
        milestoneType: 'fin_etudes',
        isCompleted: false,
        completedBy: null,
        completedAt: null,
        comment: null,
        blockers: null
      },
      {
        id: 'milestone-002',
        offerId: 'offer-001',
        milestoneType: 'validation_technique',
        isCompleted: false,
        completedBy: null,
        completedAt: null,
        comment: null,
        blockers: null
      },
      {
        id: 'milestone-003',
        offerId: 'offer-002',
        milestoneType: 'fin_etudes',
        isCompleted: true,
        completedBy: 'test-user-1',
        completedAt: new Date('2024-01-25'),
        comment: 'Études complètes validées',
        blockers: null
      },
      {
        id: 'milestone-004',
        offerId: 'offer-002',
        milestoneType: 'validation_technique',
        isCompleted: true,
        completedBy: 'test-user-2',
        completedAt: new Date('2024-01-27'),
        comment: 'Spécifications techniques validées',
        blockers: null
      }
    ]

    for (const milestone of milestones) {
      await db.insert(schema.validationMilestones)
        .values(milestone)
        .onConflictDoNothing()
    }

    // 7. Projets complets en phase projet (3 exemples avec tous les champs)
    console.log('🏗️ Création des projets complets...')
    const projects = [
      {
        // ========================================
        // PROJET 1 : Phase "etude" - Rénovation Mairie Caen
        // ========================================
        id: 'project-001',
        offerId: 'offer-001', // Lié à l'offre Mairie de Caen
        
        // Informations de base
        name: 'Rénovation fenêtres Mairie de Caen - Phase 1',
        client: 'Mairie de Caen',
        location: 'Caen (14)',
        status: 'etude', // Phase études
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-08-15'),
        budget: '85000.00',
        responsibleUserId: 'test-user-1', // Sylvie Martin
        chefTravaux: 'test-user-3', // Marie Bernard
        progressPercentage: 25,
        
        // Informations techniques héritées
        reference: 'PRJ-2024-001',
        intituleOperation: 'Rénovation énergétique des menuiseries extérieures - Bâtiment principal Hôtel de Ville',
        description: 'Remplacement de 45 fenêtres en double vitrage avec châssis aluminium à rupture de pont thermique. Amélioration performances énergétiques conformément RT 2012. Conservation aspect architectural patrimoine historique.',
        menuiserieType: 'fenetre',
        typeMarche: 'public',
        departement: '14',
        
        // Montants et financier
        montantEstime: '85000.00',
        montantFinal: '83750.00', // Prix négocié
        prorataEventuel: '2.50', // 2.5% de révision
        
        // Relations contacts
        maitreOuvrageId: 'maitre-ouvrage-001', // Mairie de Caen
        maitreOeuvreId: 'maitre-oeuvre-001', // Cabinet Architecte Normand
        
        // Contacts spécifiques au projet
        contactProjetNom: 'Martine Durand',
        contactProjetPoste: 'Directrice Services Techniques',
        contactProjetTelephone: '02.31.30.41.15',
        contactProjetEmail: 'martine.durand@ville-caen.fr',
        
        // Dates critiques
        dateOS: new Date('2024-02-15'), // Date Ordre de Service
        delaiContractuel: 150, // 150 jours ouvrés
        dateLimiteRemise: new Date('2024-01-31'),
        dateLivraisonPrevue: new Date('2024-08-15'),
        demarragePrevu: new Date('2024-03-01'),
        dateLivraisonReelle: null, // Pas encore livré
        
        // Éléments administratifs
        bureauEtudes: 'Cabinet Architecte Normand',
        bureauControle: 'Apave Normandie',
        sps: 'SPS Coordination Caen',
        
        // Source et workflow hérités
        source: 'mail',
        plateformeSource: 'France Marchés',
        batigestRef: 'BGT-2024-001',
        
        // Validation et jalons
        finEtudesValidatedAt: new Date('2024-02-20'),
        finEtudesValidatedBy: 'test-user-1',
        
        // Gestion chantier (pas encore commencé)
        dateDebutChantier: null,
        dateFinChantier: null,
        coordinateurSPS: 'SPS Coordination Caen',
        acompteVerse: '0.00',
        restantDu: '83750.00',
        retenuGarantie: '4187.50' // 5% de garantie
      },
      {
        // ========================================
        // PROJET 2 : Phase "planification" - SCI Les Jardins
        // ========================================
        id: 'project-002',
        offerId: 'offer-002', // Lié à l'offre SCI Les Jardins
        
        // Informations de base
        name: 'Portes d\'entrée résidence Les Jardins',
        client: 'SCI Les Jardins de Bayeux',
        location: 'Bayeux (14)',
        status: 'planification', // Phase planification
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-06-30'),
        budget: '45000.00',
        responsibleUserId: 'test-user-2', // Jean Dupont
        chefTravaux: 'test-user-3', // Marie Bernard
        progressPercentage: 65,
        
        // Informations techniques héritées
        reference: 'PRJ-2024-002',
        intituleOperation: 'Fourniture et pose de 24 portes d\'entrée résidentielles',
        description: '24 portes d\'entrée en aluminium laqué, avec serrure 3 points, vitrage sécurisé, isolation thermique renforcée. Résidence neuve haut de gamme, 3 bâtiments.',
        menuiserieType: 'porte',
        typeMarche: 'prive',
        departement: '14',
        
        // Montants et financier
        montantEstime: '45000.00',
        montantFinal: '43500.00',
        prorataEventuel: '1.20',
        
        // Relations contacts
        maitreOuvrageId: 'maitre-ouvrage-002', // SCI Les Jardins
        maitreOeuvreId: 'maitre-oeuvre-002', // Promoteur Calvados
        
        // Contacts spécifiques au projet
        contactProjetNom: 'Philippe Leclerc',
        contactProjetPoste: 'Gérant',
        contactProjetTelephone: '06.12.34.56.78',
        contactProjetEmail: 'p.leclerc@sci-jardins-bayeux.fr',
        
        // Dates critiques
        dateOS: new Date('2024-02-01'),
        delaiContractuel: 120,
        dateLimiteRemise: new Date('2024-01-20'),
        dateLivraisonPrevue: new Date('2024-06-30'),
        demarragePrevu: new Date('2024-04-01'),
        dateLivraisonReelle: null,
        
        // Éléments administratifs
        bureauEtudes: 'Promoteur Calvados SARL',
        bureauControle: 'Socotec Normandie',
        sps: 'Leclerc Sécurité',
        
        // Source et workflow hérités
        source: 'phone',
        plateformeSource: null,
        batigestRef: 'BGT-2024-002',
        
        // Validation et jalons
        finEtudesValidatedAt: new Date('2024-02-10'),
        finEtudesValidatedBy: 'test-user-2',
        
        // Gestion chantier (planifié)
        dateDebutChantier: new Date('2024-04-01'),
        dateFinChantier: null,
        coordinateurSPS: 'Leclerc Sécurité',
        acompteVerse: '13050.00', // 30% d'acompte
        restantDu: '30450.00',
        retenuGarantie: '2175.00' // 5% de garantie
      },
      {
        // ========================================
        // PROJET 3 : Phase "chantier" - OPAC Calvados
        // ========================================
        id: 'project-003',
        offerId: null, // Projet démarré directement (pas d'offre associée)
        
        // Informations de base
        name: 'Réhabilitation Résidence Les Tilleuls',
        client: 'OPAC du Calvados',
        location: 'Hérouville-Saint-Clair (14)',
        status: 'chantier', // Phase chantier
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        budget: '125000.00',
        responsibleUserId: 'test-user-3', // Marie Bernard
        chefTravaux: 'test-user-2', // Jean Dupont
        progressPercentage: 75,
        
        // Informations techniques héritées
        reference: 'PRJ-2024-003',
        intituleOperation: 'Réhabilitation complète menuiseries extérieures - 3 bâtiments HLM',
        description: 'Remplacement de 86 fenêtres et 24 portes-fenêtres. Logements sociaux années 80. Amélioration isolation thermique et phonique. Conformité réglementation handicap.',
        menuiserieType: 'fenetre',
        typeMarche: 'public',
        departement: '14',
        
        // Montants et financier
        montantEstime: '130000.00',
        montantFinal: '125000.00',
        prorataEventuel: '0.00', // Prix ferme
        
        // Relations contacts
        maitreOuvrageId: 'maitre-ouvrage-003', // OPAC Calvados
        maitreOeuvreId: 'maitre-oeuvre-003', // BE Technique Normandie
        
        // Contacts spécifiques au projet
        contactProjetNom: 'Sophie Martin',
        contactProjetPoste: 'Responsable Technique',
        contactProjetTelephone: '02.31.95.95.12',
        contactProjetEmail: 'sophie.martin@opac14.fr',
        
        // Dates critiques
        dateOS: new Date('2023-12-15'),
        delaiContractuel: 180,
        dateLimiteRemise: new Date('2023-11-30'),
        dateLivraisonPrevue: new Date('2024-07-15'),
        demarragePrevu: new Date('2024-01-08'),
        dateLivraisonReelle: null, // En cours
        
        // Éléments administratifs
        bureauEtudes: 'BE Technique Normandie',
        bureauControle: 'Bureau Veritas',
        sps: 'SPS Pro Caen',
        
        // Source et workflow hérités
        source: 'website',
        plateformeSource: 'BOMP (Bulletin Officiel des Marchés Publics)',
        batigestRef: 'BGT-2024-003',
        
        // Validation et jalons
        finEtudesValidatedAt: new Date('2023-12-20'),
        finEtudesValidatedBy: 'test-user-3',
        
        // Gestion chantier (en cours)
        dateDebutChantier: new Date('2024-01-08'), // Chantier démarré
        dateFinChantier: null, // Pas encore terminé
        coordinateurSPS: 'SPS Pro Caen - Michel Duval',
        acompteVerse: '87500.00', // 70% versé (3 acomptes)
        restantDu: '37500.00', // 30% restant
        retenuGarantie: '6250.00' // 5% de garantie
      }
    ]

    for (const project of projects) {
      await db.insert(schema.projects)
        .values(project)
        .onConflictDoNothing()
    }

    // 8. Tâches de projet pour illustration du planning
    console.log('📋 Création des tâches de projet...')
    const projectTasks = [
      // ========================================
      // TÂCHES PROJET 1 : Phase "etude" - Mairie Caen
      // ========================================
      {
        id: 'task-001',
        projectId: 'project-001',
        name: 'Relevé et diagnostic existant',
        description: 'Relevé dimensionnel des 45 fenêtres existantes, état des huisseries, contraintes patrimoine',
        status: 'termine',
        assignedUserId: 'test-user-2', // Jean Dupont
        startDate: new Date('2024-02-20'),
        endDate: new Date('2024-02-28'),
        estimatedHours: '16.00',
        actualHours: '14.50',
        isJalon: true,
        position: 1,
        parentTaskId: null
      },
      {
        id: 'task-002',
        projectId: 'project-001',
        name: 'Études techniques et thermiques',
        description: 'Calculs thermiques, choix des profilés et vitrages, conformité RT 2012',
        status: 'en_cours',
        assignedUserId: 'test-user-1', // Sylvie Martin
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-15'),
        estimatedHours: '24.00',
        actualHours: '18.00',
        isJalon: false,
        position: 2,
        parentTaskId: null
      },
      {
        id: 'task-003',
        projectId: 'project-001',
        name: 'Consultation fournisseurs',
        description: 'Demandes de prix K-Line et autres fournisseurs, comparatif technique et prix',
        status: 'a_faire',
        assignedUserId: 'test-user-1',
        startDate: new Date('2024-03-16'),
        endDate: new Date('2024-03-25'),
        estimatedHours: '12.00',
        actualHours: null,
        isJalon: false,
        position: 3,
        parentTaskId: null
      },
      {
        id: 'task-004',
        projectId: 'project-001',
        name: 'Finalisation chiffrage et DPGF',
        description: 'Établissement DPGF final, vérification prix, marge, validation commerciale',
        status: 'a_faire',
        assignedUserId: 'test-user-1',
        startDate: new Date('2024-03-26'),
        endDate: new Date('2024-04-05'),
        estimatedHours: '20.00',
        actualHours: null,
        isJalon: true,
        position: 4,
        parentTaskId: null
      },
      
      // ========================================
      // TÂCHES PROJET 2 : Phase "planification" - SCI Jardins
      // ========================================
      {
        id: 'task-005',
        projectId: 'project-002',
        name: 'Études terminées - Validation client',
        description: 'Plans d\'exécution des 24 portes validés par le client et architecte',
        status: 'termine',
        assignedUserId: 'test-user-2', // Jean Dupont
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-02-25'),
        estimatedHours: '10.00',
        actualHours: '9.50',
        isJalon: true,
        position: 1,
        parentTaskId: null
      },
      {
        id: 'task-006',
        projectId: 'project-002',
        name: 'Commandes fournisseurs',
        description: 'Passation commandes profilés, quincaillerie, vitrage chez fournisseurs sélectionnés',
        status: 'termine',
        assignedUserId: 'test-user-3', // Marie Bernard
        startDate: new Date('2024-02-26'),
        endDate: new Date('2024-03-05'),
        estimatedHours: '8.00',
        actualHours: '7.00',
        isJalon: false,
        position: 2,
        parentTaskId: null
      },
      {
        id: 'task-007',
        projectId: 'project-002',
        name: 'Préparation planning chantier',
        description: 'Organisation équipes pose, planning livraisons, coordination avec autres corps d\'état',
        status: 'en_cours',
        assignedUserId: 'test-user-3',
        startDate: new Date('2024-03-10'),
        endDate: new Date('2024-03-25'),
        estimatedHours: '16.00',
        actualHours: '12.00',
        isJalon: false,
        position: 3,
        parentTaskId: null
      },
      {
        id: 'task-008',
        projectId: 'project-002',
        name: 'Réception matériaux - Contrôle qualité',
        description: 'Réception et contrôle des 24 portes en atelier, vérifications dimensions et finitions',
        status: 'a_faire',
        assignedUserId: 'test-user-2',
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-28'),
        estimatedHours: '12.00',
        actualHours: null,
        isJalon: true,
        position: 4,
        parentTaskId: null
      },
      {
        id: 'task-009',
        projectId: 'project-002',
        name: 'Démarrage chantier',
        description: 'Mise en place chantier, installation équipes, première livraison sur site',
        status: 'a_faire',
        assignedUserId: 'test-user-3',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-05'),
        estimatedHours: '20.00',
        actualHours: null,
        isJalon: true,
        position: 5,
        parentTaskId: null
      },
      
      // ========================================
      // TÂCHES PROJET 3 : Phase "chantier" - OPAC Calvados
      // ========================================
      {
        id: 'task-010',
        projectId: 'project-003',
        name: 'Dépose menuiseries existantes - Bât A',
        description: 'Dépose complète 30 fenêtres Bâtiment A, évacuation, protection logements occupés',
        status: 'termine',
        assignedUserId: 'test-user-2', // Jean Dupont
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-19'),
        estimatedHours: '60.00',
        actualHours: '58.50',
        isJalon: true,
        position: 1,
        parentTaskId: null
      },
      {
        id: 'task-011',
        projectId: 'project-003',
        name: 'Pose menuiseries neuves - Bât A',
        description: 'Pose des 30 nouvelles fenêtres Bâtiment A, étanchéité, finitions',
        status: 'termine',
        assignedUserId: 'test-user-3', // Marie Bernard
        startDate: new Date('2024-01-22'),
        endDate: new Date('2024-02-16'),
        estimatedHours: '80.00',
        actualHours: '76.00',
        isJalon: true,
        position: 2,
        parentTaskId: null
      },
      {
        id: 'task-012',
        projectId: 'project-003',
        name: 'Dépose menuiseries existantes - Bât B',
        description: 'Dépose complète 28 fenêtres Bâtiment B, coordination avec locataires',
        status: 'termine',
        assignedUserId: 'test-user-2',
        startDate: new Date('2024-02-19'),
        endDate: new Date('2024-03-01'),
        estimatedHours: '56.00',
        actualHours: '54.00',
        isJalon: false,
        position: 3,
        parentTaskId: null
      },
      {
        id: 'task-013',
        projectId: 'project-003',
        name: 'Pose menuiseries neuves - Bât B',
        description: 'Pose des 28 nouvelles fenêtres Bâtiment B, isolation renforcée',
        status: 'en_cours',
        assignedUserId: 'test-user-3',
        startDate: new Date('2024-03-04'),
        endDate: new Date('2024-03-29'),
        estimatedHours: '75.00',
        actualHours: '45.00',
        isJalon: true,
        position: 4,
        parentTaskId: null
      },
      {
        id: 'task-014',
        projectId: 'project-003',
        name: 'Dépose/Pose Bât C + Portes-fenêtres',
        description: 'Traitement Bâtiment C (28 fenêtres) + ensemble des 24 portes-fenêtres',
        status: 'a_faire',
        assignedUserId: 'test-user-2',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-05-31'),
        estimatedHours: '120.00',
        actualHours: null,
        isJalon: true,
        position: 5,
        parentTaskId: null
      },
      {
        id: 'task-015',
        projectId: 'project-003',
        name: 'Finitions et nettoyage final',
        description: 'Retouches peinture, nettoyage complet, réception avec OPAC',
        status: 'a_faire',
        assignedUserId: 'test-user-3',
        startDate: new Date('2024-06-03'),
        endDate: new Date('2024-06-21'),
        estimatedHours: '40.00',
        actualHours: null,
        isJalon: true,
        position: 6,
        parentTaskId: null
      }
    ]

    for (const task of projectTasks) {
      await db.insert(schema.projectTasks)
        .values(task)
        .onConflictDoNothing()
    }

    // 9. Ressources équipe assignées aux projets
    console.log('👷 Création des ressources équipe...')
    const teamResources = [
      // ========================================
      // RESSOURCES PROJET 1 : Phase "etude" - Mairie Caen
      // ========================================
      {
        id: 'resource-001',
        projectId: 'project-001',
        userId: 'test-user-1', // Sylvie Martin - Responsable BE
        externalName: null,
        role: 'responsable_be',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-08-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-002',
        projectId: 'project-001',
        userId: 'test-user-2', // Jean Dupont - Technicien BE
        externalName: null,
        role: 'technicien_be',
        startDate: new Date('2024-02-20'),
        endDate: new Date('2024-04-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-003',
        projectId: 'project-001',
        userId: null, // Sous-traitant externe
        externalName: 'Bureau Études Thermiques Normandie',
        role: 'sous_traitant_etudes',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-20'),
        chargeStatus: 'disponible',
        isActive: true
      },
      
      // ========================================
      // RESSOURCES PROJET 2 : Phase "planification" - SCI Jardins
      // ========================================
      {
        id: 'resource-004',
        projectId: 'project-002',
        userId: 'test-user-2', // Jean Dupont - Chef de projet
        externalName: null,
        role: 'chef_projet',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-06-30'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-005',
        projectId: 'project-002',
        userId: 'test-user-3', // Marie Bernard - Chef travaux
        externalName: null,
        role: 'chef_travaux',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-30'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-006',
        projectId: 'project-002',
        userId: null, // Équipe pose externe prévue
        externalName: 'Équipe Pose Spécialisée Bayeux',
        role: 'equipe_pose',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-06-15'),
        chargeStatus: 'disponible', // Pas encore mobilisée
        isActive: true
      },
      {
        id: 'resource-007',
        projectId: 'project-002',
        userId: null, // Transport et logistique
        externalName: 'Transport Leclerc SARL',
        role: 'logistique',
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-06-30'),
        chargeStatus: 'disponible',
        isActive: true
      },
      
      // ========================================
      // RESSOURCES PROJET 3 : Phase "chantier" - OPAC Calvados
      // ========================================
      {
        id: 'resource-008',
        projectId: 'project-003',
        userId: 'test-user-3', // Marie Bernard - Chef de projet/travaux
        externalName: null,
        role: 'chef_projet',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-009',
        projectId: 'project-003',
        userId: 'test-user-2', // Jean Dupont - Support technique
        externalName: null,
        role: 'technicien_chantier',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-05-31'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-010',
        projectId: 'project-003',
        userId: null, // Équipe pose principale
        externalName: 'Équipe JLM Pose #1 - Patrick Morel',
        role: 'chef_equipe',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'occupe', // En cours de mission
        isActive: true
      },
      {
        id: 'resource-011',
        projectId: 'project-003',
        userId: null, // Poseur spécialisé
        externalName: 'Équipe JLM Pose #1 - Alain Dubois',
        role: 'poseur',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-012',
        projectId: 'project-003',
        userId: null, // Poseur aide
        externalName: 'Équipe JLM Pose #1 - Julien Martin',
        role: 'aide_poseur',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-013',
        projectId: 'project-003',
        userId: null, // Équipe dépose spécialisée
        externalName: 'Dépose Pro - Vincent Leroy',
        role: 'sous_traitant_depose',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-04-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-014',
        projectId: 'project-003',
        userId: null, // Coordination SPS
        externalName: 'SPS Pro Caen - Michel Duval',
        role: 'coordinateur_sps',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'occupe',
        isActive: true
      },
      {
        id: 'resource-015',
        projectId: 'project-003',
        userId: null, // Nettoyage et finitions
        externalName: 'Nettoyage Bâtiment 14',
        role: 'nettoyage_finitions',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-07-15'),
        chargeStatus: 'disponible', // Intervention finale
        isActive: true
      }
    ]

    for (const resource of teamResources) {
      await db.insert(schema.teamResources)
        .values(resource)
        .onConflictDoNothing()
    }

    console.log('✨ Données d\'exemple créées avec succès!')
    console.log('')
    console.log('📊 Résumé des données créées:')
    console.log(`- ${users.length} utilisateurs`)
    console.log(`- ${aos.length} AOs`)
    console.log(`- ${offers.length} offres`)
    console.log(`- ${maitresOuvrage.length} maîtres d'ouvrage`)
    console.log(`- ${maitresOeuvre.length} maîtres d'œuvre`)
    console.log(`- ${contactsMaitreOeuvre.length} contacts maîtres d'œuvre`)
    console.log(`- ${projects.length} projets complets (phases: etude, planification, chantier)`)
    console.log(`- ${projectTasks.length} tâches de projet`)
    console.log(`- ${teamResources.length} ressources équipe`)
    console.log(`- ${workloads.length} charges de travail BE`)
    console.log(`- ${milestones.length} jalons de validation`)
    console.log('')
    console.log('🏗️ Projets créés avec tous les champs complétés:')
    console.log('  1. Rénovation fenêtres Mairie Caen (phase: etude) - 85 000€')
    console.log('  2. Portes d\'entrée résidence Les Jardins (phase: planification) - 45 000€')
    console.log('  3. Réhabilitation Résidence Les Tilleuls (phase: chantier) - 125 000€')
    console.log('')
    console.log('📋 Chaque projet comprend:')
    console.log('  ✓ Informations complètes (contacts, dates, montants, éléments administratifs)')
    console.log('  ✓ Tâches de projet détaillées avec assignations et statuts')
    console.log('  ✓ Ressources équipe (internes et sous-traitants)')
    console.log('  ✓ Liens avec maîtres d\'ouvrage et d\'œuvre')
    console.log('')
    console.log('🚀 Le POC Saxium est prêt à être testé avec la gestion complète des projets!')

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Exécuter le script
seedData()