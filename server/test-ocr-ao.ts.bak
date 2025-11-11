import { processAODocument } from './ocrService';
import { AppError } from './utils/error-handler';
import { logger } from './utils/logger';
import * as path from 'path';
import * as fs from 'fs';

async function testOCRAndCreateAO() {
  logger.info('🔍 Test OCR et création d\'AO automatique');
  logger.info('=========================================');
  
  // PDF à analyser
  const pdfFiles = [
    'attached_assets/00 RPAO SCICV BOULOGNE SANDETTIE v2_1756892042095.pdf',
    'attached_assets/AO-2503-21612025-03-05_08-49-187_1756892042096.pdf'
  ];
  
  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);
    logger.info(`\n📄 Analyse du fichier: ${fileName}`);
    
    if (!fs.existsSync(pdfFile)) {
      logger.error('Erreur', `❌ Fichier non trouvé: ${pdfFile}`);
      continue;
    }
    
    try {
      // Lire le fichier PDF
      const pdfBuffer = fs.readFileSync(pdfFile);
      
      // Analyser avec OCR
      logger.info('⏳ Extraction OCR en cours...');
      const extractedData = await processAODocument(pdfBuffer);
      
      logger.info('\n✅ Données extraites:');
      logger.info('------------------');
      logger.info('Référence:', extractedData.reference || 'Non détectée');
      logger.info('Client:', extractedData.client || 'Non détecté');
      logger.info('Intitulé:', extractedData.intituleOperation || 'Non détecté');
      logger.info('Localisation:', extractedData.location || 'Non détectée');
      logger.info('Date limite:', extractedData.dateLimiteRemise || 'Non détectée');
      logger.info('Type de marché:', extractedData.typeMarche || 'Non détecté');
      logger.info('Maître d\'ouvrage:', extractedData.maitreOuvrage?.nom || 'Non détecté');
      logger.info('Maître d\'œuvre:', extractedData.maitreOeuvre?.nom || 'Non détecté');
      
      if (extractedData.lots && extractedData.lots.length > 0) {
        logger.info('\n📦 Lots détectés:', extractedData.lots.length);
        extractedData.lots.forEach((lot: any, index: number) => {
          logger.info(`  Lot ${index + 1}: ${lot.numero} - ${lot.designation}`);
          if (lot.montantEstime) {
            logger.info(`    Montant: ${lot.montantEstime}€`);
          });
      }
      
      // Créer l'AO via l'API
      logger.info('\n💾 Création de l\'AO via API...');
      
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
        throw new AppError(`Erreur API: ${error}`, 500);
      }
      
      const createdAo = await response.json();
      logger.info(`✅ AO créé avec ID: ${createdAo.id}`);
      
      // Créer les lots si détectés
      if (extractedData.lots && extractedData.lots.length > 0) {
        logger.info('\n📦 Création des lots...');
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
            logger.info(`  ✅ Lot créé: ${lotData.numero} - ${lotData.designation}`);
          } else {
            logger.info(`  ❌ Erreur création lot: ${lotData.numero}`);
          }
        }
      }
      
      logger.info(`\n🎉 AO "${aoData.reference}" créé avec succès!`);
      logger.info(`   URL: http://localhost:5000/offers#ao-${createdAo.id}`);
      
    } catch (error: any) {
      logger.error('Erreur', `❌ Erreur lors du traitement: ${error.message}`);
    }
  }
  
  logger.info('\n=========================================');
  logger.info('✅ Test OCR terminé');
}

// Exécuter le test
testOCRAndCreateAO().catch(console.error);