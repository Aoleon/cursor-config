#!/usr/bin/env node

/**
 * Analyseur approfondi des exports Monday.com Excel
 * 
 * Ce script analyse tous les fichiers .xlsx dans attached_assets/export-monday/
 * et génère un rapport détaillé de leur structure pour mapping vers Saxium.
 * 
 * Auteur: Saxium POC - Analyse Monday.com
 * Date: 2025-09-23
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  inputDir: 'attached_assets/export-monday',
  outputJson: 'analysis/monday-structure-analysis.json',
  outputSummary: 'analysis/monday-analysis-summary.txt',
  maxSampleValues: 5, // Nombre max d'exemples de valeurs par colonne
  maxSheetRows: 1000  // Limite de lignes à analyser par feuille
};

// Structures de données pour l'analyse
const analysisData = {
  summary: {
    totalFiles: 0,
    totalSheets: 0,
    totalColumns: 0,
    totalRows: 0,
    errors: [],
    startTime: new Date().toISOString(),
    endTime: null
  },
  files: {},
  patterns: {
    columnTypes: {},
    commonColumns: {},
    relationshipCandidates: []
  },
  saxiumMappings: {
    suggestedTables: {},
    columnMappings: {},
    enumMappings: {}
  }
};

/**
 * Détecte le type de données d'une valeur
 */
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
  
  if (value instanceof Date) {
    return 'date';
  }
  
  const stringValue = String(value).trim();
  
  // Détection de date au format texte
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(stringValue) || 
      /^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return 'date_string';
  }
  
  // Détection d'email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
    return 'email';
  }
  
  // Détection de téléphone
  if (/^[\d\s\-\.\(\)\+]{8,}$/.test(stringValue)) {
    return 'phone';
  }
  
  // Détection de montant
  if (/^\d+[\.,]\d{2}\s*€?$/.test(stringValue) || /^€?\s*\d+[\.,]\d{2}$/.test(stringValue)) {
    return 'currency';
  }
  
  // Détection de pourcentage
  if (/^\d+[\.,]?\d*\s*%$/.test(stringValue)) {
    return 'percentage';
  }
  
  // Détection d'ID/Code
  if (/^[A-Z]{2,}-\d+$/.test(stringValue) || /^\d{6,}$/.test(stringValue)) {
    return 'identifier';
  }
  
  return 'text';
}

/**
 * Analyse une colonne pour extraire ses caractéristiques
 */
function analyzeColumn(columnData, columnName) {
  const analysis = {
    name: columnName,
    dataTypes: {},
    sampleValues: [],
    nullCount: 0,
    uniqueValues: new Set(),
    minLength: Infinity,
    maxLength: 0,
    patterns: []
  };
  
  for (const value of columnData) {
    const type = detectDataType(value);
    analysis.dataTypes[type] = (analysis.dataTypes[type] || 0) + 1;
    
    if (type === 'empty') {
      analysis.nullCount++;
    } else {
      analysis.uniqueValues.add(String(value));
      if (analysis.sampleValues.length < CONFIG.maxSampleValues) {
        analysis.sampleValues.push(value);
      }
      
      const stringValue = String(value);
      analysis.minLength = Math.min(analysis.minLength, stringValue.length);
      analysis.maxLength = Math.max(analysis.maxLength, stringValue.length);
    }
  }
  
  // Déterminer le type principal
  const typeEntries = Object.entries(analysis.dataTypes);
  analysis.primaryType = typeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
  // Analyse des patterns spécifiques
  analysis.isLookupCandidate = analysis.uniqueValues.size < columnData.length * 0.1;
  analysis.isForeignKeyCandidate = /id$/i.test(columnName) || /_id$/i.test(columnName);
  analysis.isStatusField = /status|statut|état/i.test(columnName);
  
  // Convertir Set en Array pour JSON
  analysis.uniqueValuesArray = Array.from(analysis.uniqueValues).slice(0, 20);
  delete analysis.uniqueValues;
  
  return analysis;
}

