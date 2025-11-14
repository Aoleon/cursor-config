import { db } from "./db";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre, contacts } from "@shared/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import type { 
  MaitreOuvrage, 
  MaitreOeuvre, 
  ContactMaitreOeuvre,
  InsertMaitreOuvrage, 
  InsertMaitreOeuvre,
  InsertContactMaitreOeuvre,
  Contact,
  InsertContact
} from "@shared/schema";
import { logger } from './utils/logger';
import type { NeonTransaction } from 'drizzle-orm/neon-serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type * as schema from '@shared/schema';

type DrizzleTransaction = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * Données extraites d'un contact par l'OCR enrichi
 */
export interface ExtractedContactData {
  // Informations générales
  nom: string;
  typeOrganisation?: string;
  
  // Adresse
  adresse?: string;
  codePostal?: string;
  ville?: string;
  departement?: string;
  
  // Contact
  telephone?: string;
  email?: string;
  siteWeb?: string;
  siret?: string;
  
  // Contact principal (pour maître d'ouvrage)
  contactPrincipalNom?: string;
  contactPrincipalPoste?: string;
  contactPrincipalTelephone?: string;
  contactPrincipalEmail?: string;
  
  // Pour maître d'œuvre
  specialites?: string;
  
  // Métadonnées
  role: 'maitre_ouvrage' | 'maitre_oeuvre';
  source: 'ocr_extraction';
}

/**
 * Résultat de la recherche/création de contact
 */
export interface ContactLinkResult {
  found: boolean;
  created: boolean;
  contact: MaitreOuvrage | MaitreOeuvre;
  confidence: number; // Score de confiance de la correspondance (0-1)
  reason: string; // Raison de la correspondance ou création
}

/**
 * Données contact individuel (table contacts)
 */
export interface IndividualContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  poste?: string; // Enum posteTypeEnum
  address?: string;
  notes?: string;
  source: 'ocr_extraction' | 'monday_import' | 'manual';
}

/**
 * Résultat find/create contact individuel
 */
export interface IndividualContactResult {
  found: boolean;
  created: boolean;
  contact: Contact; // Type depuis @shared/schema
  confidence: number;
  reason: string;
}

/**
 * Service de gestion intelligente des contacts pour l'OCR
 * Recherche et lie les contacts existants ou crée de nouveaux contacts automatiquement
 */
export class ContactService {
  
