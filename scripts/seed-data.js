/**
 * Script pour créer des données d'exemple pour le POC Saxium
 * Exécuter avec: node scripts/seed-data.js
 */

import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from '../shared/schema.js'

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
        menuiserieType: 'fenetres',
        estimatedAmount: '85000',
        maitreOeuvre: 'Cabinet Architecte Normand',
        source: 'appel_offres_public',
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
        menuiserieType: 'portes',
        estimatedAmount: '45000',
        maitreOeuvre: 'Promoteur Calvados',
        source: 'reseau_professionnel',
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
        menuiserieType: 'fenetres',
        estimatedAmount: '85000',
        status: 'en_chiffrage',
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
        menuiserieType: 'portes',
        estimatedAmount: '45000',
        status: 'en_validation',
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

    // 5. Jalons de validation pour les offres
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

    console.log('✨ Données d\'exemple créées avec succès!')
    console.log('')
    console.log('📊 Résumé des données créées:')
    console.log(`- ${users.length} utilisateurs`)
    console.log(`- ${aos.length} AOs`)
    console.log(`- ${offers.length} offres`)
    console.log(`- ${workloads.length} charges de travail BE`)
    console.log(`- ${milestones.length} jalons de validation`)
    console.log('')
    console.log('🚀 Le POC Saxium est prêt à être testé!')

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Exécuter le script
seedData()