/**
 * Analyse une feuille Excel
 */
function analyzeSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    raw: false,
    defval: null
  });
  
  if (jsonData.length === 0) {
    return {
      name: sheetName,
      rowCount: 0,
      columnCount: 0,
      columns: {},
      isEmpty: true
    };
  }
  
  // Première ligne = en-têtes
  const headers = jsonData[0] || [];
  const dataRows = jsonData.slice(1, CONFIG.maxSheetRows + 1);
  
  const sheetAnalysis = {
    name: sheetName,
    rowCount: dataRows.length,
    columnCount: headers.length,
    columns: {},
    isEmpty: false,
    possiblePrimaryKeys: [],
    relationships: []
  };
  
  // Analyser chaque colonne
  headers.forEach((header, index) => {
    if (!header) return;
    
    const columnData = dataRows.map(row => row[index]);
    const columnAnalysis = analyzeColumn(columnData, header);
    sheetAnalysis.columns[header] = columnAnalysis;
    
    // Identifier les clés primaires potentielles
    if (columnAnalysis.isForeignKeyCandidate || 
        (columnAnalysis.uniqueValuesArray.length === columnData.length && 
         columnAnalysis.primaryType === 'identifier')) {
      sheetAnalysis.possiblePrimaryKeys.push(header);
    }
  });
  
  return sheetAnalysis;
}

/**
 * Analyse un fichier Excel
 */
function analyzeExcelFile(filePath) {
  try {
    console.log(`📊 Analyse du fichier: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const fileAnalysis = {
      filename: path.basename(filePath),
      fullPath: filePath,
      category: getCategoryFromPath(filePath),
      sheetCount: workbook.SheetNames.length,
      sheets: {},
      fileSize: fs.statSync(filePath).size,
      lastModified: fs.statSync(filePath).mtime
    };
    
    // Analyser chaque feuille
    workbook.SheetNames.forEach(sheetName => {
      try {
        const sheetAnalysis = analyzeSheet(workbook, sheetName);
        fileAnalysis.sheets[sheetName] = sheetAnalysis;
        
        // Mise à jour des compteurs globaux
        analysisData.summary.totalSheets++;
        analysisData.summary.totalColumns += sheetAnalysis.columnCount;
        analysisData.summary.totalRows += sheetAnalysis.rowCount;
        
      } catch (error) {
        console.error(`❌ Erreur lors de l'analyse de la feuille ${sheetName}:`, error.message);
        analysisData.summary.errors.push({
          file: filePath,
          sheet: sheetName,
          error: error.message
        });
      }
    });
    
    analysisData.summary.totalFiles++;
    return fileAnalysis;
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse du fichier ${filePath}:`, error.message);
    analysisData.summary.errors.push({
      file: filePath,
      error: error.message
    });
    return null;
  }
}

/**
 * Détermine la catégorie d'un fichier basée sur son chemin
 */
function getCategoryFromPath(filePath) {
  const pathParts = filePath.split(path.sep);
  
  if (pathParts.includes('Gestion salariés')) return 'personnel';
  if (pathParts.includes('Planning chantier')) return 'planning';
  if (pathParts.includes('AMOPALE')) return 'projets_specifiques';
  
  const filename = path.basename(filePath, '.xlsx').toLowerCase();
  
  if (filename.includes('contact')) return 'contacts';
  if (filename.includes('planning') || filename.includes('gantt')) return 'planning';
  if (filename.includes('chantier')) return 'chantiers';
  if (filename.includes('formation')) return 'formation';
  if (filename.includes('todo') || filename.includes('to_do')) return 'taches';
  if (filename.includes('ao_') || filename.includes('appel')) return 'appels_offres';
  if (filename.includes('fournisseur') || filename.includes('sous_traitant')) return 'fournisseurs';
  if (filename.includes('direction') || filename.includes('tableau_bord')) return 'direction';
  
  return 'general';
}

/**
 * Trouve tous les fichiers Excel récursivement
 */
function findExcelFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          walkDir(itemPath);
        } else if (stat.isFile() && path.extname(item).toLowerCase() === '.xlsx') {
          files.push(itemPath);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la lecture du dossier ${currentDir}:`, error.message);
    }
  }
  
  walkDir(dir);
  return files;
}

