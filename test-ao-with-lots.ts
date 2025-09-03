import { randomUUID } from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestAOWithLots() {
  const client = await pool.connect();
  
  try {
    // Insérer un AO de test avec des lots extraits par OCR simulé
    const aoId = randomUUID();
    
    await client.query(`
      INSERT INTO aos (
        id, reference, client, location, departement, intitule_operation,
        menuiserie_type, source, description, bureau_etudes, bureau_controle,
        sps, montant_estime, date_limite_remise, created_at, updated_at
      ) VALUES (
        $1, 'AO-2025-001-TEST', 'Ville de Boulogne-sur-Mer', 
        '1 Rue de la Mairie, 62200 Boulogne-sur-Mer', '62',
        'Réhabilitation Centre Culturel - Remplacement menuiseries',
        'fenetre', 'website',
        'Remplacement de l''ensemble des menuiseries du centre culturel municipal. Travaux incluant dépose, fourniture et pose de nouvelles menuiseries en aluminium.',
        'BET NORD ETUDES', 'APAVE Nord-Ouest', 'SOCOTEC', 
        450000, '2025-02-15 23:59:59', NOW(), NOW()
      )
    `, [aoId]);

    // Insérer des lots extraits par OCR simulé
    const lots = [
      {
        id: randomUUID(),
        numero: 'LOT 01',
        designation: 'Menuiseries extérieures - Façade principale',
        menuiserieType: 'fenetre',
        montantEstime: '125000',
        comment: 'Extrait OCR: 45 fenêtres aluminium double vitrage - Façade Sud'
      },
      {
        id: randomUUID(),
        numero: 'LOT 02',
        designation: 'Portes d\'entrée et issues de secours',
        menuiserieType: 'porte',
        montantEstime: '85000',
        comment: 'Extrait OCR: 8 portes coupe-feu + 3 portes d\'entrée vitrées'
      },
      {
        id: randomUUID(),
        numero: 'LOT 03',
        designation: 'Menuiseries intérieures - Cloisons vitrées',
        menuiserieType: 'cloison',
        montantEstime: '95000',
        comment: 'Extrait OCR: Cloisons vitrées hall d\'accueil et bureaux'
      },
      {
        id: randomUUID(),
        numero: 'LOT 04',
        designation: 'Verrière atrium central',
        menuiserieType: 'verriere',
        montantEstime: '145000',
        comment: 'Extrait OCR: Verrière 200m² structure aluminium + vitrage sécurité'
      }
    ];

    // Créer la table lots si elle n'existe pas
    await client.query(`
      CREATE TABLE IF NOT EXISTS lots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ao_id VARCHAR NOT NULL REFERENCES aos(id) ON DELETE CASCADE,
        numero VARCHAR NOT NULL,
        designation TEXT NOT NULL,
        menuiserie_type VARCHAR,
        montant_estime DECIMAL(10,2),
        is_selected BOOLEAN DEFAULT true,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insérer les lots
    for (const lot of lots) {
      await client.query(`
        INSERT INTO lots (
          id, ao_id, numero, designation, menuiserie_type, 
          montant_estime, is_selected, comment, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        lot.id, aoId, lot.numero, lot.designation, 
        lot.menuiserieType, parseFloat(lot.montantEstime), 
        true, lot.comment
      ]);
    }

    console.log('✅ AO de test créé avec succès:', aoId);
    console.log('✅ Lots insérés:', lots.length);
    console.log('📄 URL de test:', `/offers/${aoId}/edit`);
    
    return aoId;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    client.release();
  }
}

createTestAOWithLots()
  .then(() => {
    console.log('🎉 Données de test créées avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Échec:', error);
    process.exit(1);
  });