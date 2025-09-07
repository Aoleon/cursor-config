import { db } from "./db";
import { maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre } from "@shared/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import type { 
  MaitreOuvrage, 
  MaitreOeuvre, 
  ContactMaitreOeuvre,
  InsertMaitreOuvrage, 
  InsertMaitreOeuvre,
  InsertContactMaitreOeuvre
} from "@shared/schema";

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
 * Service de gestion intelligente des contacts pour l'OCR
 * Recherche et lie les contacts existants ou crée de nouveaux contacts automatiquement
 */
export class ContactService {
  
  /**
   * Recherche un maître d'ouvrage existant par similarité
   */
  private async findSimilarMaitreOuvrage(extractedData: ExtractedContactData): Promise<{ contact: MaitreOuvrage; confidence: number; reason: string } | null> {
    const candidates = await db.select().from(maitresOuvrage)
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
  private async findSimilarMaitreOeuvre(extractedData: ExtractedContactData): Promise<{ contact: MaitreOeuvre; confidence: number; reason: string } | null> {
    const candidates = await db.select().from(maitresOeuvre)
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
  private async createMaitreOuvrage(extractedData: ExtractedContactData): Promise<MaitreOuvrage> {
    const maitreOuvrageData: InsertMaitreOuvrage = {
      nom: extractedData.nom,
      typeOrganisation: extractedData.typeOrganisation || null,
      adresse: extractedData.adresse || null,
      codePostal: extractedData.codePostal || null,
      ville: extractedData.ville || null,
      departement: extractedData.departement as any || null,
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
    
    const [newMaitreOuvrage] = await db.insert(maitresOuvrage)
      .values(maitreOuvrageData)
      .returning();
    
    console.log(`[ContactService] Nouveau maître d'ouvrage créé: ${newMaitreOuvrage.nom} (ID: ${newMaitreOuvrage.id})`);
    return newMaitreOuvrage;
  }
  
  /**
   * Crée un nouveau maître d'œuvre
   */
  private async createMaitreOeuvre(extractedData: ExtractedContactData): Promise<MaitreOeuvre> {
    const maitreOeuvreData: InsertMaitreOeuvre = {
      nom: extractedData.nom,
      typeOrganisation: extractedData.typeOrganisation || null,
      adresse: extractedData.adresse || null,
      codePostal: extractedData.codePostal || null,
      ville: extractedData.ville || null,
      departement: extractedData.departement as any || null,
      telephone: extractedData.telephone || null,
      email: extractedData.email || null,
      siteWeb: extractedData.siteWeb || null,
      siret: extractedData.siret || null,
      specialites: extractedData.specialites || null,
      notes: `Créé automatiquement par OCR - Source: ${extractedData.source}`,
    };
    
    const [newMaitreOeuvre] = await db.insert(maitresOeuvre)
      .values(maitreOeuvreData)
      .returning();
    
    console.log(`[ContactService] Nouveau maître d'œuvre créé: ${newMaitreOeuvre.nom} (ID: ${newMaitreOeuvre.id})`);
    return newMaitreOeuvre;
  }
  
  /**
   * Recherche ou crée un contact selon les données extraites
   */
  async findOrCreateContact(extractedData: ExtractedContactData): Promise<ContactLinkResult> {
    try {
      if (extractedData.role === 'maitre_ouvrage') {
        // Rechercher un maître d'ouvrage existant
        const existingMatch = await this.findSimilarMaitreOuvrage(extractedData);
        
        if (existingMatch) {
          console.log(`[ContactService] Maître d'ouvrage trouvé: ${existingMatch.contact.nom} (confiance: ${Math.round(existingMatch.confidence * 100)}%)`);
          return {
            found: true,
            created: false,
            contact: existingMatch.contact,
            confidence: existingMatch.confidence,
            reason: `Correspondance trouvée: ${existingMatch.reason}`
          };
        }
        
        // Créer un nouveau maître d'ouvrage
        const newContact = await this.createMaitreOuvrage(extractedData);
        return {
          found: false,
          created: true,
          contact: newContact,
          confidence: 1.0,
          reason: 'Nouveau maître d\'ouvrage créé automatiquement'
        };
        
      } else if (extractedData.role === 'maitre_oeuvre') {
        // Rechercher un maître d'œuvre existant
        const existingMatch = await this.findSimilarMaitreOeuvre(extractedData);
        
        if (existingMatch) {
          console.log(`[ContactService] Maître d'œuvre trouvé: ${existingMatch.contact.nom} (confiance: ${Math.round(existingMatch.confidence * 100)}%)`);
          return {
            found: true,
            created: false,
            contact: existingMatch.contact,
            confidence: existingMatch.confidence,
            reason: `Correspondance trouvée: ${existingMatch.reason}`
          };
        }
        
        // Créer un nouveau maître d'œuvre
        const newContact = await this.createMaitreOeuvre(extractedData);
        return {
          found: false,
          created: true,
          contact: newContact,
          confidence: 1.0,
          reason: 'Nouveau maître d\'œuvre créé automatiquement'
        };
      }
      
      throw new Error(`Type de contact non supporté: ${extractedData.role}`);
      
    } catch (error) {
      console.error('[ContactService] Erreur lors de la recherche/création de contact:', error);
      throw error;
    }
  }
  
  /**
   * Traite une liste de contacts extraits et retourne les résultats de liaison
   */
  async processExtractedContacts(contactsData: ExtractedContactData[]): Promise<ContactLinkResult[]> {
    const results: ContactLinkResult[] = [];
    
    for (const contactData of contactsData) {
      try {
        const result = await this.findOrCreateContact(contactData);
        results.push(result);
      } catch (error) {
        console.error(`[ContactService] Erreur lors du traitement du contact ${contactData.nom}:`, error);
        // Continuer avec les autres contacts même en cas d'erreur
      }
    }
    
    return results;
  }
}

// Instance unique du service de contacts
export const contactService = new ContactService();