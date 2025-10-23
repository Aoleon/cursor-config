import { mondayService } from '../server/services/MondayService';
import { lotExtractor, contactExtractor, masterEntityExtractor, addressExtractor } from '../server/services/monday/extractors';
import type { SplitterContext, MondaySplitterConfig } from '../server/services/monday/types';
import { logger } from '../server/utils/logger';
import * as fs from 'fs';

const BOARD_ID = '3946257560';

interface ItemAnalysis {
  itemId: string;
  itemName: string;
  lotsCount: number;
  contactsCount: number;
  addressesCount: number;
  maitresOuvrageCount: number;
  maitresOeuvreCount: number;
  totalOpportunities: number;
  priority: 'HAUTE' | 'MOYENNE' | 'BASSE' | 'AUCUNE';
  details: {
    lots: any[];
    contacts: any[];
    addresses: any[];
    maitresOuvrage: any[];
    maitresOeuvre: any[];
  };
}

interface RepresentativeItem {
  itemId: string;
  itemName: string;
  reason: string;
  details: {
    lotsCount?: number;
    contactsCount?: number;
    addressesCount?: number;
    mastersCount?: number;
    maitresOuvrageCount?: number;
    maitresOeuvreCount?: number;
    totalOpportunities?: number;
  };
}

async function auditBoard() {
  console.log(`\n📊 DÉMARRAGE AUDIT BOARD MONDAY ${BOARD_ID} (Modèle MEXT)\n`);
  console.log('⏳ Récupération des données du board...\n');

  const boardData = await mondayService.getBoardData(BOARD_ID);
  const items = boardData.items || [];

  console.log(`✅ Board récupéré: ${boardData.board.name}`);
  console.log(`📋 Total items à analyser: ${items.length}\n`);

  const columnMappings = boardData.columns.map(col => ({
    mondayColumnId: col.id,
    saxiumField: col.title,
    type: col.type as any,
    required: false
  }));

  const analysisConfig: MondaySplitterConfig = {
    boardId: BOARD_ID,
    boardName: boardData.board.name,
    targetEntity: 'ao',
    mappings: {
      base: columnMappings.filter(m => 
        !m.saxiumField.toLowerCase().includes('lot') &&
        !m.saxiumField.toLowerCase().includes('contact') &&
        !m.saxiumField.toLowerCase().includes('moa') &&
        !m.saxiumField.toLowerCase().includes('moe') &&
        !m.saxiumField.toLowerCase().includes('adresse') &&
        !m.saxiumField.toLowerCase().includes('chantier') &&
        !m.saxiumField.toLowerCase().includes('siège') &&
        !m.saxiumField.toLowerCase().includes('siege') &&
        m.type !== 'location'
      ),
      lots: columnMappings.filter(m => 
        m.type === 'subitems' || 
        m.saxiumField.toLowerCase().includes('lot') ||
        m.saxiumField.toLowerCase().includes('cctp')
      ),
      contacts: columnMappings.filter(m => 
        m.type === 'people' ||
        m.saxiumField.toLowerCase().includes('contact')
      ),
      masterEntities: columnMappings.filter(m =>
        m.saxiumField.toLowerCase().includes('moa') ||
        m.saxiumField.toLowerCase().includes('moe') ||
        m.saxiumField.toLowerCase().includes('ouvrage') ||
        m.saxiumField.toLowerCase().includes('oeuvre')
      ),
      address: columnMappings.filter(m =>
        m.type === 'location' ||
        m.saxiumField.toLowerCase().includes('adresse') ||
        m.saxiumField.toLowerCase().includes('chantier') ||
        m.saxiumField.toLowerCase().includes('siège') ||
        m.saxiumField.toLowerCase().includes('siege')
      )
    }
  };

  console.log('🔍 Analyse des opportunités d\'import pour chaque item...\n');

  const analysisResults: ItemAnalysis[] = [];
  let processedCount = 0;

  for (const item of items) {
    processedCount++;
    
    if (processedCount % 10 === 0) {
      console.log(`   Progression: ${processedCount}/${items.length} items analysés...`);
    }

    const context: SplitterContext = {
      mondayItem: item,
      config: analysisConfig,
      extractedData: {},
      diagnostics: []
    };

    const lots = await lotExtractor.extract(context);
    const contacts = await contactExtractor.extract(context);
    const masters = await masterEntityExtractor.extract(context);
    const addressData = await addressExtractor.extract(context);
    const addresses = addressData ? [addressData] : [];

    const lotsCount = lots.length;
    const contactsCount = contacts.length;
    const addressesCount = addresses.length;
    const maitresOuvrageCount = masters.maitresOuvrage.length;
    const maitresOeuvreCount = masters.maitresOeuvre.length;
    const totalOpportunities = lotsCount + contactsCount + addressesCount + maitresOuvrageCount + maitresOeuvreCount;

    let priority: 'HAUTE' | 'MOYENNE' | 'BASSE' | 'AUCUNE' = 'AUCUNE';
    if (lotsCount > 0) {
      priority = 'HAUTE';
    } else if (contactsCount > 0 || maitresOuvrageCount > 0 || maitresOeuvreCount > 0) {
      priority = 'MOYENNE';
    } else if (addressesCount > 0) {
      priority = 'BASSE';
    }

    analysisResults.push({
      itemId: item.id,
      itemName: item.name,
      lotsCount,
      contactsCount,
      addressesCount,
      maitresOuvrageCount,
      maitresOeuvreCount,
      totalOpportunities,
      priority,
      details: {
        lots: lots.map(lot => ({
          description: lot.description || lot.name || 'Sans description',
          category: lot.category,
          montantHT: lot.montantHT,
          source: lot.source
        })),
        contacts: contacts.map(c => ({
          name: c.name,
          email: c.email,
          role: c.role
        })),
        addresses: addresses.map(addr => ({
          address: addr.fullAddress || addr.address || '',
          city: addr.city || '',
          postalCode: addr.departmentCode || '',
          department: addr.department
        })),
        maitresOuvrage: masters.maitresOuvrage.map(m => ({
          nom: m.raisonSociale,
          siret: m.siret
        })),
        maitresOeuvre: masters.maitresOeuvre.map(m => ({
          nom: m.raisonSociale,
          siret: m.siret
        }))
      }
    });
  }

  console.log(`\n✅ Analyse terminée: ${processedCount} items analysés\n`);

  const stats = {
    totalItems: items.length,
    itemsWithLots: analysisResults.filter(r => r.lotsCount > 0).length,
    itemsWithContacts: analysisResults.filter(r => r.contactsCount > 0).length,
    itemsWithAddresses: analysisResults.filter(r => r.addressesCount > 0).length,
    itemsWithMasters: analysisResults.filter(r => r.maitresOuvrageCount > 0 || r.maitresOeuvreCount > 0).length,
    itemsImportable: analysisResults.filter(r => r.totalOpportunities > 0).length,
    totalLots: analysisResults.reduce((sum, r) => sum + r.lotsCount, 0),
    totalContacts: analysisResults.reduce((sum, r) => sum + r.contactsCount, 0),
    totalAddresses: analysisResults.reduce((sum, r) => sum + r.addressesCount, 0),
    totalMaitresOuvrage: analysisResults.reduce((sum, r) => sum + r.maitresOuvrageCount, 0),
    totalMaitresOeuvre: analysisResults.reduce((sum, r) => sum + r.maitresOeuvreCount, 0)
  };

  const itemsByPriority = {
    HAUTE: analysisResults.filter(r => r.priority === 'HAUTE'),
    MOYENNE: analysisResults.filter(r => r.priority === 'MOYENNE'),
    BASSE: analysisResults.filter(r => r.priority === 'BASSE'),
    AUCUNE: analysisResults.filter(r => r.priority === 'AUCUNE')
  };

  const representativeItems = selectRepresentativeItems(analysisResults);

  const report = generateReport(boardData.board.name, stats, itemsByPriority, representativeItems, analysisResults);

  const reportPath = 'analysis/AUDIT_BOARD_3946257560_COMPLET.md';
  fs.writeFileSync(reportPath, report, 'utf-8');

  const jsonPath = 'analysis/audit-board-3946257560-data.json';
  fs.writeFileSync(jsonPath, JSON.stringify({
    boardId: BOARD_ID,
    boardName: boardData.board.name,
    stats,
    itemsByPriority: {
      HAUTE: itemsByPriority.HAUTE.map(i => ({ itemId: i.itemId, itemName: i.itemName, opportunities: i.totalOpportunities })),
      MOYENNE: itemsByPriority.MOYENNE.map(i => ({ itemId: i.itemId, itemName: i.itemName, opportunities: i.totalOpportunities })),
      BASSE: itemsByPriority.BASSE.map(i => ({ itemId: i.itemId, itemName: i.itemName, opportunities: i.totalOpportunities })),
      AUCUNE: itemsByPriority.AUCUNE.map(i => ({ itemId: i.itemId, itemName: i.itemName }))
    },
    representativeItems,
    allItems: analysisResults
  }, null, 2), 'utf-8');

  console.log(`\n📄 Rapport généré: ${reportPath}`);
  console.log(`📄 Données JSON: ${jsonPath}`);
  console.log('\n' + report);
}

