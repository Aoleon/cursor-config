export { BaseExtractor } from './BaseExtractor';
export type { IExtractor } from './BaseExtractor';
export { AOBaseExtractor } from './AOBaseExtractor';
export { LotExtractor } from './LotExtractor';
export { ContactExtractor } from './ContactExtractor';
export { AddressExtractor } from './AddressExtractor';
export { MasterEntityExtractor } from './MasterEntityExtractor';

// Import classes for singleton instances
import { LotExtractor } from './LotExtractor';
import { ContactExtractor } from './ContactExtractor';
import { MasterEntityExtractor } from './MasterEntityExtractor';
import { AddressExtractor } from './AddressExtractor';

// Export singleton instances for analysis endpoints
export const lotExtractor = new LotExtractor();
export const contactExtractor = new ContactExtractor();
export const masterEntityExtractor = new MasterEntityExtractor();
export const addressExtractor = new AddressExtractor();
