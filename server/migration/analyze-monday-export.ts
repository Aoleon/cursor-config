import fs from 'fs';
import { logger } from './utils/logger';
import path from 'path';

interface MondayItem {
  [key: string]: unknown;
}

interface BoardAnalysis {
  count: number;
  columns: string[];
  groups: string[];
  sample_items: unknown[];
  statuses: Set<string>;
  dates: string[];
  subitems_count: number;
}

interface AnalysisResult {
  boards: { [boardName: string]: BoardAnalysis };
  statuses: string[];
  project_patterns: {
    cities: string[];
    clients: string[];
    types: string[];
    number_patterns: string[];
  };
  total_items: number;
  total_boards: number;
}

// Read and parse the JSON file
const jsonPath = path.join(process.cwd(), 'attached_assets', 'export-monday.json');
logger.info('📖 Lecture du fichier:', jsonPath);

const rawData = fs.readFileSync(jsonPath, 'utf-8');
const mondayData = JSON.parse(rawData);

logger.info('✅ Fichier parsé avec succès');

// Initialize analysis
const analysis: AnalysisResult = {
  boards: {},
  statuses: [],
  project_patterns: {
    cities: [],
    clients: [],
    types: [],
    number_patterns: []
  },
  total_items: 0,
  total_boards: 0
};

const allStatuses = new Set<string>();
const allCities = new Set<string>();
const allClients = new Set<string>();
const allTypes = new Set<string>();

// Analyze each board
for (const [fileName, fileContent] of Object.entries(mondayData)) {
  logger.info(`\n🔍 Analyse du fichier: ${fileName}`);
  
  if (typeof fileContent !== 'object' || fileContent === null) continue;
  
  for (const [boardName, boardItems] of Object.entries(fileContent as Record<string, unknown>)) {
    if (!Array.isArray(boardItems)) continue;
    
    logger.info(`  📋 Board: ${boardName} (${boardItems.length} items)`);
    
    const boardKey = boardName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    if (!analysis.boards[boardKey]) {
      analysis.boards[boardKey] = {
        count: 0,
        columns: [],
        groups: [],
        sample_items: [],
        statuses: new Set(),
        dates: [],
        subitems_count: 0
      };
    }
    
    const boardAnalysis = analysis.boards[boardKey];
    const columnSet = new Set<string>();
    const groupSet = new Set<string>();
    
    let currentGroup = '';
    let itemCount = 0;
    
    for (const item of boardItems) {
      if (typeof item !== 'object' || item === null) continue;
      
      // Extract all keys (columns)
      Object.keys(item).forEach(key => {
        if (key && key !== 'undefined') {
          columnSet.add(key);
        });
      
      // Extract values
      const values = Object.values(item);
      const firstKey = Object.keys(item)[0];
      const firstValue = item[firstKey];
      
      // Detect groups
      if (values.length === 1 && typeof firstValue === 'string' && firstValue && !firstValue.includes('-') && !firstValue.match(/\d/)) {
        currentGroup = firstValue;
        groupSet.add(currentGroup);
        continue;
      }
      
      // Detect headers (Name, Duree J Eq, etc.)
      if (firstValue === 'Name' || firstValue === 'Subitems') {
        continue;
      }
      
      // Count actual items
      if (firstValue && typeof firstValue === 'string' && firstValue.length > 2) {
        itemCount++;
        analysis.total_items++;
        
        // Extract statuses
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string') {
            // Status patterns
            if (['Fait', 'A Faire', 'Working on it', 'Done', 'SUPPRIME', 'Stuck', 'En cours'].includes(value)) {
              boardAnalysis.statuses.add(value);
              allStatuses.add(value);
            }
            
            // Date patterns
            if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
              boardAnalysis.dates.push(value);
            }
          }
        }
        
        // Extract project patterns from name
        if (firstValue) {
          // Extract city (usually at the start, in caps)
          const cityMatch = firstValue.match(/^([A-Z\-\s]+?)(?:\s+\d+|\s+-)/);
          if (cityMatch) {
            allCities.add(cityMatch[1].trim());
          }
          
          // Extract numbers (logements count)
          const numberMatch = firstValue.match(/\d+/g);
          if (numberMatch) {
            analysis.project_patterns.number_patterns.push(...numberMatch);
          }
          
          // Extract type keywords
          const typeKeywords = ['MEXT', 'MINT', 'TMA', 'Réhabilitation', 'Réha', 'Construction', 'neuf', 'Rénovation', 'ALU', 'PVC', 'Bardage'];
          typeKeywords.forEach(keyword => {
            if (firstValue.includes(keyword)) {
              allTypes.add(keyword);
            });
          
          // Extract client names (usually in caps after -)
          const clientMatch = firstValue.match(/\s-\s([A-Z\s&]+?)(?:\s-|$)/);
          if (clientMatch) {
            allClients.add(clientMatch[1].trim());
          }
        }
        
        // Check for subitems
        if (firstValue === 'Subitems' || item[firstKey] === 'Subitems') {
          boardAnalysis.subitems_count++;
        }
        
        // Store sample items (max 10 per board)
        if (boardAnalysis.sample_items.length < 10) {
          boardAnalysis.sample_items.push(item);
        }
      }
    }
    
    boardAnalysis.count = itemCount;
    boardAnalysis.columns = Array.from(columnSet);
    boardAnalysis.groups = Array.from(groupSet);
    
    logger.info(`    ✓ ${itemCount} items trouvés`);
    logger.info(`    ✓ ${columnSet.size} colonnes détectées`);
    logger.info(`    ✓ ${groupSet.size} groupes détectés`);
  }
  
  analysis.total_boards++;
}

