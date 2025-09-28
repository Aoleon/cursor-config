#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Structure pour stocker l'analyse complète
const analysisResult = {
  summary: {
    totalFiles: 0,
    processedFiles: 0,
    errors: [],
    categories: {},
    totalUniqueFields: 0
  },
  fileAnalysis: {},
  consolidatedFields: {
    gestionSalaries: new Map(),
    planningChantier: new Map(),
    projetsSpecifiques: new Map(), 
    gestionGenerale: new Map(),
    amopale: new Map()
  },
  vocabulaireMetier: new Set(),
  fieldTypes: new Map(),
  relations: [],
  recommendations: []
};

// Fonction pour détecter les vrais headers dans un fichier Monday.com
function findRealHeaders(rawData) {
  if (rawData.length < 2) return { headerRow: 0, headers: [] };
  
  // Strategy 1: Chercher la ligne avec le maximum de cellules non-vides qui semblent être des headers
  let bestHeaderRow = 0;
  let maxValidHeaders = 0;
  
  for (let rowIndex = 0; rowIndex < Math.min(5, rawData.length); rowIndex++) {
    const row = rawData[rowIndex];
    if (!row) continue;
    
    let validHeaders = 0;
    let consecutiveEmpty = 0;
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      
      if (cell && typeof cell === 'string' && cell.trim() !== '') {
        // Vérifier que ça ressemble à un header (pas trop long, contient des mots clés métier)
        if (cell.length < 100 && cell.length > 1) {
          validHeaders++;
          consecutiveEmpty = 0;
        }
      } else {
        consecutiveEmpty++;
        if (consecutiveEmpty > 10) break; // Arrêter après 10 colonnes vides consécutives
      }
    }
    
    // La ligne avec le plus de headers valides est probablement la ligne des headers
    if (validHeaders > maxValidHeaders && validHeaders > 2) {
      maxValidHeaders = validHeaders;
      bestHeaderRow = rowIndex;
    }
  }
  
  const headerRow = rawData[bestHeaderRow] || [];
  const cleanHeaders = [];
  
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (header && typeof header === 'string' && header.trim() !== '') {
      cleanHeaders.push(header.trim());
    } else if (cleanHeaders.length > 0) {
      // Garder les colonnes vides entre des headers valides
      cleanHeaders.push(`Column_${i + 1}`);
    } else {
      break; // Arrêter au début s'il n'y a pas de header valide
    }
  }
  
  return {
    headerRow: bestHeaderRow,
    headers: cleanHeaders.slice(0, cleanHeaders.findIndex(h => h.startsWith('Column_')) !== -1 ? 
      cleanHeaders.findIndex(h => h.startsWith('Column_')) : cleanHeaders.length)
  };
}

// Fonction pour détecter le type de données d'une valeur
function detectDataType(value) {
  if (value === null || value === undefined || value === '' || value === 'null') {
    return 'empty';
  }
  
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'decimal';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (typeof value === 'string') {
    // Supprimer les espaces pour les tests
    const trimmed = value.trim();
    
    // Vérifier si c'est une date
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) || 
        /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
        /^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
      return 'date';
    }
    
    // Vérifier si c'est un nombre en texte
    if (!isNaN(parseFloat(trimmed)) && isFinite(trimmed)) {
      return 'numeric_string';
    }
    
    // Vérifier si c'est un email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'email';
    }
    
    // Vérifier si c'est un téléphone
    if (/^[\+]?[\d\s\-\(\)\.]{8,}$/.test(trimmed)) {
      return 'phone';
    }
    
    // Vérifier si c'est une URL
    if (/^https?:\/\//.test(trimmed)) {
      return 'url';
    }
    
    // Vérifier si c'est un statut/état (mots courts communs)
    if (['oui', 'non', 'true', 'false', 'actif', 'inactif', 'terminé', 'en cours'].includes(trimmed.toLowerCase())) {
      return 'status';
    }
    
    // Texte court vs long
    return trimmed.length > 100 ? 'long_text' : 'text';
  }
  
  if (value instanceof Date) {
    return 'date';
  }
  
  return 'unknown';
}

