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
    categories: {}
  },
  fileAnalysis: {},
  consolidatedFields: {
    gestionSalaries: new Set(),
    planningChantier: new Set(),
    projetsSpecifiques: new Set(),
    gestionGenerale: new Set(),
    amopale: new Set()
  },
  vocabulaireMetier: new Set(),
  relations: [],
  recommendations: []
};

// Fonction pour détecter le type de données d'une valeur
function detectDataType(value) {
  if (value === null || value === undefined || value === '') {
    return 'empty';
  }
  
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'decimal';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (typeof value === 'string') {
    // Vérifier si c'est une date
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'date';
    }
    
    // Vérifier si c'est un nombre en texte
    if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return 'numeric_string';
    }
    
    // Vérifier si c'est un email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email';
    }
    
    // Vérifier si c'est un téléphone
    if (/^\+?[\d\s\-\(\)]{8,}$/.test(value)) {
      return 'phone';
    }
    
    return 'text';
  }
  
  if (value instanceof Date) {
    return 'date';
  }
  
  return 'unknown';
}

// Fonction pour analyser les types de données dans une colonne
function analyzeColumnData(columnData) {
  const types = {};
  const samples = [];
  let nonEmptyCount = 0;
  
  columnData.forEach(value => {
    if (value !== null && value !== undefined && value !== '') {
      nonEmptyCount++;
      const type = detectDataType(value);
      types[type] = (types[type] || 0) + 1;
      
      // Garder quelques échantillons
      if (samples.length < 5 && !samples.includes(value)) {
        samples.push(value);
      }
    }
  });
  
  // Déterminer le type principal
  const primaryType = Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b, 'empty');
  
  return {
    primaryType,
    typeDistribution: types,
    samples,
    fillRate: nonEmptyCount / columnData.length,
    totalValues: columnData.length,
    nonEmptyValues: nonEmptyCount
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
      const words = header.split(/[\s_\-\.]+/).filter(w => w.length > 2);
      words.forEach(word => vocabulary.add(word.trim()));
    }
  });
  
  // Vocabulaire des données catégorielles
  data.forEach(row => {
    row.forEach(cell => {
      if (cell && typeof cell === 'string' && cell.length < 50) {
        const words = cell.split(/[\s_\-\.]+/).filter(w => w.length > 2);
        words.forEach(word => {
          if (!/^\d+$/.test(word)) { // Pas juste des chiffres
            vocabulary.add(word.trim());
          }
        });
      }
    });
  });
  
  return vocabulary;
}