function selectRepresentativeItems(analysisResults: ItemAnalysis[]): RepresentativeItem[] {
  const representative: RepresentativeItem[] = [];

  const itemWithLots = analysisResults.find(r => r.lotsCount > 0);
  if (itemWithLots) {
    representative.push({
      itemId: itemWithLots.itemId,
      itemName: itemWithLots.itemName,
      reason: `Lots (${itemWithLots.lotsCount}) + Contacts (${itemWithLots.contactsCount})`,
      details: {
        lotsCount: itemWithLots.lotsCount,
        contactsCount: itemWithLots.contactsCount,
        addressesCount: itemWithLots.addressesCount,
        mastersCount: itemWithLots.maitresOuvrageCount + itemWithLots.maitresOeuvreCount
      }
    });
  }

  const itemWithMasters = analysisResults.find(r => (r.maitresOuvrageCount > 0 || r.maitresOeuvreCount > 0) && r.itemId !== itemWithLots?.itemId);
  if (itemWithMasters) {
    representative.push({
      itemId: itemWithMasters.itemId,
      itemName: itemWithMasters.itemName,
      reason: `Maîtres (MOA: ${itemWithMasters.maitresOuvrageCount}, MOE: ${itemWithMasters.maitresOeuvreCount})`,
      details: {
        lotsCount: itemWithMasters.lotsCount,
        contactsCount: itemWithMasters.contactsCount,
        maitresOuvrageCount: itemWithMasters.maitresOuvrageCount,
        maitresOeuvreCount: itemWithMasters.maitresOeuvreCount
      }
    });
  }

  const itemWithContacts = analysisResults.find(r => r.contactsCount > 0 && r.itemId !== itemWithLots?.itemId && r.itemId !== itemWithMasters?.itemId);
  if (itemWithContacts) {
    representative.push({
      itemId: itemWithContacts.itemId,
      itemName: itemWithContacts.itemName,
      reason: `Contacts (${itemWithContacts.contactsCount}) - Test déduplication`,
      details: {
        contactsCount: itemWithContacts.contactsCount,
        lotsCount: itemWithContacts.lotsCount
      }
    });
  }

  const simpleItem = analysisResults.find(r => 
    r.totalOpportunities > 0 && 
    r.lotsCount === 0 && 
    r.contactsCount <= 1 &&
    r.itemId !== itemWithLots?.itemId && 
    r.itemId !== itemWithMasters?.itemId && 
    r.itemId !== itemWithContacts?.itemId
  );
  if (simpleItem) {
    representative.push({
      itemId: simpleItem.itemId,
      itemName: simpleItem.itemName,
      reason: 'Item simple - Test cas basique',
      details: {
        addressesCount: simpleItem.addressesCount,
        totalOpportunities: simpleItem.totalOpportunities
      }
    });
  }

  const complexItem = analysisResults.find(r => 
    r.totalOpportunities > 5 &&
    r.itemId !== itemWithLots?.itemId && 
    r.itemId !== itemWithMasters?.itemId && 
    r.itemId !== itemWithContacts?.itemId &&
    r.itemId !== simpleItem?.itemId
  );
  if (complexItem) {
    representative.push({
      itemId: complexItem.itemId,
      itemName: complexItem.itemName,
      reason: `Item complexe - Test import multiple entités (${complexItem.totalOpportunities} opportunités)`,
      details: {
        lotsCount: complexItem.lotsCount,
        contactsCount: complexItem.contactsCount,
        addressesCount: complexItem.addressesCount,
        mastersCount: complexItem.maitresOuvrageCount + complexItem.maitresOeuvreCount,
        totalOpportunities: complexItem.totalOpportunities
      }
    });
  }

  return representative;
}

