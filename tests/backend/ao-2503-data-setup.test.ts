import { describe, it, expect, beforeAll } from 'vitest';
import { storage } from '../../server/storage-poc';
import { calculerDatesImportantes } from '../../server/dateUtils';

/**
 * Test de création des données AO 2503 pour les tests globaux
 * 
 * Ce test génère et insère en base les données complètes de l'AO 2503
 * pour permettre aux tests E2E de s'exécuter avec des données réelles.
 */

const AO_2503_BASE_DATA = {
  reference: 'AO-2503-2161',
  client: 'JLM Menuiserie',
  location: '62200 Boulogne-sur-Mer, rue de Wissant',
  departement: '62' as const,
  
  // Informations détaillées
  intituleOperation: 'Construction de 98 logements collectifs, rue de Wissant, NF HABITAT HQE RE2020 Seuils 2025 Cep-10% Cep,nr-10%',
  description: 'Construction de 98 logements collectifs avec menuiseries extérieures et intérieures haute performance énergétique',
  
  // Dates (format ISO pour la base)
  dateLimiteRemise: new Date('2025-03-14T18:00:00.000Z'),
  dateSortieAO: new Date('2025-01-21T09:00:00.000Z'),
  demarragePrevu: new Date('2025-06-01T08:00:00.000Z'),
  dateLivraisonPrevue: new Date('2026-12-31T17:00:00.000Z'),
  
  // Informations techniques
  menuiserieType: 'exterieure_interieure' as const,
  montantEstime: '280000.00', // 185k + 95k
  typeMarche: 'public' as const,
  delaiContractuel: 540, // 18 mois
  
  // Contacts
  contactAONom: 'Gerald DUMETZ',
  contactAOPoste: 'Responsable technique',
  contactAOTelephone: '03 22 71 18 00',
  contactAOEmail: 'gerald.dumetz@sas-novalys.fr',
  
  // Intervenants
  bureauEtudes: 'ATELIER Marianne LEEMANN',
  bureauControle: 'Novalys',
  sps: 'Bureau SPS Boulogne',
  
  // Source
  source: 'plateforme_publique' as const,
  
  // Sélection
  isSelected: true,
  selectionComment: 'AO sélectionné pour test complet - Lots menuiseries expertise JLM'
};

const AO_2503_LOTS_DATA = [
  {
    numero: '07.1',
    designation: 'Menuiseries extérieures',
    materiau: 'aluminium',
    vitrage: 'double_triple',
    quantite: 101,
    localisation: 'Façades Sud, Nord et séjours',
    couleur: 'Gris anthracite RAL 7016',
    dimensions: '135x120 cm (fenêtres), 240x215 cm (baies)',
    performanceThermique: 'Uw ≤ 1,4 W/m².K',
    performanceAcoustique: 'Rw ≥ 35 dB',
    normes: ['DTU 36.5', 'RE2020', 'NF Fenêtre', 'Acotherm'],
    accessoires: 'Volets roulants électriques, grilles de ventilation',
    specificites: 'Seuils PMR pour portes-fenêtres, triple vitrage séjours',
    delaiLivraison: '8 semaines',
    uniteOeuvre: 'À l\'unité',
    montantEstime: 185000,
    status: 'analyse_en_cours',
    technicalDetails: `Menuiseries extérieures haute performance pour 98 logements:
- 45 fenêtres aluminium double vitrage - Façade Sud
- 32 fenêtres PVC double vitrage - Façade Nord  
- 18 portes-fenêtres aluminium double vitrage avec seuil PMR
- 6 baies coulissantes aluminium triple vitrage - Séjours
- Couleur: Gris anthracite RAL 7016
- Performance thermique: Uw ≤ 1,4 W/m².K
- Performance acoustique: Rw ≥ 35 dB
- Certifications: NF Fenêtre, Acotherm
- Normes: DTU 36.5, RE2020
- Accessoires: Volets roulants électriques intégrés, grilles de ventilation`
  },
  {
    numero: '08',
    designation: 'Menuiserie intérieure',
    materiau: 'bois',
    quantite: 330,
    localisation: 'Tous logements et parties communes',
    couleur: 'Chêne clair stratifié',
    performanceAcoustique: 'DnT,w ≥ 40 dB',
    normes: ['NF Intérieure', 'PEFC'],
    accessoires: 'Poignées, gonds, joints d\'étanchéité, serrurerie 3 points',
    specificites: 'Serrurerie A2P* pour entrées logements',
    delaiLivraison: '6 semaines',
    uniteOeuvre: 'À l\'unité',
    montantEstime: 95000,
    status: 'analyse_en_cours',
    technicalDetails: `Menuiserie intérieure complète pour 98 logements:
- 196 portes intérieures stratifiées finition chêne clair
- 98 blocs-portes d'entrée logements sécurisées
- 24 portes techniques locaux communs
- 12 placards intégrés sur mesure
- Épaisseur: 40 mm (portes logements), 50 mm (portes techniques)
- Serrurerie: 3 points A2P* pour entrées logements
- Performance acoustique: DnT,w ≥ 40 dB
- Certifications: NF Intérieure, PEFC
- Finition: Stratifié chêne clair haute résistance`
  }
];