// Fonction pour analyser un fichier Excel
function analyzeExcelFile(filePath) {
  try {
    console.log(`📊 Analyse de: ${filePath}`);
    
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
      relations: [],
      summary: {}
    };
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`  📋 Feuille: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: null,
        raw: false 
      });
      
      if (jsonData.length === 0) {
        console.log(`    ⚠️  Feuille vide`);
        return;
      }
      
      // Analyser les headers (première ligne non vide)
      let headerRow = 0;
      while (headerRow < jsonData.length && (!jsonData[headerRow] || jsonData[headerRow].every(cell => !cell))) {
        headerRow++;
      }
      
      if (headerRow >= jsonData.length) {
        console.log(`    ⚠️  Aucune donnée trouvée`);
        return;
      }
      
      const headers = jsonData[headerRow] || [];
      const dataRows = jsonData.slice(headerRow + 1);
      
      // Analyser chaque colonne
      const columnAnalysis = {};
      headers.forEach((header, colIndex) => {
        if (header) {
          const columnData = dataRows.map(row => row[colIndex]);
          const analysis = analyzeColumnData(columnData);
          
          columnAnalysis[header] = {
            index: colIndex,
            name: header,
            ...analysis
          };
          
          fileAnalysis.extractedHeaders.add(header);
        }
      });
      
      // Extraire vocabulaire métier
      const vocabulary = extractBusinessVocabulary(headers, dataRows);
      vocabulary.forEach(word => fileAnalysis.businessVocabulary.add(word));
      
      fileAnalysis.sheets[sheetName] = {
        headerRow,
        headers,
        totalRows: dataRows.length,
        totalColumns: headers.filter(h => h).length,
        columnAnalysis,
        sampleData: dataRows.slice(0, 3) // 3 premières lignes d'exemple
      };
      
      fileAnalysis.totalColumns += headers.filter(h => h).length;
      fileAnalysis.totalRows += dataRows.length;
      
      console.log(`    ✓ ${headers.filter(h => h).length} colonnes, ${dataRows.length} lignes`);
    });
    
    // Ajouter au résultat global
    analysisResult.fileAnalysis[filePath] = fileAnalysis;
    
    // Consolider les champs par catégorie
    const category = fileAnalysis.category;
    fileAnalysis.extractedHeaders.forEach(header => {
      analysisResult.consolidatedFields[category].add(header);
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
    console.log(`✅ Fichier analysé avec succès\n`);
    
    return fileAnalysis;
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
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

// Fonction pour générer le rapport final
function generateReport() {
  // Convertir les Sets en Arrays pour la sérialisation JSON
  const report = {
    ...analysisResult,
    consolidatedFields: Object.fromEntries(
      Object.entries(analysisResult.consolidatedFields).map(([key, set]) => [key, Array.from(set)])
    ),
    vocabulaireMetier: Array.from(analysisResult.vocabulaireMetier),
    summary: {
      ...analysisResult.summary,
      categories: Object.fromEntries(
        Object.entries(analysisResult.summary.categories).map(([key, cat]) => [
          key, 
          { ...cat, uniqueHeaders: Array.from(cat.uniqueHeaders) }
        ])
      )
    }
  };
  
  // Ajouter des recommandations
  report.recommendations = [
    "Standardiser les noms de colonnes similaires entre fichiers",
    "Créer un schéma de base de données unifié basé sur les champs identifiés",
    "Implémenter une validation des types de données pour l'import",
    "Créer un mapping entre les vocabulaires métier et les entités Saxium",
    "Établir des relations entre les entités basées sur les champs communs"
  ];
  
  return report;
}

// Fonction principale
async function main() {
  console.log('🔍 ANALYSE EXHAUSTIVE DES FICHIERS EXCEL MONDAY.COM');
  console.log('================================================\n');
  
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
  const reportPath = 'analysis/excel-structure-analysis-complete.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  
  // Créer un résumé lisible
  const summaryPath = 'analysis/excel-analysis-summary.md';
  const summaryContent = `# ANALYSE EXHAUSTIVE DES FICHIERS EXCEL MONDAY.COM

## Résumé Exécutif

- **Total fichiers analysés**: ${finalReport.summary.processedFiles}/${finalReport.summary.totalFiles}
- **Erreurs**: ${finalReport.summary.errors.length}
- **Vocabulaire métier unique**: ${finalReport.vocabulaireMetier.length} termes

## Analyse par Catégorie

${Object.entries(finalReport.summary.categories).map(([category, stats]) => `
### ${category.toUpperCase()}
- **Fichiers**: ${stats.fileCount}
- **Total colonnes**: ${stats.totalColumns}
- **Total lignes**: ${stats.totalRows}
- **Champs uniques**: ${stats.uniqueHeaders.length}

**Champs principaux**:
${stats.uniqueHeaders.slice(0, 20).map(h => `- ${h}`).join('\n')}
${stats.uniqueHeaders.length > 20 ? `\n... et ${stats.uniqueHeaders.length - 20} autres` : ''}
`).join('\n')}

## Vocabulaire Métier Consolidé

${finalReport.vocabulaireMetier.slice(0, 100).map(term => `- ${term}`).join('\n')}
${finalReport.vocabulaireMetier.length > 100 ? `\n... et ${finalReport.vocabulaireMetier.length - 100} autres termes` : ''}

## Recommandations

${finalReport.recommendations.map(rec => `- ${rec}`).join('\n')}

## Fichiers avec Erreurs

${finalReport.summary.errors.length > 0 ? 
  finalReport.summary.errors.map(err => `- **${err.file}**: ${err.error}`).join('\n') :
  'Aucune erreur détectée ✅'
}

---
*Rapport généré le ${new Date().toISOString()}*
`;
  
  fs.writeFileSync(summaryPath, summaryContent);
  
  // Afficher le résumé
  console.log('\n📋 RÉSUMÉ DE L\'ANALYSE');
  console.log('======================');
  console.log(`✅ Fichiers analysés: ${finalReport.summary.processedFiles}/${finalReport.summary.totalFiles}`);
  console.log(`📊 Vocabulaire métier: ${finalReport.vocabulaireMetier.length} termes uniques`);
  console.log(`🗂️  Catégories: ${Object.keys(finalReport.summary.categories).length}`);
  
  if (finalReport.summary.errors.length > 0) {
    console.log(`⚠️  Erreurs: ${finalReport.summary.errors.length}`);
  }
  
  console.log(`\n📄 Rapports sauvegardés:`);
  console.log(`   - JSON détaillé: ${reportPath}`);
  console.log(`   - Résumé Markdown: ${summaryPath}`);
  
  console.log('\n🎉 Analyse terminée avec succès!');
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeExcelFile, generateReport };