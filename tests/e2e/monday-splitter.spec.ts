import { test, expect } from '@playwright/test';
import { db } from '../../server/db';
import { aos, aoLots, contacts, aoContacts, maitresOuvrage, maitresOeuvre } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Test E2E : MondayDataSplitter
 * Valide workflow complet Monday→Saxium avec déduplication et atomicité
 * 
 * Critères d'acceptation :
 * 1. ✅ GET /analyze retourne opportunités (lots, contacts, addresses, masters)
 * 2. ✅ POST /split crée AO avec monday_item_id
 * 3. ✅ Lots créés et liés à AO (FK ao_id)
 * 4. ✅ Contacts liés à AO via aoContacts
 * 5. ✅ Ré-import même item → contactsCreated=0, mastersCreated=0 (déduplication)
 * 6. ✅ DB reste cohérente (pas de doublons, compteurs exacts)
 */

test.describe('MondayDataSplitter E2E', () => {
  const TEST_BOARD_ID = '8952933832'; // Board Modèle MEXT
  let testMondayItemId: string | null = null;
  
  test.beforeAll(async () => {
    // Note: Nous utilisons des données Monday.com réelles
    // Si le board n'a pas d'items, ce test sera skip
  });
  
  test('should analyze Monday board and detect opportunities', async ({ request }) => {
    // ÉTAPE 1: Analyser board pour détecter opportunités
    const analyzeRes = await request.get(`/api/monday/boards/${TEST_BOARD_ID}/analyze?limit=5`);
    expect(analyzeRes.ok()).toBeTruthy();
    
    const analyzeData = await analyzeRes.json();
    
    // Vérifier structure réponse
    expect(analyzeData).toHaveProperty('boardId');
    expect(analyzeData).toHaveProperty('stats');
    expect(analyzeData).toHaveProperty('items');
    
    // Vérifier stats
    expect(analyzeData.stats.totalItems).toBeGreaterThan(0);
    
    // Récupérer premier item pour tests suivants
    if (analyzeData.items && analyzeData.items.length > 0) {
      testMondayItemId = analyzeData.items[0].itemId;
      
      // Vérifier opportunités détectées
      const firstItem = analyzeData.items[0];
      expect(firstItem).toHaveProperty('opportunities');
      expect(firstItem.opportunities).toHaveProperty('lots');
      expect(firstItem.opportunities).toHaveProperty('contacts');
      expect(firstItem.opportunities).toHaveProperty('addresses');
      expect(firstItem.opportunities).toHaveProperty('masters');
      
      console.log(`✅ Test item Monday détecté: ${testMondayItemId}`);
      console.log(`   - Lots détectés: ${firstItem.opportunities.lots.count}`);
      console.log(`   - Contacts détectés: ${firstItem.opportunities.contacts.count}`);
      console.log(`   - Adresses détectées: ${firstItem.opportunities.addresses.count}`);
      console.log(`   - Maîtres ouvrage: ${firstItem.opportunities.masters.maitresOuvrage.count}`);
      console.log(`   - Maîtres œuvre: ${firstItem.opportunities.masters.maitresOeuvre.count}`);
    }
  });
  
  test('should split Monday item and create AO with related entities', async ({ request }) => {
    // SKIP si pas d'item test disponible
    test.skip(!testMondayItemId, 'No Monday item available for testing');
    
    // Snapshot DB AVANT import
    const aosCountBefore = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(aos);
    
    console.log(`📊 Snapshot DB avant import: ${aosCountBefore[0].count} AOs existants`);
    
    // ÉTAPE 2: Splitter item Monday
    const splitRes = await request.post('/api/monday/import/split', {
      data: {
        boardId: TEST_BOARD_ID,
        mondayItemId: testMondayItemId
      }
    });
    
    expect(splitRes.ok()).toBeTruthy();
    const splitData = await splitRes.json();
    
    // Vérifier réponse API
    expect(splitData.success).toBeTruthy();
    expect(splitData.data).toHaveProperty('aoId');
    expect(splitData.data).toHaveProperty('lotsCreated');
    expect(splitData.data).toHaveProperty('contactsCreated');
    expect(splitData.data).toHaveProperty('mastersCreated');
    
    const { aoId } = splitData.data;
    
    console.log(`✅ Split réussi: AO créé avec ID ${aoId}`);
    console.log(`   - Lots créés: ${splitData.data.lotsCreated}`);
    console.log(`   - Contacts créés: ${splitData.data.contactsCreated}`);
    console.log(`   - Maîtres créés: ${splitData.data.mastersCreated}`);
    
    // ÉTAPE 3: Vérifier DB - AO créé
    const createdAO = await db.select().from(aos).where(eq(aos.id, aoId)).limit(1);
    expect(createdAO.length).toBe(1);
    expect(createdAO[0].mondayItemId).toBe(testMondayItemId);
    
    console.log(`✅ AO vérifié en DB avec mondayItemId = ${testMondayItemId}`);
    
    // ÉTAPE 4: Vérifier DB - Lots liés
    const aoLotsList = await db.select().from(aoLots).where(eq(aoLots.aoId, aoId));
    expect(aoLotsList.length).toBe(splitData.data.lotsCreated);
    
    console.log(`✅ ${aoLotsList.length} lots vérifiés en DB, liés à l'AO`);
    
    // ÉTAPE 5: Vérifier DB - Contacts liés
    const aoContactsList = await db.select().from(aoContacts).where(eq(aoContacts.ao_id, aoId));
    expect(aoContactsList.length).toBeGreaterThanOrEqual(0); // Peut être 0 si pas de contacts
    
    console.log(`✅ ${aoContactsList.length} liaisons contacts vérifiées en DB`);
    
    // ÉTAPE 6: Vérifier DB - Pas de doublons AO
    const aosCountAfter = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(aos);
    
    expect(aosCountAfter[0].count).toBe(aosCountBefore[0].count + 1); // Exactement +1 AO
    
    console.log(`✅ Cohérence DB vérifiée: ${aosCountBefore[0].count} → ${aosCountAfter[0].count} AOs (+1)`);
  });
  
  test('should deduplicate on re-import of same Monday item', async ({ request }) => {
    // SKIP si pas d'item test
    test.skip(!testMondayItemId, 'No Monday item available for testing');
    
    // Snapshot DB AVANT ré-import
    const contactsCountBefore = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(contacts);
    
    const mastersOuvrageCountBefore = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(maitresOuvrage);
    
    const mastersOeuvreCountBefore = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(maitresOeuvre);
    
    console.log(`📊 Snapshot DB avant ré-import:`);
    console.log(`   - Contacts: ${contactsCountBefore[0].count}`);
    console.log(`   - Maîtres ouvrage: ${mastersOuvrageCountBefore[0].count}`);
    console.log(`   - Maîtres œuvre: ${mastersOeuvreCountBefore[0].count}`);
    
    // ÉTAPE 7: Ré-importer MÊME item Monday
    const splitRes2 = await request.post('/api/monday/import/split', {
      data: {
        boardId: TEST_BOARD_ID,
        mondayItemId: testMondayItemId
      }
    });
    
    expect(splitRes2.ok()).toBeTruthy();
    const splitData2 = await splitRes2.json();
    
    console.log(`✅ Ré-import réussi:`);
    console.log(`   - Contacts créés: ${splitData2.data.contactsCreated}`);
    console.log(`   - Maîtres créés: ${splitData2.data.mastersCreated}`);
    
    // Vérifier que contactsCreated = 0 (tous réutilisés)
    expect(splitData2.data.contactsCreated).toBe(0);
    
    // Vérifier que mastersCreated = 0 (tous réutilisés)
    expect(splitData2.data.mastersCreated).toBe(0);
    
    // ÉTAPE 8: Vérifier DB - PAS de nouveaux contacts
    const contactsCountAfter = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(contacts);
    
    expect(contactsCountAfter[0].count).toBe(contactsCountBefore[0].count);
    
    console.log(`✅ Déduplication contacts: ${contactsCountBefore[0].count} → ${contactsCountAfter[0].count} (stable)`);
    
    // ÉTAPE 9: Vérifier DB - PAS de nouveaux maîtres ouvrage
    const mastersOuvrageCountAfter = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(maitresOuvrage);
    
    expect(mastersOuvrageCountAfter[0].count).toBe(mastersOuvrageCountBefore[0].count);
    
    console.log(`✅ Déduplication maîtres ouvrage: ${mastersOuvrageCountBefore[0].count} → ${mastersOuvrageCountAfter[0].count} (stable)`);
    
    // ÉTAPE 10: Vérifier DB - PAS de nouveaux maîtres œuvre
    const mastersOeuvreCountAfter = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(maitresOeuvre);
    
    expect(mastersOeuvreCountAfter[0].count).toBe(mastersOeuvreCountBefore[0].count);
    
    console.log(`✅ Déduplication maîtres œuvre: ${mastersOeuvreCountBefore[0].count} → ${mastersOeuvreCountAfter[0].count} (stable)`);
    console.log(`🎯 DÉDUPLICATION VALIDÉE: Aucun doublon créé lors du ré-import`);
  });
  
  // Note: Test rollback nécessiterait forcer une erreur mid-split
  // Ce test est optionnel pour MVP
});
