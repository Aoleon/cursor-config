import { storage } from '../server/storage-poc';
import { calculerDatesImportantes } from '../server/dateUtils';

/**
 * Script de configuration pour créer l'AO 2503 avec toutes ses données
 * 
 * Exécution: npx tsx scripts/setup-ao-2503.ts
 */

const AO_2503_DATA = {
  reference: 'AO-2503-2161',
  client: 'JLM Menuiserie',
  location: '62200 Boulogne-sur-Mer, rue de Wissant',
  departement: '62' as const,
  
  // Informations détaillées
  intituleOperation: 'Construction de 98 logements collectifs, rue de Wissant, NF HABITAT HQE RE2020 Seuils 2025 Cep-10% Cep,nr-10%',
  description: 'Construction de 98 logements collectifs avec menuiseries extérieures et intérieures haute performance énergétique',
  
  // Dates
  dateLimiteRemise: new Date('2025-03-14T18:00:00.000Z'),
  dateSortieAO: new Date('2025-01-21T09:00:00.000Z'),
  demarragePrevu: new Date('2025-06-01T08:00:00.000Z'),
  dateLivraisonPrevue: new Date('2026-12-31T17:00:00.000Z'),
  
  // Informations techniques
  menuiserieType: 'fenetre' as const,
  montantEstime: '280000.00',
  typeMarche: 'public' as const,
  delaiContractuel: 540,
  
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
  source: 'website' as const,
  
  // Sélection
  isSelected: true,
  selectionComment: 'AO sélectionné pour test complet - Lots menuiseries expertise JLM'
};

const LOTS_DATA = [
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
    technicalDetails: `Menuiseries extérieures haute performance pour 98 logements:
- 45 fenêtres aluminium double vitrage - Façade Sud
- 32 fenêtres PVC double vitrage - Façade Nord  
- 18 portes-fenêtres aluminium double vitrage avec seuil PMR
- 6 baies coulissantes aluminium triple vitrage - Séjours
- Performance thermique: Uw ≤ 1,4 W/m².K
- Performance acoustique: Rw ≥ 35 dB
- Certifications: NF Fenêtre, Acotherm`
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
    technicalDetails: `Menuiserie intérieure complète pour 98 logements:
- 196 portes intérieures stratifiées finition chêne clair
- 98 blocs-portes d'entrée logements sécurisées
- 24 portes techniques locaux communs
- 12 placards intégrés sur mesure
- Performance acoustique: DnT,w ≥ 40 dB
- Certifications: NF Intérieure, PEFC`
  }
];

async function setupAO2503() {
  try {
    console.log('🚀 Configuration AO 2503 - Début');

    // 1. Calculer les dates importantes
    const datesCalculees = calculerDatesImportantes(
      AO_2503_DATA.dateLimiteRemise,
      AO_2503_DATA.demarragePrevu,
      AO_2503_DATA.dateLivraisonPrevue
    );

    console.log('📅 Dates calculées:');
    console.log(`   - Date limite: ${datesCalculees.dateLimiteRemise?.toLocaleDateString('fr-FR')}`);
    console.log(`   - Date rendu (J-15): ${datesCalculees.dateRemiseCalculee?.toLocaleDateString('fr-FR')}`);
    console.log(`   - Démarrage: ${datesCalculees.demarragePrevu?.toLocaleDateString('fr-FR')}`);
    console.log(`   - Livraison: ${datesCalculees.dateLivraisonPrevue?.toLocaleDateString('fr-FR')}`);

    // 2. Vérifier si l'AO existe déjà
    const existingAos = await storage.getAos();
    const existingAo = existingAos.find(ao => ao.reference === AO_2503_DATA.reference);

    if (existingAo) {
      console.log('⚠️  AO 2503 existe déjà avec ID:', existingAo.id);
      return existingAo.id;
    }

    // 3. Créer l'AO avec les dates calculées
    const aoData = {
      ...AO_2503_DATA,
      dateRenduAO: datesCalculees.dateRemiseCalculee
    };

    const createdAo = await storage.createAo(aoData);
    console.log('✅ AO 2503 créé avec succès - ID:', createdAo.id);

    // 4. Ajouter les lots
    console.log('📦 Ajout des lots...');
    let totalMontant = 0;

    for (const lotData of LOTS_DATA) {
      const lot = await storage.createAoLot({
        ...lotData,
        aoId: createdAo.id
      });
      
      totalMontant += lot.montantEstime || 0;
      console.log(`   ✅ Lot ${lot.numero}: ${lot.designation} (${lot.montantEstime?.toLocaleString('fr-FR')}€)`);
    }

    console.log(`💰 Montant total des lots: ${totalMontant.toLocaleString('fr-FR')}€`);

    // 5. Vérification finale
    const lots = await storage.getAoLots(createdAo.id);
    console.log(`🎯 Configuration terminée - AO ${createdAo.reference} avec ${lots.length} lots`);

    return createdAo.id;

  } catch (error) {
    console.error('❌ Erreur lors de la configuration AO 2503:', error);
    throw error;
  }
}

// Exécution du script
setupAO2503()
  .then(aoId => {
    console.log('🏁 Configuration AO 2503 terminée avec succès');
    console.log(`🔗 ID de l'AO créé: ${aoId}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Échec de la configuration:', error);
    process.exit(1);
  });

export { setupAO2503 };