/**
 * Identifie les patterns et relations dans les données
 */
function identifyPatterns() {
  console.log('🔍 Identification des patterns et relations...');
  
  const allColumns = {};
  const columnTypes = {};
  
  // Collecte de toutes les colonnes
  Object.values(analysisData.files).forEach(file => {
    Object.values(file.sheets).forEach(sheet => {
      Object.entries(sheet.columns).forEach(([colName, colData]) => {
        const normalizedName = colName.toLowerCase().trim();
        
        if (!allColumns[normalizedName]) {
          allColumns[normalizedName] = [];
        }
        allColumns[normalizedName].push({
          file: file.filename,
          sheet: sheet.name,
          ...colData
        });
        
        // Comptage des types
        const type = colData.primaryType;
        columnTypes[type] = (columnTypes[type] || 0) + 1;
      });
    });
  });
  
  // Colonnes communes (présentes dans plusieurs fichiers)
  const commonColumns = {};
  Object.entries(allColumns).forEach(([colName, instances]) => {
    if (instances.length > 1) {
      commonColumns[colName] = {
        occurrences: instances.length,
        files: [...new Set(instances.map(i => i.file))],
        types: [...new Set(instances.map(i => i.primaryType))]
      };
    }
  });
  
  // Relations potentielles
  const relationships = [];
  Object.entries(allColumns).forEach(([colName, instances]) => {
    if (colName.includes('id') || colName.includes('ref')) {
      const targetTable = colName.replace(/[_\s]?id$/i, '').replace(/[_\s]?ref$/i, '');
      if (targetTable && targetTable !== colName) {
        relationships.push({
          sourceColumn: colName,
          targetTable: targetTable,
          instances: instances.length,
          files: instances.map(i => `${i.file}:${i.sheet}`)
        });
      }
    }
  });
  
  analysisData.patterns = {
    columnTypes,
    commonColumns,
    relationshipCandidates: relationships,
    totalUniqueColumns: Object.keys(allColumns).length
  };
}

/**
 * Crée les mappings suggérés vers le schéma Saxium
 */
function createSaxiumMappings() {
  console.log('🎯 Création des mappings vers le schéma Saxium...');
  
  // Mappings basés sur les patterns identifiés
  const saxiumTables = {
    'aos': ['ao_', 'appel_offre', 'marche', 'offre'],
    'offers': ['devis', 'proposition', 'chiffrage'],
    'projects': ['projet', 'chantier', 'operation'],
    'users': ['personnel', 'salarie', 'utilisateur', 'contact'],
    'suppliers': ['fournisseur', 'sous_traitant', 'prestataire'],
    'maitresOuvrage': ['maitre_ouvrage', 'client', 'donneur_ordre'],
    'maitresOeuvre': ['maitre_oeuvre', 'architecte', 'bureau_etude'],
    'planning': ['planning', 'gantt', 'calendrier', 'echeance'],
    'documents': ['document', 'fichier', 'piece_jointe']
  };
  
  const suggestedMappings = {};
  
  // Analyser chaque fichier pour suggérer des mappings
  Object.values(analysisData.files).forEach(file => {
    const category = file.category;
    const filename = file.filename.toLowerCase();
    
    // Identification de la table Saxium probable
    let suggestedTable = 'custom_table';
    for (const [table, keywords] of Object.entries(saxiumTables)) {
      if (keywords.some(keyword => filename.includes(keyword) || category.includes(keyword))) {
        suggestedTable = table;
        break;
      }
    }
    
    if (!suggestedMappings[suggestedTable]) {
      suggestedMappings[suggestedTable] = {
        files: [],
        columns: {},
        confidence: 'medium'
      };
    }
    
    suggestedMappings[suggestedTable].files.push(file.filename);
    
    // Mapping des colonnes
    Object.values(file.sheets).forEach(sheet => {
      Object.entries(sheet.columns).forEach(([colName, colData]) => {
        const normalizedCol = colName.toLowerCase().replace(/[_\s]+/g, '_');
        if (!suggestedMappings[suggestedTable].columns[normalizedCol]) {
          suggestedMappings[suggestedTable].columns[normalizedCol] = {
            originalNames: [],
            dataType: colData.primaryType,
            samples: colData.sampleValues,
            nullable: colData.nullCount > 0
          };
        }
        suggestedMappings[suggestedTable].columns[normalizedCol].originalNames.push(colName);
      });
    });
  });
  
  analysisData.saxiumMappings.suggestedTables = suggestedMappings;
  
  // Mappings d'enums suggérés
  const enumMappings = {};
  Object.values(analysisData.files).forEach(file => {
    Object.values(file.sheets).forEach(sheet => {
      Object.entries(sheet.columns).forEach(([colName, colData]) => {
        if (colData.isLookupCandidate && colData.uniqueValuesArray.length <= 20) {
          enumMappings[colName] = {
            values: colData.uniqueValuesArray,
            suggestedEnum: `${colName.toLowerCase().replace(/[^a-z]/g, '_')}_enum`,
            files: [file.filename]
          };
        }
      });
    });
  });
  
  analysisData.saxiumMappings.enumMappings = enumMappings;
}

