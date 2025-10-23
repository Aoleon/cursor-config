import { BaseExtractor } from './BaseExtractor';
import type { SplitterContext } from '../types';
import type { InsertAo } from '@shared/schema';

/**
 * Extracteur de base pour les AOs Monday → Saxium
 * Utilise la configuration de mapping du board pour extraire tous les champs
 * Supporte : text, numbers, date, status, location, enum mappings, transformations
 */
export class AOBaseExtractor extends BaseExtractor<Partial<InsertAo>> {
  name = 'AOBaseExtractor';
  
  async extract(context: SplitterContext): Promise<Partial<InsertAo>> {
    const { mondayItem, config } = context;
    const baseMappings = config.mappings.base || [];
    
    const aoData: Partial<InsertAo> = {
      mondayItemId: mondayItem.id,
    };
    
    // Récupérer TOUS les mappings (base + metadata)
    const allMappings = [
      ...(config.mappings.base || []),
      ...(config.mappings.metadata || [])
    ];
    
    // Itérer sur tous les mappings de la configuration
    for (const mapping of allMappings) {
      try {
        const value = this.getColumnValue(context, mapping.mondayColumnId);
        const fieldName = mapping.saxiumField as keyof InsertAo;
        
        // Appliquer transformation selon type de colonne
        const transformedValue = this.transformValue(value, mapping, context);
        
        if (transformedValue !== null && transformedValue !== undefined) {
          // Traitement spécial pour timeline qui mappe vers 2 champs
          if ((transformedValue as any)._timeline) {
            if ((transformedValue as any).from) aoData.dateSortieAO = (transformedValue as any).from;
            if ((transformedValue as any).to) aoData.dateLimiteRemise = (transformedValue as any).to;
          } else {
            (aoData as any)[fieldName] = transformedValue;
          }
          
          this.addDiagnostic(context, 'info', 
            `Mapped ${mapping.mondayColumnId} → ${mapping.saxiumField}`, 
            { rawValue: value, transformedValue }
          );
        }
      } catch (error: any) {
        this.addDiagnostic(context, 'warning', 
          `Failed to map ${mapping.mondayColumnId} → ${mapping.saxiumField}`, 
          { error: error.message }
        );
      }
    }
    
    // Fallback: intitulé depuis item.name si absent
    if (!aoData.intituleOperation) {
      aoData.intituleOperation = mondayItem.name || `AO sans nom (${mondayItem.id})`;
      this.addDiagnostic(context, 'info', 'intituleOperation fallback to item.name', {});
    }
    
    // Appliquer valeurs par défaut
    if (!aoData.source) aoData.source = 'other' as any;
    if (!aoData.menuiserieType) aoData.menuiserieType = 'autre' as any;
    if (!aoData.status) aoData.status = 'etude' as any;
    
    // Validation champs requis basiques
    const requiredFields = ['intituleOperation', 'menuiserieType', 'source'];
    const missingFields = this.validateRequiredFields(aoData, requiredFields);
    
    if (missingFields.length > 0) {
      this.addDiagnostic(context, 'warning', 
        `Missing required fields: ${missingFields.join(', ')}`, 
        { missingFields }
      );
    }
    
    // Marquer comme brouillon si champs importants manquants
    const importantFields = ['client', 'montantEstime', 'dateLimiteRemise'];
    const missingImportant = this.validateRequiredFields(aoData, importantFields);
    
    if (missingImportant.length > 0) {
      aoData.isDraft = true;
      this.addDiagnostic(context, 'info', 
        `Marked as draft due to missing fields: ${missingImportant.join(', ')}`, 
        { missingImportant }
      );
    }
    
    return aoData;
  }
  