// Fonction pour analyser les types de données dans une colonne
function analyzeColumnData(columnData, headerName) {
  const types = {};
  const samples = [];
  const uniqueValues = new Set();
  let nonEmptyCount = 0;
  
  columnData.forEach(value => {
    if (value !== null && value !== undefined && value !== '' && value !== 'null') {
      nonEmptyCount++;
      const type = detectDataType(value);
      types[type] = (types[type] || 0) + 1;
      
      // Garder quelques échantillons variés
      if (samples.length < 10 && !samples.includes(value)) {
        samples.push(value);
      }
      
      // Pour les colonnes avec peu de valeurs uniques, les stocker
      if (uniqueValues.size < 50) {
        uniqueValues.add(value);
      }
    }
  });
  
  // Déterminer le type principal
  const primaryType = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b, 'empty');
  
  // Analyses spéciales selon le nom de la colonne
  let fieldCategory = 'general';
  const headerLower = headerName.toLowerCase();
  
  if (['name', 'nom', 'title', 'titre'].some(word => headerLower.includes(word))) {
    fieldCategory = 'identifier';
  } else if (['date', 'échéance', 'livraison', 'début', 'fin', 'start', 'end'].some(word => headerLower.includes(word))) {
    fieldCategory = 'temporal';
  } else if (['prix', 'coût', 'montant', 'ca', 'budget', 'gain', 'euros', '€'].some(word => headerLower.includes(word))) {
    fieldCategory = 'financial';
  } else if (['statut', 'état', 'status', 'etat'].some(word => headerLower.includes(word))) {
    fieldCategory = 'status';
  } else if (['personne', 'contact', 'moa', 'moe', 'client'].some(word => headerLower.includes(word))) {
    fieldCategory = 'contact';
  } else if (['projet', 'chantier', 'lot', 'devis'].some(word => headerLower.includes(word))) {
    fieldCategory = 'project';
  }
  
  return {
    primaryType,
    fieldCategory,
    typeDistribution: types,
    samples: samples.slice(0, 5),
    uniqueValueCount: uniqueValues.size,
    uniqueValues: uniqueValues.size <= 10 ? Array.from(uniqueValues) : null,
    fillRate: nonEmptyCount / columnData.length,
    totalValues: columnData.length,
    nonEmptyValues: nonEmptyCount,
    isLookup: uniqueValues.size < 20 && nonEmptyCount > 10,
    isPrimaryKey: uniqueValues.size === nonEmptyCount && nonEmptyCount > 1
  };
}

// Fonction pour catégoriser un fichier selon son nom et path
function categorizeFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  
  if (dirName.includes('gestion') && dirName.includes('salari')) {
    return 'gestionSalaries';
  }
  if (dirName.includes('planning') && dirName.includes('chantier')) {
    return 'planningChantier';
  }
  if (dirName.includes('amopale')) {
    return 'amopale';
  }
  
  // Classification par nom de fichier
  if (fileName.includes('personnel') || fileName.includes('formation') || fileName.includes('outillage')) {
    return 'gestionSalaries';
  }
  if (fileName.includes('planning') || fileName.includes('boulogne') || fileName.includes('fruges') || fileName.includes('etaples')) {
    return 'planningChantier';
  }
  if (fileName.includes('bethune') || fileName.includes('perenchies') || fileName.includes('ecques')) {
    return 'projetsSpecifiques';
  }
  
  return 'gestionGenerale';
}

