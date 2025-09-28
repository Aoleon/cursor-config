#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';

// Script pour examiner en détail la structure d'un fichier Excel
function examineExcelFile(filePath) {
  console.log(`🔍 EXAMEN DÉTAILLÉ DE: ${filePath}`);
  console.log('='.repeat(60));
  
  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log(`📊 Nombre de feuilles: ${workbook.SheetNames.length}`);
    console.log(`📋 Noms des feuilles: ${workbook.SheetNames.join(', ')}`);
    console.log('');
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`📄 FEUILLE ${index + 1}: "${sheetName}"`);
      console.log('-'.repeat(40));
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Obtenir les informations de la feuille
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      console.log(`📐 Plage: ${worksheet['!ref'] || 'Vide'}`);
      console.log(`📊 Dimensions: ${range.e.r + 1} lignes x ${range.e.c + 1} colonnes`);
      
      // Lire les données brutes
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        raw: false 
      });
      
      console.log(`🔢 Lignes de données: ${rawData.length}`);
      
      // Afficher les premières lignes pour comprendre la structure
      console.log('\n📝 PREMIÈRES LIGNES (brutes):');
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        console.log(`Ligne ${i + 1}: [${row.map(cell => 
          typeof cell === 'string' && cell.length > 20 ? 
          `"${cell.substring(0, 20)}..."` : 
          `"${cell}"`
        ).join(', ')}]`);
      }
      
      // Analyser avec les headers automatiques
      console.log('\n📊 DONNÉES AVEC HEADERS AUTOMATIQUES:');
      const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
        defval: null,
        raw: false 
      });
      
      if (dataWithHeaders.length > 0) {
        const headers = Object.keys(dataWithHeaders[0]);
        console.log(`📝 Headers détectés (${headers.length}): ${headers.join(', ')}`);
        
        // Afficher quelques échantillons
        console.log('\n🔍 ÉCHANTILLONS DE DONNÉES:');
        for (let i = 0; i < Math.min(3, dataWithHeaders.length); i++) {
          console.log(`Enregistrement ${i + 1}:`);
          const record = dataWithHeaders[i];
          Object.entries(record).forEach(([key, value]) => {
            const displayValue = typeof value === 'string' && value.length > 50 ? 
              value.substring(0, 50) + '...' : value;
            console.log(`  ${key}: ${displayValue}`);
          });
          console.log('');
        }
      } else {
        console.log('⚠️ Aucune donnée trouvée avec les headers automatiques');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
}

// Examiner plusieurs fichiers types
const filesToExamine = [
  'attached_assets/export-monday/CHANTIERS_1758620580.xlsx',
  'attached_assets/export-monday/Gestion salariés/_Personnel_bureau_1758620710.xlsx',
  'attached_assets/export-monday/Planning chantier/Planning_BETHUNE_1758620799.xlsx',
  'attached_assets/export-monday/CAPSO_1758620571.xlsx'
];

async function main() {
  console.log('🔍 EXAMEN DÉTAILLÉ DES STRUCTURES EXCEL MONDAY.COM');
  console.log('==================================================\n');
  
  for (const filePath of filesToExamine) {
    if (fs.existsSync(filePath)) {
      examineExcelFile(filePath);
      console.log('\n' + '='.repeat(80) + '\n');
    } else {
      console.log(`⚠️ Fichier non trouvé: ${filePath}`);
    }
  }
}

main().catch(console.error);