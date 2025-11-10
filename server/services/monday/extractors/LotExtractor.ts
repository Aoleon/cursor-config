import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import { extractLotsFromText } from '../parsers';

export class LotExtractor extends BaseExtractor<unknown[]> {
  name = 'LotExtractor';
  
  async extract(context: SplitterContext): Pro<unknown[]>y[]> {
    const lots: unknown[] = [];
    const lotMappings = context.config.mappings.lots || [];
    
    for (const mapping of lotMappings) {
      if (mapping.type === 'subitems') {
        const subitemsData = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (subitemsData?.subitemIds?.length > 0) {
          this.addDiagnostic(context, 'info', `Found ${subitemsData.count} subtasks for lots`, { subitemIds: subitemsData.subitemIds });
          
          for (let i = 0; i < subitemsData.count; i++) {
            lots.push({
              name: `Lot ${i + 1}`,
              description: `Lot extrait de Monday subitem ${subitemsData.subitemIds[i]}`,
              mondaySubitemId: subitemsData.subitemIds[i],
            });
          }
        }
      }
    }
    
    const baseMappings = context.config.mappings.base || [];
    for (const mapping of baseMappings) {
      if (mapping.type === 'long-text' && mapping.mondayColumnId.includes('cctp')) {
        const cctpText = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (cctpText) {
          const lotsFromCCTP = extractLotsFromText(cctpText);
          
          if (lotsFromCCTP.length > 0) {
            this.addDiagnostic(context, 'info', `Extracted ${lotsFromCCTP.length} lots from CCTP`, { lots: lotsFromCCTP });
            lots.push(...lotsFromCCTP.map(lot => ({
              ...lot,
              source: 'cctp'
            })));
          }
        }
      }
    }
    
    this.addDiagnostic(context, 'info', `Total lots extracted: ${lots.length}`, { count: lots.length });
    
    return lots;
  }
}