  /**
   * Transforme une valeur brute Monday selon le type de mapping
   */
  private transformValue(value: any, mapping: any, context: SplitterContext): any {
    if (value === null || value === undefined || value === '') return null;
    
    const type = mapping.type;
    
    // TEXT - Simple texte
    if (type === 'text') {
      return String(value);
    }
    
    // NUMBERS - Nombre → decimal ou integer
    if (type === 'numbers') {
      let parsed = parseFloat(value);
      if (isNaN(parsed)) return null;
      
      // Transformation personnalisée : hoursTodays
      if (mapping.transform === 'hoursTodays') {
        parsed = Math.ceil(parsed / 8); // 8h = 1 jour
      }
      
      // Decimal pour montants (retourner string pour Drizzle)
      if (mapping.saxiumField === 'montantEstime' || mapping.saxiumField === 'prorataEventuel') {
        return parsed.toString();
      }
      
      return parsed;
    }
    
    // DATE - Date simple
    if (type === 'date') {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date;
      } catch {
        return null;
      }
    }
    
    // TIMELINE - Plage de dates {from, to}
    // Note: timeline est géré différemment car il mappe vers 2 champs
    // On retourne un objet spécial {from, to} et on le traite dans extract()
    if (type === 'timeline') {
      if (value?.from || value?.to) {
        return {
          _timeline: true,
          from: value.from ? new Date(value.from) : null,
          to: value.to ? new Date(value.to) : null
        };
      }
      return null;
    }
    
    // STATUS / DROPDOWN - Enum mapping
    if (type === 'status' || type === 'dropdown') {
      // Extraire la valeur string depuis un objet Monday si nécessaire
      let textValue: string;
      if (typeof value === 'object' && value !== null) {
        // Objet Monday brut : {text: "...", value: "..."} ou parsed : {label: "..."}
        textValue = value.text || value.label || value.index || String(value);
      } else {
        textValue = String(value);
      }
      
      // Enum mapping configuré
      if (mapping.enumMapping && mapping.enumMapping[textValue]) {
        return mapping.enumMapping[textValue];
      }
      
      // Transformation spéciale: booleanFromStatus
      if (mapping.transform === 'booleanFromStatus') {
        return mapping.trueValues?.includes(textValue) || false;
      }
      
      // Transformation: arrayWrap (pour tags)
      if (mapping.transform === 'arrayWrap') {
        return [textValue];
      }
      
      // Fallback: lowercase + underscores
      return textValue.toLowerCase().replace(/\s+/g, '_');
    }
    
    // LOCATION - {lat, lng, address, city, country}
    if (type === 'location') {
      if (typeof value === 'object') {
        // Extraction dérivée de city et departement
        const extractedCity = value.city || value.address?.split(',')[0]?.trim();
        const codePostalMatch = value.address?.match(/\b(\d{2})\d{3}\b/);
        const extractedDept = codePostalMatch ? codePostalMatch[1] : null;
        
        // Stocker city et departement directement dans aoData via le contexte
        // (ces champs ne sont pas directement mappés mais dérivés de location)
        const aoData = context.extractedData.baseAO || {};
        if (extractedCity) aoData.city = extractedCity;
        if (extractedDept) aoData.departement = extractedDept;
        context.extractedData.baseAO = aoData;
        
        // Retourner adresse complète pour le champ location
        return value.address || value.city || null;
      }
      return String(value);
    }
    
    // PHONE - Téléphone {phone, countryShortName}
    if (type === 'phone') {
      if (typeof value === 'object' && value.phone) {
        return value.phone;
      }
      return String(value);
    }
    
    // EMAIL - Email {email, text}
    if (type === 'email') {
      if (typeof value === 'object' && value.email) {
        return value.email;
      }
      if (typeof value === 'object' && value.text) {
        return value.text;
      }
      return String(value);
    }
    
    // PEOPLE - Personnes (pour contactAO, extraire premier nom)
    if (type === 'people') {
      if (mapping.saxiumField === 'contactAO') {
        // Extraire nom de la première personne
        if (Array.isArray(value) && value.length > 0) {
          return value[0].name || value[0].email || null;
        }
        if (typeof value === 'object' && value.name) {
          return value.name;
        }
      }
      // Pour contacts multiples, géré par ContactExtractor
      return null;
    }
    
    // Fallback: retourner valeur brute
    return value;
  }
  
  /**
   * Valide la présence de champs requis
   */
  private validateRequiredFields(aoData: Partial<InsertAo>, requiredFields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      const value = (aoData as any)[field];
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    }
    
    return missing;
  }
}