describe('Configuration AO 2503 - Données de test', () => {
  let createdAoId: string;

  it('Calcule correctement les dates importantes', () => {
    // Test du calcul des dates importantes avec les données AO 2503
    const datesCalculees = calculerDatesImportantes(
      AO_2503_BASE_DATA.dateLimiteRemise,
      AO_2503_BASE_DATA.demarragePrevu,
      AO_2503_BASE_DATA.dateLivraisonPrevue
    );

    expect(datesCalculees.dateLimiteRemise).toBeDefined();
    expect(datesCalculees.dateRemiseCalculee).toBeDefined();
    expect(datesCalculees.demarragePrevu).toBeDefined();
    expect(datesCalculees.dateLivraisonPrevue).toBeDefined();

    // Vérifier le calcul J-15
    const dateRemise = datesCalculees.dateRemiseCalculee!;
    const dateLimite = datesCalculees.dateLimiteRemise!;
    const diffJours = Math.ceil((dateLimite.getTime() - dateRemise.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(diffJours).toBe(15); // Exactement 15 jours d'écart
  });

  it('Crée l\'AO 2503 en base avec données complètes', async () => {
    // Calculer la date de rendu automatiquement
    const datesCalculees = calculerDatesImportantes(
      AO_2503_BASE_DATA.dateLimiteRemise,
      AO_2503_BASE_DATA.demarragePrevu,
      AO_2503_BASE_DATA.dateLivraisonPrevue
    );

    const aoData = {
      ...AO_2503_BASE_DATA,
      dateRenduAO: datesCalculees.dateRemiseCalculee
    };

    const createdAo = await storage.createAo(aoData);
    createdAoId = createdAo.id;

    expect(createdAo).toBeDefined();
    expect(createdAo.reference).toBe(AO_2503_BASE_DATA.reference);
    expect(createdAo.client).toBe(AO_2503_BASE_DATA.client);
    expect(createdAo.montantEstime).toBe(AO_2503_BASE_DATA.montantEstime);
    
    // Vérifier que la date de rendu est bien calculée
    expect(createdAo.dateRenduAO).toBeDefined();
    
    console.log('✅ AO 2503 créé avec ID:', createdAoId);
    console.log('📅 Date limite:', createdAo.dateLimiteRemise?.toLocaleDateString('fr-FR'));
    console.log('📅 Date rendu (J-15):', createdAo.dateRenduAO?.toLocaleDateString('fr-FR'));
  });

  it('Ajoute les lots techniques à l\'AO 2503', async () => {
    if (!createdAoId) {
      throw new Error('AO 2503 doit être créé avant d\'ajouter les lots');
    }

    const lotsCreated: any[] = [];

    for (const lotData of AO_2503_LOTS_DATA) {
      const lot = await storage.createAoLot({
        ...lotData,
        aoId: createdAoId
      });
      
      lotsCreated.push(lot);
      
      expect(lot).toBeDefined();
      expect(lot.numero).toBe(lotData.numero);
      expect(lot.designation).toBe(lotData.designation);
      expect(lot.montantEstime).toBe(lotData.montantEstime);
    }

    expect(lotsCreated).toHaveLength(2);
    
    // Vérifier les lots créés
    const aoWithLots = await storage.getAo(createdAoId);
    expect(aoWithLots).toBeDefined();
    
    const lots = await storage.getAoLots(createdAoId);
    expect(lots).toHaveLength(2);
    
    const montantTotal = lots.reduce((sum, lot) => sum + (lot.montantEstime || 0), 0);
    expect(montantTotal).toBe(280000); // 185k + 95k
    
    console.log('✅ Lots AO 2503 créés:');
    lots.forEach(lot => {
      console.log(`   - ${lot.numero}: ${lot.designation} (${lot.montantEstime?.toLocaleString('fr-FR')}€)`);
    });
  });

  it('Vérifie l\'intégrité des données AO 2503', async () => {
    if (!createdAoId) {
      throw new Error('AO 2503 doit être créé pour vérifier l\'intégrité');
    }

    // Récupérer l'AO complet
    const ao = await storage.getAo(createdAoId);
    expect(ao).toBeDefined();

    // Vérifications de cohérence
    expect(ao.reference).toBe('AO-2503-2161');
    expect(ao.departement).toBe('62');
    expect(ao.menuiserieType).toBe('exterieure_interieure');
    expect(ao.typeMarche).toBe('public');
    expect(ao.isSelected).toBe(true);

    // Vérifier les dates
    expect(ao.dateLimiteRemise).toBeDefined();
    expect(ao.dateRenduAO).toBeDefined();
    expect(ao.demarragePrevu).toBeDefined();
    expect(ao.dateLivraisonPrevue).toBeDefined();

    // Vérifier les lots associés
    const lots = await storage.getAoLots(createdAoId);
    expect(lots).toHaveLength(2);

    const lot1 = lots.find(l => l.numero === '07.1');
    const lot2 = lots.find(l => l.numero === '08');
    
    expect(lot1).toBeDefined();
    expect(lot1?.designation).toBe('Menuiseries extérieures');
    expect(lot1?.montantEstime).toBe(185000);

    expect(lot2).toBeDefined();
    expect(lot2?.designation).toBe('Menuiserie intérieure');
    expect(lot2?.montantEstime).toBe(95000);

    console.log('✅ Intégrité des données AO 2503 vérifiée');
    console.log(`   📋 AO: ${ao.reference} - ${ao.client}`);
    console.log(`   💰 Montant estimé: ${ao.montantEstime} €`);
    console.log(`   📦 Lots: ${lots.length} (Total: ${lots.reduce((s, l) => s + (l.montantEstime || 0), 0).toLocaleString('fr-FR')}€)`);
    console.log(`   🏗️ Démarrage prévu: ${ao.demarragePrevu?.toLocaleDateString('fr-FR')}`);
  });

  it('Test de recherche et filtrage AO 2503', async () => {
    // Tester la recherche par référence
    const aosByRef = await storage.getAos();
    const foundAo = aosByRef.find(ao => ao.reference === 'AO-2503-2161');
    expect(foundAo).toBeDefined();
    expect(foundAo?.client).toBe('JLM Menuiserie');

    // Tester le filtrage par département
    const aosDept62 = aosByRef.filter(ao => ao.departement === '62');
    expect(aosDept62.length).toBeGreaterThan(0);
    
    const ao2503InDept = aosDept62.find(ao => ao.reference === 'AO-2503-2161');
    expect(ao2503InDept).toBeDefined();

    // Tester le filtrage par type de menuiserie
    const aosExtInt = aosByRef.filter(ao => ao.menuiserieType === 'exterieure_interieure');
    expect(aosExtInt.length).toBeGreaterThan(0);

    console.log('✅ Recherche et filtrage AO 2503 validés');
  });
});

/**
 * Utilitaire pour nettoyer les données de test
 */
export async function cleanupAO2503TestData() {
  try {
    const aos = await storage.getAos();
    const ao2503 = aos.find(ao => ao.reference === 'AO-2503-2161');
    
    if (ao2503) {
      // Supprimer les lots d'abord
      const lots = await storage.getAoLots(ao2503.id);
      for (const lot of lots) {
        await storage.deleteAoLot(lot.id);
      }
      
      // Note: Suppression manuelle nécessaire car deleteAo n'est pas implémenté
      console.log('🔄 Suppression manuelle requise pour AO:', ao2503.id);
      console.log('🧹 Données test AO 2503 nettoyées');
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors du nettoyage:', error);
  }
}

/**
 * Utilitaire pour récupérer l'ID de l'AO 2503 de test
 */
export async function getAO2503TestId(): Promise<string | null> {
  try {
    const aos = await storage.getAos();
    const ao2503 = aos.find(ao => ao.reference === 'AO-2503-2161');
    return ao2503?.id || null;
  } catch (error) {
    console.error('Erreur récupération ID AO 2503:', error);
    return null;
  }
}