// Fonction pour extraire le vocabulaire métier
function extractBusinessVocabulary(headers, data) {
  const vocabulary = new Set();
  
  // Headers comme vocabulaire
  headers.forEach(header => {
    if (header && typeof header === 'string') {
      vocabulary.add(header.trim());
      
      // Extraire les mots composés
      const words = header.split(/[\s_\-\.\/\(\)]+/).filter(w => w.length > 2);
      words.forEach(word => vocabulary.add(word.trim()));
    }
  });
  
  // Vocabulaire des données catégorielles (valeurs courtes fréquentes)
  const frequentValues = new Map();
  
  data.forEach(row => {
    row.forEach(cell => {
      if (cell && typeof cell === 'string' && cell.length > 2 && cell.length < 50) {
        frequentValues.set(cell, (frequentValues.get(cell) || 0) + 1);
      }
    });
  });
  
  // Ajouter les valeurs qui apparaissent plusieurs fois (probablement du vocabulaire métier)
  frequentValues.forEach((count, value) => {
    if (count >= 2 && !/^\d+$/.test(value)) {
      vocabulary.add(value.trim());
      
      // Extraire les mots de ces valeurs
      const words = value.split(/[\s_\-\.\/\(\)]+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (!/^\d+$/.test(word)) {
          vocabulary.add(word.trim());
        }
      });
    }
  });
  
  return vocabulary;
}

// Fonction pour analyser un fichier Excel avec le format Monday.com
function analyzeExcelFile(filePath) {
  try {
    console.log(`📊 Analyse de: ${path.basename(filePath)}`);
    
    const workbook = XLSX.readFile(filePath);
    const fileAnalysis = {
      fileName: path.basename(filePath),
      filePath: filePath,
      category: categorizeFile(filePath),
      sheets: {},
      totalColumns: 0,
      totalRows: 0,
      extractedHeaders: new Set(),
      businessVocabulary: new Set(),
      fieldAnalysis: new Map(),
      summary: {}
    };
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`  📋 Feuille: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null,
        raw: false 
      });
      
      if (rawData.length === 0) {
        console.log(`    ⚠️  Feuille vide`);
        return;
      }
      
      // Trouver les vrais headers avec la nouvelle logique Monday.com
      const { headerRow, headers } = findRealHeaders(rawData);
      
      if (headers.length === 0) {
        console.log(`    ⚠️  Aucun header trouvé`);
        return;
      }
      
      const dataRows = rawData.slice(headerRow + 1);
      
      // Analyser chaque colonne
      const columnAnalysis = {};
      headers.forEach((header, colIndex) => {
        const columnData = dataRows.map(row => row[colIndex]);
        const analysis = analyzeColumnData(columnData, header);
        
        columnAnalysis[header] = {
          index: colIndex,
          name: header,
          ...analysis
        };
        
        fileAnalysis.extractedHeaders.add(header);
        
        // Stocker l'analyse des champs globalement
        const fieldKey = `${header}_${analysis.fieldCategory}`;
        if (!analysisResult.fieldTypes.has(fieldKey)) {
          analysisResult.fieldTypes.set(fieldKey, {
            name: header,
            category: analysis.fieldCategory,
            primaryType: analysis.primaryType,
            occurrences: []
          });
        }
        analysisResult.fieldTypes.get(fieldKey).occurrences.push({
          file: filePath,
          sheet: sheetName,
          samples: analysis.samples
        });
      });
      
      // Extraire vocabulaire métier
      const vocabulary = extractBusinessVocabulary(headers, dataRows);
      vocabulary.forEach(word => fileAnalysis.businessVocabulary.add(word));
      
      fileAnalysis.sheets[sheetName] = {
        headerRow,
        headers,
        totalRows: dataRows.length,
        totalColumns: headers.length,
        columnAnalysis,
        sampleData: dataRows.slice(0, 3) // 3 premières lignes d'exemple
      };
      
      fileAnalysis.totalColumns += headers.length;
      fileAnalysis.totalRows += dataRows.length;
      
      console.log(`    ✓ ${headers.length} colonnes, ${dataRows.length} lignes`);
    });
    
    // Ajouter au résultat global
    analysisResult.fileAnalysis[filePath] = fileAnalysis;
    
    // Consolider les champs par catégorie
    const category = fileAnalysis.category;
    fileAnalysis.extractedHeaders.forEach(header => {
      analysisResult.consolidatedFields[category].set(header, 
        (analysisResult.consolidatedFields[category].get(header) || 0) + 1);
    });
    
    // Ajouter au vocabulaire métier global
    fileAnalysis.businessVocabulary.forEach(word => {
      analysisResult.vocabulaireMetier.add(word);
    });
    
    // Mettre à jour les statistiques
    if (!analysisResult.summary.categories[category]) {
      analysisResult.summary.categories[category] = {
        fileCount: 0,
        totalColumns: 0,
        totalRows: 0,
        uniqueHeaders: new Set()
      };
    }
    
    analysisResult.summary.categories[category].fileCount++;
    analysisResult.summary.categories[category].totalColumns += fileAnalysis.totalColumns;
    analysisResult.summary.categories[category].totalRows += fileAnalysis.totalRows;
    fileAnalysis.extractedHeaders.forEach(header => {
      analysisResult.summary.categories[category].uniqueHeaders.add(header);
    });
    
    analysisResult.summary.processedFiles++;
    console.log(`✅ Fichier analysé avec succès`);
    
    return fileAnalysis;
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${path.basename(filePath)}:`, error.message);
    analysisResult.summary.errors.push({
      file: filePath,
      error: error.message
    });
    return null;
  }
}