function generateReport(
  boardName: string,
  stats: any,
  itemsByPriority: any,
  representativeItems: any[],
  allItems: ItemAnalysis[]
): string {
  let report = `# 📊 AUDIT BOARD MONDAY 3946257560 (${boardName})

**Date:** ${new Date().toISOString().split('T')[0]}
**Objectif:** Identifier les données importables depuis Monday.com vers Saxium via MondayDataSplitter

---

## 📈 Statistiques Globales

- **Total items Monday:** ${stats.totalItems}
- **Items importables (≥1 opportunité):** ${stats.itemsImportable} (${((stats.itemsImportable / stats.totalItems) * 100).toFixed(1)}%)
- **Items avec lots:** ${stats.itemsWithLots}
- **Items avec contacts:** ${stats.itemsWithContacts}
- **Items avec adresses:** ${stats.itemsWithAddresses}
- **Items avec maîtres (MOA/MOE):** ${stats.itemsWithMasters}

### Opportunités Totales Détectées

- **Total lots:** ${stats.totalLots}
- **Total contacts:** ${stats.totalContacts}
- **Total adresses:** ${stats.totalAddresses}
- **Total maîtres d'ouvrage:** ${stats.totalMaitresOuvrage}
- **Total maîtres d'œuvre:** ${stats.totalMaitresOeuvre}

---

## 🎯 Opportunités d'Import par Priorité

### Priorité HAUTE (avec lots) - ${itemsByPriority.HAUTE.length} items
${itemsByPriority.HAUTE.length > 0 ? 
  itemsByPriority.HAUTE.slice(0, 10).map((item: ItemAnalysis) => 
    `- **${item.itemId}** - ${item.itemName} (${item.lotsCount} lots, ${item.contactsCount} contacts, ${item.maitresOuvrageCount + item.maitresOeuvreCount} maîtres)`
  ).join('\n') + 
  (itemsByPriority.HAUTE.length > 10 ? `\n- ... et ${itemsByPriority.HAUTE.length - 10} autres items` : '')
  : '- Aucun item avec lots détecté'}

### Priorité MOYENNE (avec contacts ou maîtres) - ${itemsByPriority.MOYENNE.length} items
${itemsByPriority.MOYENNE.length > 0 ? 
  itemsByPriority.MOYENNE.slice(0, 10).map((item: ItemAnalysis) => 
    `- **${item.itemId}** - ${item.itemName} (${item.contactsCount} contacts, ${item.maitresOuvrageCount + item.maitresOeuvreCount} maîtres)`
  ).join('\n') + 
  (itemsByPriority.MOYENNE.length > 10 ? `\n- ... et ${itemsByPriority.MOYENNE.length - 10} autres items` : '')
  : '- Aucun item avec contacts/maîtres détecté'}

### Priorité BASSE (seulement adresse) - ${itemsByPriority.BASSE.length} items
${itemsByPriority.BASSE.length > 0 ? 
  itemsByPriority.BASSE.slice(0, 5).map((item: ItemAnalysis) => 
    `- **${item.itemId}** - ${item.itemName} (${item.addressesCount} adresse)`
  ).join('\n') + 
  (itemsByPriority.BASSE.length > 5 ? `\n- ... et ${itemsByPriority.BASSE.length - 5} autres items` : '')
  : '- Aucun item avec seulement adresse détecté'}

### Sans opportunités - ${itemsByPriority.AUCUNE.length} items
${itemsByPriority.AUCUNE.length > 0 ? `Ces items ne contiennent pas de données structurées importables.` : ''}

---

## 🎯 Items Sélectionnés pour Test Import Réel (Tâche 5)

${representativeItems.map((item, idx) => `
### ${idx + 1}. mondayItemId = \`${item.itemId}\`
- **Nom:** ${item.itemName}
- **Raison sélection:** ${item.reason}
- **Détails:**
${Object.entries(item.details).map(([key, value]) => `  - ${key}: ${value}`).join('\n')}
`).join('\n')}

---

## 📋 Recommandations

### Import Immédiat (Priorité HAUTE)
${itemsByPriority.HAUTE.length > 0 ? `
✅ **${itemsByPriority.HAUTE.length} items** avec lots détectés sont prêts pour l'import.
- Ces items contiennent des données de chiffrage structurées (lots)
- Import recommandé pour enrichir rapidement Saxium avec données métier
- Tester d'abord avec les ${Math.min(5, itemsByPriority.HAUTE.length)} items représentatifs ci-dessus
` : `
⚠️ Aucun item avec lots détecté sur ce board.
- Vérifier si les lots sont dans des colonnes non détectées
- Analyser la structure des subitems Monday
`}

### Import Progressif (Priorité MOYENNE)
${itemsByPriority.MOYENNE.length > 0 ? `
📊 **${itemsByPriority.MOYENNE.length} items** avec contacts/maîtres sont importables.
- Permet d'enrichir la base de contacts Saxium
- Déduplication automatique via \`findOrCreateContact\`
- Import après validation des items priorité HAUTE
` : `
ℹ️ Aucun item avec contacts/maîtres détecté.
`}