  /**
   * Recherche un maître d'ouvrage existant par similarité
   */
  private async findSimilarMaitreOuvrage(extractedData: ExtractedContactData, tx?: DrizzleTransaction): Promise<{ contact: MaitreOuvrage; confidence: number; reason: string } | null> {
    const dbInstance = tx || db;
    const candidates = await dbInstance.select().from(maitresOuvrage)
      .where(eq(maitresOuvrage.isActive, true));
    
    let bestMatch: { contact: MaitreOuvrage; confidence: number; reason: string } | null = null;
    
    for (const candidate of candidates) {
      const score = this.calculateSimilarityScore(extractedData, candidate, 'maitre_ouvrage');
      
      if (score.confidence > 0.8 && (!bestMatch || score.confidence > bestMatch.confidence)) {
        bestMatch = {
          contact: candidate,
          confidence: score.confidence,
          reason: score.reason
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Recherche un maître d'œuvre existant par similarité
   */
  private async findSimilarMaitreOeuvre(extractedData: ExtractedContactData, tx?: DrizzleTransaction): Promise<{ contact: MaitreOeuvre; confidence: number; reason: string } | null> {
    const dbInstance = tx || db;
    const candidates = await dbInstance.select().from(maitresOeuvre)
      .where(eq(maitresOeuvre.isActive, true));
    
    let bestMatch: { contact: MaitreOeuvre; confidence: number; reason: string } | null = null;
    
    for (const candidate of candidates) {
      const score = this.calculateSimilarityScore(extractedData, candidate, 'maitre_oeuvre');
      
      if (score.confidence > 0.8 && (!bestMatch || score.confidence > bestMatch.confidence)) {
        bestMatch = {
          contact: candidate,
          confidence: score.confidence,
          reason: score.reason
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calcule un score de similarité entre données extraites et contact existant
   */
  private calculateSimilarityScore(extracted: ExtractedContactData, existing: MaitreOuvrage | MaitreOeuvre, type: 'maitre_ouvrage' | 'maitre_oeuvre'): { confidence: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];
    
    // Correspondance exacte SIRET (score maximum)
    if (extracted.siret && existing.siret && extracted.siret === existing.siret) {
      score = 1.0;
      reasons.push(`SIRET identique: ${extracted.siret}`);
      return { confidence: score, reason: reasons.join(', ') };
    }
    
    // Correspondance nom (poids important)
    if (extracted.nom && existing.nom) {
      const nomSimilarity = this.calculateTextSimilarity(extracted.nom, existing.nom);
      if (nomSimilarity > 0.85) {
        score += 0.6;
        reasons.push(`Nom similaire (${Math.round(nomSimilarity * 100)}%)`);
      }
    }
    
    // Correspondance email
    if (extracted.email && existing.email && extracted.email.toLowerCase() === existing.email.toLowerCase()) {
      score += 0.3;
      reasons.push('Email identique');
    }
    
    // Correspondance téléphone
    if (extracted.telephone && existing.telephone) {
      const cleanPhone1 = this.cleanPhoneNumber(extracted.telephone);
      const cleanPhone2 = this.cleanPhoneNumber(existing.telephone);
      if (cleanPhone1 === cleanPhone2) {
        score += 0.2;
        reasons.push('Téléphone identique');
      }
    }
    
    // Correspondance adresse/ville
    if (extracted.ville && existing.ville) {
      const villeSimilarity = this.calculateTextSimilarity(extracted.ville, existing.ville);
      if (villeSimilarity > 0.9) {
        score += 0.1;
        reasons.push('Ville identique');
      }
    }
    
    return { 
      confidence: Math.min(score, 1.0), 
      reason: reasons.length > 0 ? reasons.join(', ') : 'Aucune correspondance significative'
    };
  }
  
  /**
   * Calcule la similarité entre deux chaînes de caractères
   */
  private calculateTextSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Calcul de la distance de Levenshtein normalisée
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Nettoie un numéro de téléphone pour la comparaison
   */
  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\.\(\)]/g, '').replace(/^(\+33|0033)/, '0');
  }
  
  /**
   * Crée un nouveau maître d'ouvrage
   */
  private async createMaitreOuvrage(extractedData: ExtractedContactData, tx?: DrizzleTransaction): Promise<MaitreOuvrage> {
    const dbInstance = tx || db;
    const maitreOuvrageData: InsertMaitreOuvrage = {
      nom: extractedData.nom,
      typeOrganisation: extractedData.typeOrganisation || null,
      adresse: extractedData.adresse || null,
      codePostal: extractedData.codePostal || null,
      ville: extractedData.ville || null,
      departement: (extractedData.departement && typeof extractedData.departement === 'string' && /^\d{2}$/.test(extractedData.departement)) 
        ? extractedData.departement as "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32" | "33" | "34" | "35" | "36" | "37" | "38" | "39" | "40" | "41" | "42" | "43" | "44" | "45" | "46" | "47" | "48" | "49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "57" | "58" | "59" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "68" | "69" | "70" | "71" | "72" | "73" | "74" | "75" | "76" | "77" | "78" | "79" | "80" | "81" | "82" | "83" | "84" | "85" | "86" | "87" | "88" | "89" | "90" | "91" | "92" | "93" | "94" | "95" | "971" | "972" | "973" | "974" | "976" | undefined
        : null,
      telephone: extractedData.telephone || null,
      email: extractedData.email || null,
      siteWeb: extractedData.siteWeb || null,
      siret: extractedData.siret || null,
      contactPrincipalNom: extractedData.contactPrincipalNom || null,
      contactPrincipalPoste: extractedData.contactPrincipalPoste || null,
      contactPrincipalTelephone: extractedData.contactPrincipalTelephone || null,
      contactPrincipalEmail: extractedData.contactPrincipalEmail || null,
      notes: `Créé automatiquement par OCR - Source: ${extractedData.source}`,
    };
    
    const [newMaitreOuvrage] = await dbInstance.insert(maitresOuvrage)
      .values(maitreOuvrageData)
      .returning();
    
    logger.info('Nouveau maître d\'ouvrage créé', {
      service: 'ContactService',
      metadata: {
        operation: 'createMaitreOuvrage',
        nom: newMaitreOuvrage.nom,
        id: newMaitreOuvrage.id,
        siret: newMaitreOuvrage.siret
              }

                                                                                  });
    
    return newMaitreOuvrage;
  }
  
  /**
   * Crée un nouveau maître d'œuvre
   */
  private async createMaitreOeuvre(extractedData: ExtractedContactData, tx?: DrizzleTransaction): Promise<MaitreOeuvre> {
    const dbInstance = tx || db;
    const maitreOeuvreData: InsertMaitreOeuvre = {
      nom: extractedData.nom,
      typeOrganisation: extractedData.typeOrganisation || null,
      adresse: extractedData.adresse || null,
      codePostal: extractedData.codePostal || null,
      ville: extractedData.ville || null,
      departement: (extractedData.departement && typeof extractedData.departement === 'string' && /^\d{2,3}$/.test(extractedData.departement)) 
        ? extractedData.departement as "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32" | "33" | "34" | "35" | "36" | "37" | "38" | "39" | "40" | "41" | "42" | "43" | "44" | "45" | "46" | "47" | "48" | "49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "57" | "58" | "59" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "68" | "69" | "70" | "71" | "72" | "73" | "74" | "75" | "76" | "77" | "78" | "79" | "80" | "81" | "82" | "83" | "84" | "85" | "86" | "87" | "88" | "89" | "90" | "91" | "92" | "93" | "94" | "95" | "971" | "972" | "973" | "974" | "976" | undefined
        : null,
      telephone: extractedData.telephone || null,
      email: extractedData.email || null,
      siteWeb: extractedData.siteWeb || null,
      siret: extractedData.siret || null,
      specialites: extractedData.specialites || null,
      notes: `Créé automatiquement par OCR - Source: ${extractedData.source}`,
    };
    
    const [newMaitreOeuvre] = await dbInstance.insert(maitresOeuvre)
      .values(maitreOeuvreData)
      .returning();
    
    logger.info('Nouveau maître d\'œuvre créé', {
      metadata: {
        module: 'ContactService',
        operation: 'createMaitreOeuvre',
        nom: newMaitreOeuvre.nom,
        id: newMaitreOeuvre.id,
        siret: newMaitreOeuvre.siret,
        specialites: newMaitreOeuvre.specialites
      }
    });
    
    return newMaitreOeuvre;
  }
  
  /**
   * Recherche ou crée un contact selon les données extraites
   */
  async findOrCreateContact(extractedData: ExtractedContactData, tx?: DrizzleTransaction): Promise<ContactLinkResult> {
    return withErrorHandling(
    async () => {

      if (extractedData.role === 'maitre_ouvrage') {
        // Rechercher un maître d'ouvrage existant
        const existingMatch = await this.findSimilarMaitreOuvrage(extractedData, tx);
        
        if (existingMatch) {
          logger.info('Maître d\'ouvrage trouvé', {
            service: 'ContactService',
            metadata: {
              operation: 'findOrCreateContact',
              role: 'maitre_ouvrage',
              nom: existingMatch.contact.nom,
              id: existingMatch.contact.id,
              confidence: Math.round(existingMatch.confidence * 100),
              reason: existingMatch.reason
            }
          });
          return {
            found: true,
            created: false,
            contact: existingMatch.contact,
            confidence: existingMatch.confidence,
            reason: existingMatch.reason
          };
        }
        
        // Créer un nouveau maître d'ouvrage
        const newContact = await this.createMaitreOuvrage(extractedData, tx);
        return {
          found: false,
          created: true,
          contact: newContact,
          confidence: 1.0,
          reason: 'Nouveau maître d\'ouvrage créé'
        };
      }
      
      if (extractedData.role === 'maitre_oeuvre') {
        // Rechercher un maître d'œuvre existant
        const existingMatch = await this.findSimilarMaitreOeuvre(extractedData, tx);
        
        if (existingMatch) {
          logger.info('Maître d\'œuvre trouvé', {
            service: 'ContactService',
            metadata: {
              operation: 'findOrCreateContact',
              role: 'maitre_oeuvre',
              nom: existingMatch.contact.nom,
              id: existingMatch.contact.id,
              confidence: Math.round(existingMatch.confidence * 100),
              reason: existingMatch.reason
            }
          });
          return {
            found: true,
            created: false,
            contact: existingMatch.contact,
            confidence: existingMatch.confidence,
            reason: existingMatch.reason
          };
        }
        
        // Créer un nouveau maître d'œuvre
        const newContact = await this.createMaitreOeuvre(extractedData, tx);
        return {
          found: false,
          created: true,
          contact: newContact,
          confidence: 1.0,
          reason: 'Nouveau maître d\'œuvre créé'
        };
      }
      
      throw new AppError(`Type de contact non supporté: ${extractedData.role}`, 500);
      
    
    },
    {
      operation: 'principal',
      service: 'contactService',
      metadata: {}
    });
  }
  
  /**
   * Traite une liste de contacts extraits et retourne les résultats de liaison
   */
  async processExtractedContacts(contactsData: ExtractedContactData[], tx?: DrizzleTransaction): Promise<ContactLinkResult[]> {
    const results: ContactLinkResult[] = [];
    
    for (const contactData of contactsData) {
      await withErrorHandling(
    async () => {

        const result = await this.findOrCreateContact(contactData, tx);
        results.push(result);
      
    },
    {
      operation: 'principal',
      service: 'contactService',
      metadata: {}
    });
    }
    
    return results;
  }
  
  /**
   * Recherche un contact individuel existant par similarité
   */
  private async findSimilarContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<{ contact: Contact; confidence: number; reason: string } | null> {
    const dbInstance = tx || db;
    const candidates = await dbInstance
      .select()
      .from(contacts)
      .where(eq(contacts.isActive, true));
    
    let bestMatch: { contact: Contact; confidence: number; reason: string } | null = null;
    
    for (const candidate of candidates) {
      const score = this.calculateIndividualContactSimilarity(data, candidate);
      
      if (score.confidence > 0.8 && (!bestMatch || score.confidence > bestMatch.confidence)) {
        bestMatch = {
          contact: candidate,
          confidence: score.confidence,
          reason: score.reason
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calcule similarité contact individuel
   */
  private calculateIndividualContactSimilarity(
    extracted: IndividualContactData,
    existing: Contact
  ): { confidence: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];
    
    // Email exact = confiance max (architecte recommande)
    if (extracted.email && existing.email && extracted.email.toLowerCase() === existing.email.toLowerCase()) {
      score = 1.0;
      reasons.push(`Email identique: ${extracted.email}`);
      return { confidence: score, reason: reasons.join(', ') };
    }
    
    // Prénom + Nom + Company (>= 0.85)
    if (extracted.firstName && extracted.lastName && existing.firstName && existing.lastName) {
      const firstNameSim = this.calculateTextSimilarity(extracted.firstName, existing.firstName);
      const lastNameSim = this.calculateTextSimilarity(extracted.lastName, existing.lastName);
      
      // Moyenne pondérée prénom/nom
      const nameSimilarity = (firstNameSim + lastNameSim) / 2;
      
      if (nameSimilarity > 0.85) {
        score += 0.6;
        reasons.push(`Nom similaire (${Math.round(nameSimilarity * 100)}%)`);
        
        // Company similaire renforce
        if (extracted.company && existing.company) {
          const companySim = this.calculateTextSimilarity(extracted.company, existing.company);
          if (companySim > 0.85) {
            score += 0.3;
            reasons.push(`Entreprise similaire (${Math.round(companySim * 100)}%)`);
          }
        }
      }
    }
    
    // Téléphone tie-breaker
    if (extracted.phone && existing.phone && score > 0.5) {
      const cleanPhone1 = this.cleanPhoneNumber(extracted.phone);
      const cleanPhone2 = this.cleanPhoneNumber(existing.phone);
      if (cleanPhone1 === cleanPhone2) {
        score += 0.2;
        reasons.push('Téléphone identique');
      }
    }
    
    return {
      confidence: Math.min(score, 1.0),
      reason: reasons.length > 0 ? reasons.join(', ') : 'Aucune correspondance significative'
    };
  }
  
  /**
   * Crée nouveau contact individuel
   */
  private async createContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<Contact> {
    const dbInstance = tx || db;
    
    const contactData: InsertContact = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      poste: (data.poste && typeof data.poste === 'string' && ['directeur', 'responsable', 'technicien', 'assistant', 'architecte', 'ingenieur', 'coordinateur', 'autre'].includes(data.poste))
        ? data.poste as "directeur" | "responsable" | "technicien" | "assistant" | "architecte" | "ingenieur" | "coordinateur" | "autre"
        : null,
      address: data.address || null,
      notes: data.notes || `Créé automatiquement - Source: ${data.source}`
    };
    
    const [newContact] = await dbInstance
      .insert(contacts)
      .values(contactData)
      .returning();
    
    logger.info('Nouveau contact individuel créé', {
      metadata: {
        module: 'ContactService',
        id: newContact.id,
        firstName: newContact.firstName,
        lastName: newContact.lastName,
        email: newContact.email,
        company: newContact.company
      }
    });
    
    return newContact;
  }
  
  /**
   * Recherche ou crée un contact individuel
   */
  async findOrCreateIndividualContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<IndividualContactResult> {
    return withErrorHandling(
    async () => {

      // Rechercher contact existant
      const existingMatch = await this.findSimilarContact(data, tx);
      
      if (existingMatch) {
        logger.info('Contact individuel trouvé', {
          metadata: {
            module: 'ContactService',
            id: existingMatch.contact.id,
            firstName: existingMatch.contact.firstName,
            lastName: existingMatch.contact.lastName,
            confidence: existingMatch.confidence,
            reason: existingMatch.reason
          }
        });
        
        return {
          found: true,
          created: false,
          contact: existingMatch.contact,
          confidence: existingMatch.confidence,
          reason: existingMatch.reason
        };
      }
      
      // Créer un nouveau contact
      const newContact = await this.createContact(data, tx);
      
      logger.info('Nouveau contact individuel créé', {
        metadata: {
          module: 'ContactService',
          id: newContact.id,
          firstName: newContact.firstName,
          lastName: newContact.lastName
        }
      });
      
      return {
        found: false,
        created: true,
        contact: newContact,
        confidence: 1.0,
        reason: 'Nouveau contact créé automatiquement'
      };
    },
    {
      operation: 'findOrCreateIndividualContact',
      service: 'contactService',
      metadata: {}
    });
  }
}