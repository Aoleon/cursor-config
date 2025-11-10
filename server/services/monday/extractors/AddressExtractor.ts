import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import { parseAddress } from '../parsers';

export class AddressExtractor extends BaseExtractor<unknown | null> {
  name = 'AddressExtractor';
  
  async extract(context: SplitterContext): Promunknown |ny | null> {
    const addressMappings = context.config.mappings.address || [];
    
    for (const mapping of addressMappings) {
      if (mapping.type === 'location') {
        const locationData = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (locationData?.address) {
          const parsedAddress = parseAddress(locationData.address);
          
          if (parsedAddress) {
            this.addDiagnostic(context, 'info', 'Address extracted from location column', { 
              parsed: parsedAddress,
              raw: locationData 
            });
            
            return {
              ...parsedAddress,
              lat: locationData.lat,
              lng: locationData.lng,
              placeId: locationData.placeId,
            };
          }
        }
      }
    }
    
    const baseMappings = context.config.mappings.base || [];
    for (const mapping of baseMappings) {
      if (mapping.saxiumField.includes('address') || mapping.mondayColumnId.includes('address')) {
        const addressText = this.getColumnValue(context, mapping.mondayColumnId);
        
        if (addressText) {
          const parsedAddress = parseAddress(addressText);
          
          if (parsedAddress) {
            this.addDiagnostic(context, 'info', 'Address extracted from text column', { parsed: parsedAddress });
            return parsedAddress;
          }
        }
      }
    }
    
    this.addDiagnostic(context, 'warning', 'No address found', {});
    return null;
  }
}
