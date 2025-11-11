import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import { extractSIRET } from '../parsers';

export class MasterEntityExtractor extends BaseExtractor<{
  maitresOuvrage: unknown[];
  maitresOe: unknown[]ny[];
}> {
  name = 'MasterEntityExtractor';
  
  async extract(context: SplitterContext): Promise<{ maitre: unknown[]e: unknown[]; m: unknown[]euvunknown[]ny[] }> {
    cons: unknown[]esOunknown[]e: unknown[] = [];
   : unknown[]maiunknown[]euvunknown unknown[] = [];
    
    const masterMappings = context.config.mappings.masterEntities || [];
    
    for (const mapping of masterMappings) {
      const value = this.getColumnValue(context, mapping.mondayColumnId);
      
      if (!value) continue;
      
      // Détecter si c'est un maître d'ouvrage ou d'œuvre depuis le nom de colonne
      const isMOA = mapping.saxiumField.toLowerCase().includes('moa') || 
                    mapping.saxiumField.toLowerCase().includes('ouvrage');
      const isMOE = mapping.saxiumField.toLowerCase().includes('moe') || 
                    mapping.saxiumField.toLowerCase().includes('oeuvre');
      
      // Parser SIRET si présent
      const siret = extractSIRET(value);
      
      const masterEntity = {
        raisonSociale: value,
        siret,
        source: 'monday'
      };
      
      if (isMOA) {
        maitresOuvrage.push(masterEntity);
        this.addDiagnostic(context, 'info', `Extracted maître d'ouvrage: ${value}`, { masterEntity });
      } else if (isMOE) {
        maitresOeuvre.push(masterEntity);
        this.addDiagnostic(context, 'info', `Extracted maître d'œuvre: ${value}`, { masterEntity });
      }
    }
    
    this.addDiagnostic(context, 'info', `Total master entities extracted`, { 
      maitresOuvrage: maitresOuvrage.length,
      maitresOeuvre: maitresOeuvre.length
    });
    
    return { maitresOuvrage, maitresOeuvre };
  }
}