/**
 * Génère le rapport JSON
 */
function generateJsonReport() {
  console.log('📄 Génération du rapport JSON...');
  
  analysisData.summary.endTime = new Date().toISOString();
  
  // Nettoyage des données pour JSON
  const cleanData = JSON.parse(JSON.stringify(analysisData, null, 2));
  
  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(cleanData, null, 2), 'utf8');
  console.log(`✅ Rapport JSON généré: ${CONFIG.outputJson}`);
}

/**
 * Génère le résumé textuel
 */
function generateTextSummary() {
  console.log('📝 Génération du résumé textuel...');
  
  const summary = analysisData.summary;
  const patterns = analysisData.patterns;
  
  let report = `
# ANALYSE DES EXPORTS MONDAY.COM - RAPPORT DE SYNTHÈSE
================================================================================

## 📊 STATISTIQUES GÉNÉRALES

📁 Fichiers analysés: ${summary.totalFiles}
📋 Feuilles Excel: ${summary.totalSheets}
📊 Colonnes totales: ${summary.totalColumns}
📈 Lignes de données: ${summary.totalRows}
❌ Erreurs rencontrées: ${summary.errors.length}

⏱️  Temps d'analyse: ${summary.startTime} → ${summary.endTime}

## 📂 RÉPARTITION PAR CATÉGORIE

`;

  // Statistiques par catégorie
  const categories = {};
  Object.values(analysisData.files).forEach(file => {
    if (!categories[file.category]) {
      categories[file.category] = { files: 0, sheets: 0 };
    }
    categories[file.category].files++;
    categories[file.category].sheets += file.sheetCount;
  });

  Object.entries(categories).forEach(([category, stats]) => {
    report += `📁 ${category}: ${stats.files} fichiers, ${stats.sheets} feuilles\n`;
  });

  report += `
## 🔍 PATTERNS IDENTIFIÉS

📊 Types de données détectés:
`;
  Object.entries(patterns.columnTypes).forEach(([type, count]) => {
    report += `   • ${type}: ${count} colonnes\n`;
  });

  report += `
📋 Colonnes communes (présentes dans plusieurs fichiers):
`;
  Object.entries(patterns.commonColumns)
    .sort((a, b) => b[1].occurrences - a[1].occurrences)
    .slice(0, 10)
    .forEach(([col, info]) => {
      report += `   • "${col}": ${info.occurrences} occurrences dans ${info.files.length} fichiers\n`;
    });

  report += `
🔗 Relations potentielles identifiées:
`;
  patterns.relationshipCandidates.slice(0, 10).forEach(rel => {
    report += `   • ${rel.sourceColumn} → ${rel.targetTable} (${rel.instances} instances)\n`;
  });

  report += `
## 🎯 MAPPINGS SAXIUM SUGGÉRÉS

`;
  Object.entries(analysisData.saxiumMappings.suggestedTables).forEach(([table, mapping]) => {
    report += `### Table: ${table}\n`;
    report += `📁 Fichiers sources: ${mapping.files.join(', ')}\n`;
    report += `📊 Colonnes identifiées: ${Object.keys(mapping.columns).length}\n`;
    
    // Top colonnes
    const topColumns = Object.entries(mapping.columns).slice(0, 5);
    if (topColumns.length > 0) {
      report += `🔹 Colonnes principales:\n`;
      topColumns.forEach(([col, info]) => {
        report += `   • ${col} (${info.dataType})`;
        if (info.originalNames.length > 1) {
          report += ` [variantes: ${info.originalNames.slice(0, 3).join(', ')}]`;
        }
        report += `\n`;
      });
    }
    report += `\n`;
  });

  if (summary.errors.length > 0) {
    report += `
## ❌ ERREURS RENCONTRÉES

`;
    summary.errors.forEach(error => {
      report += `📁 ${error.file}`;
      if (error.sheet) report += ` / ${error.sheet}`;
      report += `\n   Error: ${error.error}\n\n`;
    });
  }

  report += `
## 🚀 RECOMMANDATIONS

1. **Intégration prioritaire**: Commencer par les tables avec le plus de données (contacts, planning, projets)
2. **Normalisation**: Standardiser les noms de colonnes pour faciliter le mapping
3. **Validation**: Vérifier la cohérence des données avant import
4. **Relations**: Établir les clés étrangères basées sur les patterns identifiés
5. **Enums**: Créer des énumérations pour les champs à valeurs limitées

================================================================================
Rapport généré automatiquement par analyze-monday-exports.js
${new Date().toISOString()}
`;

  fs.writeFileSync(CONFIG.outputSummary, report, 'utf8');
  console.log(`✅ Résumé textuel généré: ${CONFIG.outputSummary}`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de l\'analyse des exports Monday.com...');
  console.log(`📂 Dossier source: ${CONFIG.inputDir}`);
  
  // Vérifier que le dossier source existe
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`❌ Le dossier ${CONFIG.inputDir} n'existe pas`);
    process.exit(1);
  }
  
  // Créer le dossier de sortie s'il n'existe pas
  const outputDir = path.dirname(CONFIG.outputJson);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Trouver tous les fichiers Excel
  const excelFiles = findExcelFiles(CONFIG.inputDir);
  console.log(`📊 ${excelFiles.length} fichiers Excel trouvés`);
  
  if (excelFiles.length === 0) {
    console.log('⚠️  Aucun fichier Excel trouvé dans le dossier spécifié');
    return;
  }
  
  // Analyser chaque fichier
  for (const filePath of excelFiles) {
    const fileAnalysis = analyzeExcelFile(filePath);
    if (fileAnalysis) {
      analysisData.files[filePath] = fileAnalysis;
    }
  }
  
  // Identifier les patterns
  identifyPatterns();
  
  // Créer les mappings Saxium
  createSaxiumMappings();
  
  // Générer les rapports
  generateJsonReport();
  generateTextSummary();
  
  console.log('🎉 Analyse terminée avec succès !');
  console.log(`📊 Résultats: ${analysisData.summary.totalFiles} fichiers, ${analysisData.summary.totalSheets} feuilles analysées`);
  console.log(`📄 Rapports générés:`);
  console.log(`   • JSON: ${CONFIG.outputJson}`);
  console.log(`   • Résumé: ${CONFIG.outputSummary}`);
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

export {
  analyzeExcelFile,
  detectDataType,
  identifyPatterns,
  createSaxiumMappings
};