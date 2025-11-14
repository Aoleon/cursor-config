import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../utils/logger';

interface MondaySummary {
  totalBoards: number;
  totalItems: number;
  boards: Array<{
    name: string;
    fileName: string;
    itemCount: number;
  }>;
}

function readMondayExport(exportPath: string): unknown {
  if (!fs.existsSync(exportPath)) {
    logger.warn(`Aucun fichier d'export trouvé à l'emplacement ${exportPath}`);
    return {};
  }

  const raw = fs.readFileSync(exportPath, 'utf-8');
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    logger.error('Impossible de parser le fichier export-monday.json', {
      metadata: {
        service: 'analyze-monday-complete',
        error,
      },
    });
    return {};
  }
}

function buildSummary(data: unknown): MondaySummary {
  if (typeof data !== 'object' || data === null) {
    return { totalBoards: 0, totalItems: 0, boards: [] };
  }

  const boards: MondaySummary['boards'] = [];
  let totalItems = 0;

  for (const [fileName, fileContent] of Object.entries(data)) {
    if (typeof fileContent !== 'object' || fileContent === null) {
      continue;
    }

    for (const [boardName, items] of Object.entries(fileContent as Record<string, unknown>)) {
      if (!Array.isArray(items)) {
        continue;
      }
      boards.push({
        name: boardName,
        fileName,
        itemCount: items.length,
      });
      totalItems += items.length;
    }
  }

  return {
    totalBoards: boards.length,
    totalItems,
    boards: boards.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function writeOutputs(summary: MondaySummary, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });

  const analysisPath = path.join(outputDir, 'monday-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(summary, null, 2));

  const reportLines: string[] = [
    '# Synthèse export Monday.com',
    '',
    `- Date: ${new Date().toISOString()}`,
    `- Nombre total de boards: ${summary.totalBoards}`,
    `- Nombre total d'items: ${summary.totalItems}`,
    '',
    '## Détail par board',
    '',
  ];

  summary.boards.forEach((board) => {
    reportLines.push(`- ${board.name} (${board.fileName}) – ${board.itemCount} items`);
  });

  const markdownPath = path.join(outputDir, 'monday-report.md');
  fs.writeFileSync(markdownPath, reportLines.join('\n'));

  const mappingPath = path.join(outputDir, 'monday-to-saxium-mapping.json');
  const mapping = {
    generatedAt: new Date().toISOString(),
    totalBoards: summary.totalBoards,
    totalItems: summary.totalItems,
    boards: summary.boards,
  };
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
}

function main(): void {
  logger.info('🔍 Analyse synthétique Monday.com en cours...');

  const exportPath = path.join(process.cwd(), 'attached_assets', 'export-monday.json');
  const mondayData = readMondayExport(exportPath);
  const summary = buildSummary(mondayData);

  const outputDir = path.join(process.cwd(), 'server', 'migration');
  writeOutputs(summary, outputDir);

  logger.info('✅ Analyse synthétique terminée');
  logger.info(`📊 Boards trouvés: ${summary.totalBoards}`);
  logger.info(`📝 Items trouvés: ${summary.totalItems}`);
}

main();

export {};
