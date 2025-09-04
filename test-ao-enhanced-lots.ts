import pkg from 'pg';
const { Pool } = pkg;
import { randomUUID } from 'crypto';

// Configuration de la base de données
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function createEnhancedTestAO() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Supprimer les données existantes si elles existent
    const existingAO = await client.query('SELECT id FROM aos WHERE reference = $1', ['AO-2503-2161-ENHANCED']);
    if (existingAO.rows.length > 0) {
      const aoId = existingAO.rows[0].id;
      console.log('Deleting existing AO and lots...');
      await client.query('DELETE FROM lots WHERE ao_id = $1', [aoId]);
      await client.query('DELETE FROM aos WHERE id = $1', [aoId]);
    }
    
    // Créer un nouvel AO avec les informations de base
    const aoId = randomUUID();
    await client.query(`
      INSERT INTO aos (
        id, reference, client, location, departement, intitule_operation, 
        date_limite_remise, menuiserie_type, montant_estime, type_marche,
        source, maitre_ouvrage_id, maitre_oeuvre_id, is_selected
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      aoId,
      'AO-2503-2161-ENHANCED',
      'SCICV Boulogne Sandettie', 
      '62200 Boulogne-sur-Mer',
      '62',
      'Construction de 98 logements collectifs, rue de Wissant, NF HABITAT HQE RE2020',
      '2025-03-14',
      'fenetre',
      280000, // Total estimé des 2 lots
      'public',
      'other',
      null,
      null,
      false
    ]);

    // Créer le lot 07.1: Menuiseries extérieures avec informations techniques détaillées
    const lot1Id = randomUUID();
    const lot1Comment = `INFORMATIONS TECHNIQUES DÉTAILLÉES:

Quantité: 101 éléments (45 fenêtres Façade Sud + 32 fenêtres Façade Nord + 18 portes-fenêtres + 6 baies coulissantes)
Matériau: Aluminium/PVC
Vitrage: Double et triple vitrage
Localisation: Façades Sud/Nord, Séjours
Couleur: Gris anthracite RAL 7016
Dimensions: Standard 135x120 cm (fenêtres), 240x215 cm (baies)

PERFORMANCES:
- Thermique: Uw ≤ 1,4 W/m².K
- Acoustique: Rw ≥ 35 dB
- Normes: DTU 36.5, RE2020, NF Fenêtre, Acotherm

ACCESSOIRES:
Volets roulants électriques, grilles de ventilation

SPÉCIFICITÉS:
Certification NF Fenêtre et Acotherm, Seuil PMR pour portes-fenêtres

DÉLAI: 8 semaines
UNITÉ: À l'unité`;
    
    await client.query(`
      INSERT INTO lots (
        id, ao_id, numero, designation, montant_estime, is_selected, comment
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      lot1Id,
      aoId,
      '07.1',
      'Menuiseries extérieures',
      185000,
      true,
      lot1Comment
    ]);

    // Créer le lot 08: Menuiserie intérieure avec informations techniques détaillées
    const lot2Id = randomUUID();
    const lot2Comment = `INFORMATIONS TECHNIQUES DÉTAILLÉES:

Quantité: 330 éléments (196 portes intérieures + 98 blocs-portes d'entrée + 24 portes techniques + 12 placards)
Matériau: Stratifié chêne clair
Localisation: Logements et locaux communs
Couleur: Chêne clair
Épaisseur: 40mm (portes logements), 50mm (portes techniques)

PERFORMANCES:
- Acoustique: DnT,w ≥ 40 dB
- Normes: NF Intérieure, PEFC, A2P*

ACCESSOIRES:
Poignées, gonds, joints d'étanchéité

SÉCURITÉ:
Serrurerie 3 points A2P* pour entrées logements

SPÉCIFICITÉS:
Certification NF Intérieure et PEFC, 12 placards sur mesure

DÉLAI: 6 semaines
UNITÉ: À l'unité`;
    
    await client.query(`
      INSERT INTO lots (
        id, ao_id, numero, designation, montant_estime, is_selected, comment
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      lot2Id,
      aoId,
      '08',
      'Menuiserie intérieure',
      95000,
      true,
      lot2Comment
    ]);

    await client.query('COMMIT');
    
    console.log('✅ AO amélioré créé avec succès !');
    console.log(`AO ID: ${aoId}`);
    console.log(`Référence: AO-2503-2161-ENHANCED`);
    console.log(`Lot 07.1 ID: ${lot1Id} (Menuiseries extérieures - 185 000€)`);
    console.log(`Lot 08 ID: ${lot2Id} (Menuiserie intérieure - 95 000€)`);
    console.log(`Total estimé: 280 000€`);
    console.log('\nAccédez à l\'AO via: /offers/' + aoId + '/edit');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la création de l\'AO:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Exécuter le script
createEnhancedTestAO()
  .then(() => {
    console.log('Script terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });