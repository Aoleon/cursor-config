import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import { detectContactRole } from '../parsers';

export class ContactExtractor extends BaseExtractor<unknown[]> {
  name = 'ContactExtractor';
  
  async extract(context: SplitterContext): Pro<unknown[]>y[]> {
    const contacts: unknown[] = [];
    const contactMappings = context.config.mappings.contacts || [];
    
    for (const mapping of contactMappings) {
      if (mapping.type === 'people') {
        const peopleData = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (Array.isArray(peopleData) && peopleData.length > 0) {
          const role = mapping.saxiumField ? detectContactRole(mapping.saxiumField) : 'other';
          
          for (const person of peopleData) {
            contacts.push({
              name: person.name,
              email: person.email,
              role,
              mondayPersonId: person.id,
            });
            
            this.addDiagnostic(context, 'info', `Extracted contact: ${person.name} (${role})`, { person });
          }
        }
      }
    }
    
    const uniqueContacts = contacts.reduce((acc, contact) => {
      if (!contact.email) return acc;
      
      const existing = acc.find((c: unknown) => c.email === contact.email);
      if (!existing) {
        acc.push(contact);
      }
      
      return acc;
    }, []);
    
    this.addDiagnostic(context, 'info', `Total unique contacts extracted: ${uniqueContacts.length}`, { count: uniqueContacts.length });
    
    return uniqueContacts;
  }
}
