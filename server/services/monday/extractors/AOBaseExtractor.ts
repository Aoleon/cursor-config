import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import type { InsertAo } from '@shared/schema';

export class AOBaseExtractor extends BaseExtractor<Partial<InsertAo>> {
  name = 'AOBaseExtractor';
  
  async extract(context: SplitterContext): Promise<Partial<InsertAo>> {
    const { mondayItem, config } = context;
    const baseMappings = config.mappings.base || [];
    
    const aoData: Partial<InsertAo> = {
      mondayItemId: mondayItem.id,
    };
    
    for (const mapping of baseMappings) {
      try {
        const value = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (mapping.saxiumField === 'name' || mapping.saxiumField === 'intituleOperation') {
          aoData.intituleOperation = value || mondayItem.name;
        } else if (mapping.saxiumField === 'estimatedAmount' || mapping.saxiumField === 'montantEstime') {
          aoData.montantEstime = value ? parseFloat(value).toString() : null;
        } else if (mapping.saxiumField === 'status') {
          aoData.status = value || 'brouillon';
        } else if (mapping.saxiumField === 'timeline') {
          if (value?.from) aoData.dateSortieAO = new Date(value.from);
          if (value?.to) aoData.dateLimiteRemise = new Date(value.to);
        }
        
        this.addDiagnostic(context, 'info', `Mapped ${mapping.mondayColumnId} → ${mapping.saxiumField}`, { value });
      } catch (error: any) {
        this.addDiagnostic(context, 'warning', `Failed to map ${mapping.mondayColumnId}`, { error: error.message });
      }
    }
    
    if (!aoData.intituleOperation) {
      this.addDiagnostic(context, 'error', 'Missing required field: intituleOperation', {});
      aoData.intituleOperation = `AO sans nom (${mondayItem.id})`;
    }
    
    return aoData;
  }
}