// Fonction pour scanner récursivement un dossier
function scanDirectory(dirPath) {
  const files = [];
  
  function scan(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scan(itemPath);
      } else if (path.extname(item).toLowerCase() === '.xlsx') {
        files.push(itemPath);
      }
    });
  }
  
  scan(dirPath);
  return files;
}

// Fonction pour analyser les relations entre entités
function analyzeRelations() {
  const relations = [];
  const fieldsByCategory = {};
  
  // Grouper les champs par catégorie
  Object.entries(analysisResult.consolidatedFields).forEach(([category, fieldsMap]) => {
    fieldsByCategory[category] = Array.from(fieldsMap.keys());
  });
  
  // Identifier les champs similaires entre catégories
  const allFields = new Set();
  Object.values(fieldsByCategory).forEach(fields => {
    fields.forEach(field => allFields.add(field.toLowerCase()));
  });
  
  // Rechercher des patterns de relation
  const relationKeywords = ['num', 'id', 'code', 'ref', 'name', 'nom'];
  
  allFields.forEach(field => {
    if (relationKeywords.some(keyword => field.includes(keyword))) {
      const occurrences = [];
      Object.entries(fieldsByCategory).forEach(([category, fields]) => {
        if (fields.some(f => f.toLowerCase().includes(field))) {
          occurrences.push(category);
        }
      });
      
      if (occurrences.length > 1) {
        relations.push({
          field: field,
          categories: occurrences,
          type: 'potential_foreign_key'
        });
      }
    }
  });
  
  return relations;
}

// Fonction pour générer le rapport final
function generateReport() {
  // Analyser les relations
  const relations = analyzeRelations();
  
  // Convertir les Maps et Sets en Arrays pour la sérialisation JSON
  const report = {
    ...analysisResult,
    consolidatedFields: Object.fromEntries(
      Object.entries(analysisResult.consolidatedFields).map(([key, map]) => [
        key, 
        Array.from(map.entries()).map(([field, count]) => ({ field, count }))
      ])
    ),
    vocabulaireMetier: Array.from(analysisResult.vocabulaireMetier),
    fieldTypes: Array.from(analysisResult.fieldTypes.entries()).map(([key, data]) => ({
      key,
      ...data
    })),
    relations,
    summary: {
      ...analysisResult.summary,
      categories: Object.fromEntries(
        Object.entries(analysisResult.summary.categories).map(([key, cat]) => [
          key, 
          { ...cat, uniqueHeaders: Array.from(cat.uniqueHeaders) }
        ])
      ),
      totalUniqueFields: analysisResult.fieldTypes.size
    }
  };
  
  // Ajouter des recommandations détaillées
  report.recommendations = [
    {
      category: "Standardisation des noms",
      priority: "Haute",
      description: "Standardiser les noms de colonnes similaires entre fichiers",
      examples: relations.filter(r => r.type === 'potential_foreign_key').slice(0, 5)
    },
    {
      category: "Schéma de base de données",
      priority: "Haute", 
      description: "Créer un schéma unifié basé sur les champs identifiés",
      details: "Utiliser les champs les plus fréquents comme base"
    },
    {
      category: "Validation des données",
      priority: "Moyenne",
      description: "Implémenter une validation des types de données pour l'import",
      details: "Basée sur l'analyse des types détectés"
    },
    {
      category: "Mapping métier",
      priority: "Moyenne",
      description: "Créer un mapping entre vocabulaires métier et entités Saxium",
      vocabularySize: report.vocabulaireMetier.length
    },
    {
      category: "Relations entre entités",
      priority: "Haute",
      description: "Établir des relations basées sur les champs communs",
      potentialRelations: relations.length
    }
  ];
  
  return report;
}

