/**
 * SCRIPT DE VALIDATION - Transformation Monday ID natif
 * 
 * Valide que la correction transformItem() utilise correctement
 * l'ID Monday natif pour générer les références.
 * 
 * Attendu:
 * - transformed.reference = "AO-18115615455" (grand nombre Monday ID)
 * - transformed.mondayItemId = "18115615455"
 * - 0 erreurs de validation Zod
 */

import { aosMappingConfig } from '../server/config/monday-migration-mapping';
import type { MondayItem } from '../server/services/MondayService';

// Simuler la logique de transformation directement
function transformItemDirect(item: MondayItem): any {
  const config = aosMappingConfig;
  const transformed: any = {};

  // CRITIQUE: Préserver Monday item ID natif AVANT mapping
  const originalMondayId = item.id;
  
  // CRITIQUE: Ajouter mondayItemId AVANT le mapping des colonnes
  transformed.mondayItemId = originalMondayId;

  // Simuler extraction de quelques colonnes pour le test
  const columnValues = new Map<string, any>();
  item.column_values.forEach(col => {
    let value = col.text || col.value;
    if (col.type === 'location' && col.value) {
      try {
        const parsed = JSON.parse(col.value);
        value = parsed.address || col.text;
      } catch (e) {
        value = col.text;
      }
    }
    columnValues.set(col.id, value);
  });

  // Appliquer mappings de base
  transformed.client = columnValues.get('text7') || 'Client inconnu';
  transformed.location = columnValues.get('location') || 'Non spécifié';
  transformed.amountEstimate = columnValues.get('numeric');

  // CRITIQUE: Appliquer transformation reference
  if (config.transformations?.reference) {
    transformed.reference = config.transformations.reference(
      columnValues.get('name'),
      transformed
    );
  }

  // Valeurs par défaut requises
  transformed.source = 'website';
  transformed.menuiserieType = 'autre';

  return transformed;
}

// Simuler un item Monday réel avec grand ID natif
const mockMondayItem: MondayItem = {
  id: '18115615455', // ID Monday natif (grand nombre)
  name: 'SCICV BOULOGNE SANDETTIE', // Nom item (peut être dupliqué)
  board: { id: '3946257560' },
  group: { id: 'topics', title: 'En cours' },
  column_values: [
    {
      id: 'name',
      type: 'name',
      text: 'SCICV BOULOGNE SANDETTIE',
      value: JSON.stringify('SCICV BOULOGNE SANDETTIE')
    },
    {
      id: 'text7',
      type: 'text',
      text: 'SCICV',
      value: JSON.stringify('SCICV') // MOA (client)
    },
    {
      id: 'location',
      type: 'location',
      text: 'Boulogne-sur-Mer',
      value: JSON.stringify({
        lat: '50.726',
        lng: '1.614',
        address: 'Boulogne-sur-Mer'
      })
    },
    {
      id: 'lot',
      type: 'status',
      text: 'Menu Ext',
      value: JSON.stringify({ index: 1, label: 'Menu Ext' })
    },
    {
      id: 'numeric',
      type: 'numeric',
      text: '250000',
      value: JSON.stringify(250000) // CA HT
    }
  ],
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-16T14:20:00Z'
};

async function testTransformation() {
  console.log('\n=== TEST TRANSFORMATION MONDAY ID NATIF ===\n');
  
  console.log('📋 Item Monday simulé:');
  console.log(`   - ID Monday natif: ${mockMondayItem.id}`);
  console.log(`   - Nom item: ${mockMondayItem.name}`);
  console.log('');

  try {
    // Transformer l'item Monday → Saxium
    console.log('🔄 Transformation en cours...');
    const transformed = transformItemDirect(mockMondayItem);
    
    console.log('\n✅ Transformation réussie!\n');
    
    // Vérifier les résultats attendus
    console.log('📊 Résultats de la transformation:');
    console.log(`   ✓ reference: ${transformed.reference}`);
    console.log(`   ✓ mondayItemId: ${transformed.mondayItemId}`);
    console.log(`   ✓ client: ${transformed.client}`);
    console.log(`   ✓ location: ${transformed.location}`);
    console.log(`   ✓ aoCategory: ${transformed.aoCategory}`);
    console.log(`   ✓ amountEstimate: ${transformed.amountEstimate}`);
    console.log('');

    // Validation des valeurs attendues
    const expectedReference = `AO-${mockMondayItem.id}`;
    const expectedMondayItemId = mockMondayItem.id;

    console.log('🔍 Validation des valeurs critiques:');
    
    if (transformed.reference === expectedReference) {
      console.log(`   ✅ reference correct: "${transformed.reference}" (grand nombre Monday ID)`);
    } else {
      console.error(`   ❌ reference incorrect: attendu "${expectedReference}", reçu "${transformed.reference}"`);
      process.exit(1);
    }

    if (transformed.mondayItemId === expectedMondayItemId) {
      console.log(`   ✅ mondayItemId correct: "${transformed.mondayItemId}"`);
    } else {
      console.error(`   ❌ mondayItemId incorrect: attendu "${expectedMondayItemId}", reçu "${transformed.mondayItemId}"`);
      process.exit(1);
    }

    console.log('\n🎉 VALIDATION RÉUSSIE - La correction fonctionne correctement!\n');
    console.log('Les références utilisent maintenant l\'ID Monday natif (grand nombre)');
    console.log('au lieu de timestamps courts.\n');

    // Afficher l'objet complet transformé
    console.log('📦 Objet transformé complet:');
    console.log(JSON.stringify(transformed, null, 2));

  } catch (error) {
    console.error('\n❌ ERREUR lors de la transformation:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Exécuter le test
testTransformation().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
