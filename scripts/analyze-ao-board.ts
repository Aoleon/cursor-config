#!/usr/bin/env tsx
/**
 * Script temporaire pour analyser structure board AO Monday
 */

import { getMondaySchemaAnalyzer } from '../server/services/MondaySchemaAnalyzer';
import { logger } from '../server/utils/logger';

async function main() {
  const analyzer = getMondaySchemaAnalyzer();
  
  try {
    logger.info('Début analyse board AO', {
      metadata: {
        boardId: '3946257560',
        operation: 'analyze-ao-structure'
      }
    });

    // Analyser structure board AO
    const structure = await analyzer.analyzeBoardStructure('3946257560', 'Board AO');

    logger.info('Structure board AO analysée', {
      metadata: {
        boardId: structure.boardId,
        columnCount: structure.columns.length,
        columns: structure.columns.map(c => ({ id: c.id, title: c.title, type: c.type }))
      }
    });

    // Afficher toutes les colonnes
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         STRUCTURE BOARD AO (ID: 3946257560)            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`Total colonnes: ${structure.columns.length}\n`);

    structure.columns.forEach((col, idx) => {
      console.log(`${idx + 1}. "${col.title}"`);
      console.log(`   ID: ${col.id}`);
      console.log(`   Type: ${col.type}`);
      if (col.settings) {
        console.log(`   Settings: ${JSON.stringify(col.settings).substring(0, 100)}`);
      }
      console.log('');
    });

    // Identifier colonnes potentielles pour CLIENT
    console.log('\n━━━ COLONNES POTENTIELLES POUR CLIENT ━━━\n');
    const clientCandidates = structure.columns.filter(col => {
      const titleLower = col.title.toLowerCase();
      return (
        titleLower.includes('client') ||
        titleLower.includes('donneur') ||
        titleLower.includes('maitre') ||
        titleLower.includes('ouvrage') ||
        titleLower.includes('commanditaire') ||
        col.type === 'people'
      );
    });

    clientCandidates.forEach(col => {
      console.log(`✓ "${col.title}" (ID: ${col.id}, Type: ${col.type})`);
    });

    // Identifier colonnes potentielles pour REFERENCE
    console.log('\n━━━ COLONNES POTENTIELLES POUR REFERENCE ━━━\n');
    const refCandidates = structure.columns.filter(col => {
      const titleLower = col.title.toLowerCase();
      return (
        col.id === 'name' ||
        titleLower.includes('ref') ||
        titleLower.includes('numéro') ||
        titleLower.includes('numero') ||
        titleLower.includes('code')
      );
    });

    refCandidates.forEach(col => {
      console.log(`✓ "${col.title}" (ID: ${col.id}, Type: ${col.type})`);
    });

  } catch (error) {
    logger.error('Erreur analyse board AO', {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
}

main().catch(console.error);