### Items Sans Données Structurées
${itemsByPriority.AUCUNE.length > 0 ? `
⚠️ **${itemsByPriority.AUCUNE.length} items** (${((itemsByPriority.AUCUNE.length / stats.totalItems) * 100).toFixed(1)}%) ne contiennent pas de données importables.
- Ces items peuvent contenir uniquement du texte libre
- Audit manuel recommandé pour identifier données manquées
` : ``}

---

## ✅ Validation

- ✅ Statistiques complètes du board obtenues (${stats.totalItems} items analysés)
- ✅ Rapport clair avec opportunités d'import
- ✅ ${representativeItems.length} items sélectionnés pour test réel
- ✅ Prêt pour tâche 4 (améliorer UI) et tâche 5 (import réel)

---

## 📊 Annexe: Tous les Items par Priorité

### Items Priorité HAUTE (${itemsByPriority.HAUTE.length})
${itemsByPriority.HAUTE.map((item: ItemAnalysis) => 
  `- \`${item.itemId}\` - ${item.itemName} - Lots: ${item.lotsCount}, Contacts: ${item.contactsCount}, Masters: ${item.maitresOuvrageCount + item.maitresOeuvreCount}`
).join('\n') || '- Aucun'}

### Items Priorité MOYENNE (${itemsByPriority.MOYENNE.length})
${itemsByPriority.MOYENNE.slice(0, 20).map((item: ItemAnalysis) => 
  `- \`${item.itemId}\` - ${item.itemName} - Contacts: ${item.contactsCount}, Masters: ${item.maitresOuvrageCount + item.maitresOeuvreCount}`
).join('\n') || '- Aucun'}
${itemsByPriority.MOYENNE.length > 20 ? `\n... et ${itemsByPriority.MOYENNE.length - 20} autres items` : ''}

### Items Priorité BASSE (${itemsByPriority.BASSE.length})
${itemsByPriority.BASSE.slice(0, 10).map((item: ItemAnalysis) => 
  `- \`${item.itemId}\` - ${item.itemName}`
).join('\n') || '- Aucun'}
${itemsByPriority.BASSE.length > 10 ? `\n... et ${itemsByPriority.BASSE.length - 10} autres items` : ''}

---

**Fin du rapport**
`;

  return report;
}

auditBoard().catch(error => {
  console.error('❌ Erreur lors de l\'audit:', error);
  process.exit(1);
});
