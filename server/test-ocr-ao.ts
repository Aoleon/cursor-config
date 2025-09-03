import { processAODocument } from './ocrService';
import * as path from 'path';
import * as fs from 'fs';

async function testOCRAndCreateAO() {
  console.log('🔍 Test OCR et création d\'AO automatique');
  console.log('=========================================');
  
  // PDF à analyser
  const pdfFiles = [
    'attached_assets/00 RPAO SCICV BOULOGNE SANDETTIE v2_1756892042095.pdf',
    'attached_assets/AO-2503-21612025-03-05_08-49-187_1756892042096.pdf'
  ];
  
  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);
    console.log(`\n📄 Analyse du fichier: ${fileName}`);
    
    if (!fs.existsSync(pdfFile)) {
      console.error(`❌ Fichier non trouvé: ${pdfFile}`);
      continue;
    }
    
    try {
      // Lire le fichier PDF
      const pdfBuffer = fs.readFileSync(pdfFile);
      
      // Analyser avec OCR
      console.log('⏳ Extraction OCR en cours...');
      const extractedData = await processAODocument(pdfBuffer);
      
      console.log('\n✅ Données extraites:');
      console.log('------------------');
      console.log('Référence:', extractedData.reference || 'Non détectée');
      console.log('Client:', extractedData.client || 'Non détecté');
      console.log('Intitulé:', extractedData.intituleOperation || 'Non détecté');
      console.log('Localisation:', extractedData.location || 'Non détectée');
      console.log('Date limite:', extractedData.dateLimiteRemise || 'Non détectée');
      console.log('Type de marché:', extractedData.typeMarche || 'Non détecté');
      console.log('Maître d\'ouvrage:', extractedData.maitreOuvrage?.nom || 'Non détecté');
      console.log('Maître d\'œuvre:', extractedData.maitreOeuvre?.nom || 'Non détecté');
      
      if (extractedData.lots && extractedData.lots.length > 0) {
        console.log('\n📦 Lots détectés:', extractedData.lots.length);
        extractedData.lots.forEach((lot: any, index: number) => {
          console.log(`  Lot ${index + 1}: ${lot.numero} - ${lot.designation}`);
          if (lot.montantEstime) {
            console.log(`    Montant: ${lot.montantEstime}€`);
          }
        });
      }
      
      // Créer l'AO via l'API
      console.log('\n💾 Création de l\'AO via API...');
      
      const aoData = {
        reference: extractedData.reference || `AO-OCR-${Date.now()}`,
        client: extractedData.client || 'Client extrait du PDF',
        location: extractedData.location || 'Localisation extraite',
        departement: extractedData.departement || '14',
        intituleOperation: extractedData.intituleOperation || fileName.replace('.pdf', ''),
        typeMarche: extractedData.typeMarche || 'public',
        montantEstime: extractedData.montantEstime ? String(extractedData.montantEstime) : '0',
        description: extractedData.description || `AO extrait du fichier ${fileName}`,
        menuiserieType: 'fenetre',
        source: 'mail',
        maitre_ouvrage_nom: extractedData.maitreOuvrage?.nom || '',
        maitre_ouvrage_adresse: extractedData.maitreOuvrage?.adresse || '',
        maitre_ouvrage_contact: extractedData.maitreOuvrage?.contact || '',
        maitre_ouvrage_email: extractedData.maitreOuvrage?.email || '',
        maitre_ouvrage_phone: extractedData.maitreOuvrage?.telephone || '',
        maitre_oeuvre: extractedData.maitreOeuvre?.nom || '',
        maitre_oeuvre_contact: extractedData.maitreOeuvre?.contact || ''
      };
      
      // Appeler l'API pour créer l'AO
      const response = await fetch('http://localhost:5000/api/aos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aoData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur API: ${error}`);
      }
      
      const createdAo = await response.json();
      console.log(`✅ AO créé avec ID: ${createdAo.id}`);
      
      // Créer les lots si détectés
      if (extractedData.lots && extractedData.lots.length > 0) {
        console.log('\n📦 Création des lots...');
        for (const lot of extractedData.lots) {
          const lotData = {
            numero: lot.numero || `Lot ${extractedData.lots.indexOf(lot) + 1}`,
            designation: lot.designation || 'Lot extrait du PDF',
            menuiserieType: lot.type || 'autre',
            montantEstime: lot.montantEstime ? String(lot.montantEstime) : undefined,
            isSelected: true,
            comment: lot.description || ''
          };
          
          const lotResponse = await fetch(`http://localhost:5000/api/aos/${createdAo.id}/lots`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(lotData)
          });
          
          if (lotResponse.ok) {
            console.log(`  ✅ Lot créé: ${lotData.numero} - ${lotData.designation}`);
          } else {
            console.log(`  ❌ Erreur création lot: ${lotData.numero}`);
          }
        }
      }
      
      console.log(`\n🎉 AO "${aoData.reference}" créé avec succès!`);
      console.log(`   URL: http://localhost:5000/offers#ao-${createdAo.id}`);
      
    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement: ${error.message}`);
    }
  }
  
  console.log('\n=========================================');
  console.log('✅ Test OCR terminé');
}

// Exécuter le test
testOCRAndCreateAO().catch(console.error);