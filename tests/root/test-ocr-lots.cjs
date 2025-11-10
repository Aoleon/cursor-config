// Script de test OCR pour vérifier l'extraction des lots
const fs = require('fs');
const path = require('path');

// Test direct avec le contenu du document AO-2503-2161
const testContent = `
Avis n°AO-2503-2161
SCICV BOULOGNE SANDETTIE

Construction de 98 logements collectifs, rue de Wissant, NF HABITAT HQE RE2020 Seuils 2025 Cep-10% Cep,nr-10%

Localisation: 62 - Boulogne-sur-Mer

Mise en ligne: 21/01/2025
Limite de réponse: 14/03/2025

Maître d'ouvrage: SCICV Boulogne Sandettie
Assistance à maîtrise d'ouvrage: Novalys
41 boulevard Ambroise-Paré, 80000 Amiens
Siret: 98206593000017

Mode de passation du marché: Appel d'offres ouvert

Objet du marché: Construction de 98 logements collectifs, rue de Wissant, 62200 Boulogne-sur-Mer

Lots concernés:
02a: Fondations spéciales
03: Gros oeuvre
06: Etanchéité
07.1: Menuiseries extérieures
08: Menuiserie intérieure
09: Plâtrerie cloisons sèches
10: Serrurerie
11: Carrelage faïence
12: Peinture

Contact: SAS NOVALYS
Tel: 03 22 71 18 93
`;

// Fonction pour extraire les lots (version simplifiée du code TypeScript)
function extractLots(text) {
  const lots = [];
  
  // Patterns pour détecter différents formats de lots
  const lotPatterns = [
    /(?:lot\s+)?(\d+[a-z]?)\s*[:\-]\s*([^\n,]+)/gi,
    /^(\d{1,3}[a-z]?)\s*[:\-]\s*([^\n,]+)/gim,
    /(\d{1,2}\.?\d?[a-z]?)\s*[:\-]\s*([^\n,]+)/gi,
  ];
  
  // Trouver la section des lots
  const lotSectionMatch = text.match(/lots?\s+concernés?\s*:?\s*([\s\S]*?)(?=\n\nContact|$)/i);
  let lotSection = lotSectionMatch ? lotSectionMatch[1] : text;
  
  console.log("Section lots trouvée:");
  console.log(lotSection);
  console.log("---");
  
  // Chercher les lots dans la section identifiée
  const foundLots = new Map();
  
  for (const pattern of lotPatterns) {
    let match;
    while ((match = pattern.exec(lotSection)) !== null) {
      const numero = match[1].trim();
      const designation = match[2].trim();
      
      // Filtrer les faux positifs
      if (designation.length > 3 && 
          !designation.match(/^\d+/) && 
          !designation.toLowerCase().includes('euros') &&
          !designation.match(/^\d{2}\/\d{2}\/\d{4}/) &&
          designation.length < 100) {
        
        if (!foundLots.has(numero)) {
          foundLots.set(numero, designation);
        }
      }
    }
  }
  
  // Convertir en tableau
  foundLots.forEach((designation, numero) => {
    const lot = {
      numero,
      designation,
    };
    
    // Déterminer le type de lot
    if (designation.toLowerCase().includes('menuiserie')) {
      lot.type = designation.toLowerCase().includes('extérieure') ? 'menuiserie_exterieure' : 'menuiserie_interieure';
    } else if (designation.toLowerCase().includes('gros') && designation.toLowerCase().includes('œuvre')) {
      lot.type = 'gros_oeuvre';
    } else if (designation.toLowerCase().includes('étanchéité')) {
      lot.type = 'etancheite';
    } else if (designation.toLowerCase().includes('fondation')) {
      lot.type = 'fondations';
    } else if (designation.toLowerCase().includes('serrurerie')) {
      lot.type = 'serrurerie';
    } else if (designation.toLowerCase().includes('carrelage')) {
      lot.type = 'carrelage';
    } else if (designation.toLowerCase().includes('peinture')) {
      lot.type = 'peinture';
    } else if (designation.toLowerCase().includes('plâtrerie')) {
      lot.type = 'platrerie';
    }
    
    lots.push(lot);
  });
  
  return lots;
}

// Test d'extraction
console.log("=== TEST D'EXTRACTION DES LOTS ===\n");
const extractedLots = extractLots(testContent);

console.log(`\nNombre de lots trouvés: ${extractedLots.length}\n`);

if (extractedLots.length > 0) {
  console.log("Lots extraits:");
  extractedLots.forEach(lot => {
    console.log(`- Lot ${lot.numero}: ${lot.designation}`);
    if (lot.type) {
      console.log(`  Type: ${lot.type}`);
    }
  });
  
  // Vérifier si les lots menuiserie sont détectés
  const menuiserieLots = extractedLots.filter(l => l.type && l.type.includes('menuiserie'));
  console.log(`\nLots menuiserie détectés: ${menuiserieLots.length}`);
  menuiserieLots.forEach(lot => {
    console.log(`- ${lot.numero}: ${lot.designation} (${lot.type})`);
  });
} else {
  console.log("ERREUR: Aucun lot n'a été extrait!");
}

// Vérifier que les lots attendus sont présents
const expectedLots = ['02a', '03', '06', '07.1', '08', '09', '10', '11', '12'];
const foundNumbers = extractedLots.map(l => l.numero);

console.log("\n=== VÉRIFICATION DES LOTS ATTENDUS ===");
expectedLots.forEach(expected => {
  const found = foundNumbers.includes(expected);
  console.log(`Lot ${expected}: ${found ? '✓ Trouvé' : '✗ Manquant'}`);
});

const successRate = foundNumbers.filter(n => expectedLots.includes(n)).length / expectedLots.length * 100;
console.log(`\nTaux de détection: ${successRate.toFixed(1)}%`);

if (successRate === 100) {
  console.log("\n✅ TEST RÉUSSI : Tous les lots ont été correctement extraits!");
} else {
  console.log("\n⚠️ TEST PARTIEL : Certains lots n'ont pas été détectés.");
}