// Convert Sets to Arrays
analysis.statuses = Array.from(allStatuses).sort();
analysis.project_patterns.cities = Array.from(allCities).sort();
analysis.project_patterns.clients = Array.from(allClients).sort();
analysis.project_patterns.types = Array.from(allTypes).sort();

// Clean up board analysis for JSON output
const cleanedBoards: unknown = {};
for (const [key, board] of Object.entries(analysis.boards)) {
  cleanedBoards[key] = {
    count: board.count,
    columns: board.columns,
    groups: board.groups,
    sample_items: board.sample_items.slice(0, 3), // Only keep 3 samples
    statuses: Array.from(board.statuses),
    dates_count: board.dates.length,
    subitems_count: board.subitems_count
  };
}

const finalAnalysis = {
  ...analysis,
  boards: cleanedBoards
};

// Write JSON analysis
const jsonOutputPath = path.join(process.cwd(), 'server', 'migration', 'monday-analysis.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(finalAnalysis, null, 2), 'utf-8');
logger.info(`\n✅ Analyse JSON écrite: ${jsonOutputPath}`);

// Generate Markdown report
let mdReport = `# Rapport d'Analyse Monday.com Export

**Date d'analyse**: ${new Date().toISOString()}

## 📊 Vue d'ensemble

- **Nombre total de boards**: ${analysis.total_boards}
- **Nombre total d'items**: ${analysis.total_items}
- **Statuts uniques détectés**: ${analysis.statuses.length}
- **Villes identifiées**: ${analysis.project_patterns.cities.length}
- **Clients identifiés**: ${analysis.project_patterns.clients.length}
- **Types de projets**: ${analysis.project_patterns.types.length}

---

## 📋 Boards Détectés

`;

for (const [boardKey, board] of Object.entries(analysis.boards)) {
  mdReport += `\n### ${boardKey.replace(/_/g, ' ').toUpperCase()}\n\n`;
  mdReport += `- **Nombre d'items**: ${board.count}\n`;
  mdReport += `- **Colonnes** (${board.columns.length}): ${board.columns.join(', ')}\n`;
  mdReport += `- **Groupes** (${board.groups.length}): ${board.groups.join(', ')}\n`;
  mdReport += `- **Statuts**: ${Array.from(board.statuses).join(', ') || 'Aucun'}\n`;
  mdReport += `- **Dates détectées**: ${board.dates.length}\n`;
  mdReport += `- **Subitems**: ${board.subitems_count}\n`;
  
  if (board.sample_items.length > 0) {
    mdReport += `\n**Exemples d'items**:\n`;
    board.sample_items.slice(0, 3).forEach((item, idx) => {
      const firstKey = Object.keys(item)[0];
      const name = item[firstKey];
      if (name && name !== 'Name' && name.length > 2) {
        mdReport += `${idx + 1}. ${name}\n`;
      });
  }
}

mdReport += `\n---

## 🎯 Statuts Utilisés

`;

analysis.statuses.forEach(status => {
  mdReport += `- \`${status}\`\n`;
});

mdReport += `\n---

## 🏙️ Villes Identifiées (Top 20)

`;

analysis.project_patterns.cities.slice(0, 20).forEach(city => {
  mdReport += `- ${city}\n`;
});

mdReport += `\n---

## 👥 Clients Identifiés (Top 20)

`;

analysis.project_patterns.clients.slice(0, 20).forEach(client => {
  mdReport += `- ${client}\n`;
});

mdReport += `\n---

## 🔧 Types de Projets

`;

analysis.project_patterns.types.forEach(type => {
  mdReport += `- \`${type}\`\n`;
});

mdReport += `\n---

## 📝 Patterns de Noms de Projets

Les noms de projets dans Monday.com suivent généralement ce format:

\`\`\`
[VILLE] [NOMBRE] - [DESCRIPTION] - [CLIENT] - [TYPE]
\`\`\`

**Exemples**:
- \`GRANDE-SYNTHE 60 - Construction neuf - Quartier des Ilot des Peintres - PARTENORD HABITAT\`
- \`DUNKERQUE 85 NEXITY - MEXT\`
- \`BOULOGNE 127 – CŒUR DE VILLE – HEDOUIN - ICADE PROMOTION\`

**Composants identifiés**:
- **Ville**: Nom de la ville en majuscules (ex: CALAIS, DUNKERQUE, BERCK)
- **Nombre**: Nombre de logements ou d'unités (ex: 60, 85, 127)
- **Client**: Nom du client/promoteur (ex: NEXITY, TISSERIN, MARIGNAN)
- **Type**: Type de menuiserie/travaux (ex: MEXT, MINT, TMA, Réhabilitation)

---

## 🔄 Recommandations de Mapping vers Saxium

### Board: AO Planning 🖥️ → Table: projects

| Colonne Monday | Champ Saxium | Notes |
|----------------|--------------|-------|
| Name | name | Parser pour extraire ville, nombre, client |
| Duree J Eq | duration_days | Durée en jours équivalent |
| Status | status | Mapper les statuts Monday → Saxium |
| Subitems | N/A | À traiter séparément comme tâches |

### Board: CHANTIERS 🏗️ → Table: projects + project_tasks

Les chantiers Monday contiennent souvent:
- Planning de travaux (phases de construction)
- Suivi de l'avancement par métier
- Dates de début/fin par phase

**Mapping suggéré**:
- **Projet principal** → Table \`projects\` avec \`type = 'chantier'\`
- **Phases de travaux** → Table \`project_tasks\` avec phases (Terrassement, Gros œuvre, etc.)
- **Dates** → Colonnes \`start_date\` et \`end_date\`

### Statuts à Mapper

| Monday | Saxium |
|--------|--------|
| Fait | completed |
| A Faire | pending |
| Working on it | in_progress |
| Done | completed |
| SUPPRIME | cancelled |
| En cours | in_progress |
| Stuck | blocked |

---

## ⚠️ Points d'Attention

1. **Subitems**: Nombreux projets ont des subitems qui doivent être migrés comme tâches séparées
2. **Dates multiples**: Plusieurs colonnes de dates (Période - End, dates spécifiques)
3. **Groupes**: Les boards sont organisés en groupes (Commerce Devis, AO EN COURS, etc.) qui doivent être préservés
4. **Colonnes variables**: Certains boards ont des colonnes différentes selon le contexte
5. **Formats de noms**: Les noms de projets suivent un pattern mais avec variations

---

## 🚀 Prochaines Étapes

1. **Créer le script de migration** qui:
   - Parse les noms de projets pour extraire les métadonnées
   - Mappe les statuts Monday → Saxium
   - Convertit les dates au bon format
   - Migre les subitems comme tâches

2. **Valider les mappings** avec des exemples réels

3. **Tester la migration** sur un sous-ensemble de données

4. **Exécuter la migration complète** avec backup

---

**Fin du rapport**
`;

const mdOutputPath = path.join(process.cwd(), 'server', 'migration', 'monday-report.md');
fs.writeFileSync(mdOutputPath, mdReport, 'utf-8');
logger.info(`✅ Rapport Markdown écrit: ${mdOutputPath}`);

logger.info('\n🎉 Analyse terminée avec succès!\n');
logger.info('📊 Résumé:');
logger.info(`   - ${analysis.total_boards} boards analysés`);
logger.info(`   - ${analysis.total_items} items trouvés`);
logger.info(`   - ${analysis.statuses.length} statuts uniques`);
logger.info(`   - ${analysis.project_patterns.cities.length} villes`);
logger.info(`   - ${analysis.project_patterns.clients.length} clients`);
