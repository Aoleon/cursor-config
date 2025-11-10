import type { SplitterContext, SplitterDiagnostic } from '../types';
import { MondayService } from '../../MondayService';

export interface IExtractor<T = any> {
  name: string;
  extract(context: SplitterContext): Promise<T>;
  addDiagnostic(context: SplitterContext, level: 'info' | 'warning' | 'error', message: string, data?: any): void;
}

export abstract class BaseExtractor<T = any> implements IExtractor<T> {
  abstract name: string;
  
  abstract extract(context: SplitterContext): Promise<T>;
  
  addDiagnostic(
    context: SplitterContext, 
    level: 'info' | 'warning' | 'error', 
    message: string, 
    data?: any
  ): void {
    context.diagnostics.push({
      level,
      extractor: this.name,
      message,
      data
    });
  }
  
  protected getColumnValue(context: SplitterContext, columnId: string): any {
    const column = context.mondayItem.column_values?.find(col => col.id === columnId);
    if (!column) return null;
    
    const mondayService = new MondayService();
    return mondayService.extractColumnValue(column);
  }
}