// Fonction principale
async function main() {
  console.log('🔍 ANALYSE EXHAUSTIVE DES FICHIERS EXCEL MONDAY.COM (FORMAT AMÉLIORÉ)');
  console.log('==================================================================\n');
  
  const exportDir = 'attached_assets/export-monday';
  
  if (!fs.existsSync(exportDir)) {
    console.error(`❌ Dossier ${exportDir} introuvable`);
    process.exit(1);
  }
  
  // Scanner tous les fichiers Excel
  const excelFiles = scanDirectory(exportDir);
  analysisResult.summary.totalFiles = excelFiles.length;
  
  console.log(`📁 ${excelFiles.length} fichiers Excel trouvés\n`);
  
  // Analyser chaque fichier
  for (const filePath of excelFiles) {
    analyzeExcelFile(filePath);
  }
  
  // Générer le rapport final
  const finalReport = generateReport();
  
  // Sauvegarder le rapport
  const reportPath = 'analysis/excel-structure-analysis-monday-format.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  
  // Créer un résumé lisible détaillé
  const summaryPath = 'analysis/monday-excel-analysis-complete.md';
  const summaryContent = `# ANALYSE EXHAUSTIVE DES FICHIERS EXCEL MONDAY.COM - RAPPORT COMPLET

## Résumé Exécutif

- **Total fichiers analysés**: ${finalReport.summary.processedFiles}/${finalReport.summary.totalFiles}
- **Erreurs**: ${finalReport.summary.errors.length}
- **Vocabulaire métier unique**: ${finalReport.vocabulaireMetier.length} termes
- **Champs uniques identifiés**: ${finalReport.summary.totalUniqueFields}
- **Relations potentielles**: ${finalReport.relations.length}

## Analyse par Catégorie

${Object.entries(finalReport.summary.categories).map(([category, stats]) => `
### ${category.toUpperCase()}
- **Fichiers**: ${stats.fileCount}
- **Total colonnes**: ${stats.totalColumns}
- **Total lignes**: ${stats.totalRows}
- **Champs uniques**: ${stats.uniqueHeaders.length}

**Champs principaux**:
${stats.uniqueHeaders.slice(0, 30).map(h => `- ${h}`).join('\n')}
${stats.uniqueHeaders.length > 30 ? `\n... et ${stats.uniqueHeaders.length - 30} autres` : ''}
`).join('\n')}

## Types de Champs Identifiés

${finalReport.fieldTypes.slice(0, 50).map(field => `
### ${field.name} (${field.category})
- **Type principal**: ${field.primaryType}
- **Occurrences**: ${field.occurrences.length} fichier(s)
- **Exemples**: ${field.occurrences[0]?.samples?.slice(0, 3).join(', ') || 'N/A'}
`).join('')}

${finalReport.fieldTypes.length > 50 ? `\n... et ${finalReport.fieldTypes.length - 50} autres champs` : ''}

## Relations Potentielles Entre Entités

${finalReport.relations.map(rel => `
### ${rel.field}
- **Type**: ${rel.type}
- **Catégories concernées**: ${rel.categories.join(', ')}
`).join('')}

## Vocabulaire Métier BTP/JLM (Top 100)

${finalReport.vocabulaireMetier.slice(0, 100).map(term => `- ${term}`).join('\n')}
${finalReport.vocabulaireMetier.length > 100 ? `\n... et ${finalReport.vocabulaireMetier.length - 100} autres termes` : ''}

## Recommandations Détaillées

${finalReport.recommendations.map(rec => `
### ${rec.category} (Priorité: ${rec.priority})
${rec.description}

${rec.details ? `**Détails**: ${rec.details}` : ''}
${rec.examples ? `**Exemples**: ${rec.examples.map(ex => ex.field).join(', ')}` : ''}
${rec.vocabularySize ? `**Taille vocabulaire**: ${rec.vocabularySize} termes` : ''}
${rec.potentialRelations ? `**Relations potentielles**: ${rec.potentialRelations}` : ''}
`).join('')}

## Analyse par Fichier (Détails)

${Object.entries(finalReport.fileAnalysis).map(([filePath, analysis]) => `
### ${analysis.fileName}
- **Catégorie**: ${analysis.category}
- **Feuilles**: ${Object.keys(analysis.sheets).length}
- **Total colonnes**: ${analysis.totalColumns}
- **Total lignes**: ${analysis.totalRows}
- **Champs extraits**: ${analysis.extractedHeaders ? Array.from(analysis.extractedHeaders).length : 0}

**Feuilles analysées**:
${Object.entries(analysis.sheets).map(([sheetName, sheet]) => `
  - **${sheetName}**: ${sheet.totalColumns} colonnes, ${sheet.totalRows} lignes
    - Headers: ${sheet.headers.slice(0, 5).join(', ')}${sheet.headers.length > 5 ? '...' : ''}
`).join('')}
`).join('')}

## Fichiers avec Erreurs

${finalReport.summary.errors.length > 0 ? 
  finalReport.summary.errors.map(err => `- **${err.file}**: ${err.error}`).join('\n') :
  'Aucune erreur détectée ✅'
}

---
*Rapport généré le ${new Date().toISOString()}*
*Analysé avec le format Monday.com amélioré*
`;
  
  fs.writeFileSync(summaryPath, summaryContent);
  
  // Créer aussi un fichier CSV pour Excel avec tous les champs
  const csvContent = [
    'Catégorie,Fichier,Feuille,Champ,Type,Catégorie_Champ,Taux_Remplissage,Exemples',
    ...Object.entries(finalReport.fileAnalysis).flatMap(([filePath, analysis]) =>
      Object.entries(analysis.sheets).flatMap(([sheetName, sheet]) =>
        sheet.headers.map(header => {
          const columnAnalysis = sheet.columnAnalysis[header] || {};
          return [
            analysis.category,
            analysis.fileName,
            sheetName,
            header,
            columnAnalysis.primaryType || 'unknown',
            columnAnalysis.fieldCategory || 'general',
            columnAnalysis.fillRate || 0,
            (columnAnalysis.samples || []).slice(0, 2).join('; ')
          ].map(field => `"${field}"`).join(',');
        })
      )
    )
  ].join('\n');
  
  const csvPath = 'analysis/monday-fields-complete.csv';
  fs.writeFileSync(csvPath, csvContent);
  
  // Afficher le résumé
  console.log('\n📋 RÉSUMÉ DE L\'ANALYSE COMPLÈTE');
  console.log('===============================');
  console.log(`✅ Fichiers analysés: ${finalReport.summary.processedFiles}/${finalReport.summary.totalFiles}`);
  console.log(`📊 Champs uniques: ${finalReport.summary.totalUniqueFields}`);
  console.log(`📝 Vocabulaire métier: ${finalReport.vocabulaireMetier.length} termes`);
  console.log(`🔗 Relations potentielles: ${finalReport.relations.length}`);
  console.log(`🗂️  Catégories: ${Object.keys(finalReport.summary.categories).length}`);
  
  if (finalReport.summary.errors.length > 0) {
    console.log(`⚠️  Erreurs: ${finalReport.summary.errors.length}`);
  }
  
  console.log(`\n📄 Rapports sauvegardés:`);
  console.log(`   - JSON détaillé: ${reportPath}`);
  console.log(`   - Résumé Markdown: ${summaryPath}`);
  console.log(`   - Export CSV: ${csvPath}`);
  
  console.log('\n🎉 Analyse exhaustive terminée avec succès!');
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeExcelFile, generateReport };