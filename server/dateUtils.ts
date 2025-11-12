/**
 * Utilitaires pour la gestion des dates importantes dans les dossiers d'AO
 * Extension : Fonctions pour Analytics API - Phase 3.1.4
 */

import { subWeeks, subMonths, subYears } from 'date-fns';
import { formatDateFR } from './utils/shared-utils';
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

/**
 * Calcule automatiquement la date de remise à J-15 de la date limite
 * @param dateLimiteRemise - Date limite de remise de l'AO
 * @returns Date de remise calculée (J-15) ou undefined si la date limite est invalide
 */
export function calculerDateRemiseJ15(dateLimiteRemise: Date | string | null): Date | undefined {
  if (!dateLimiteRemise) return undefined;

  return withErrorHandling(
    async () => {

    const dateLimite = typeof dateLimiteRemise === 'string' ? new Date(dateLimiteRemise) : dateLimiteRemise;
    
    if (isNaN(dateLimite.getTime())) {
      logger.warn('DateUtils - Date limite invalide', { metadata: { dateLimiteRemise 

            });
      return undefined;
    }

    // Calculer J-15 (15 jours avant la date limite)
    const dateRemise = new Date(dateLimite);
    dateRemise.setDate(dateRemise.getDate() - 15);

    logger.debug('DateUtils - Date remise calculée', { metadata: { 
        dateLimite: dateLimite.formatDateFR(new Date()), 
        dateRemise: dateRemise.formatDateFR(new Date()) 
            }
 
            });
    
    return dateRemise;
  
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {}
    } );
}

/**
 * Calcule automatiquement la date limite de remise selon les règles métier JLM
 * Règle : Date de sortie AO + 30 jours par défaut (délai standard pour les appels d'offres publics)
 */
export function calculerDateLimiteRemiseAuto(dateSortieAO: Date | string | null, delaiJours: number = 30): Date | undefined {
  if (!dateSortieAO) return undefined;

  return withErrorHandling(
    async () => {

    const dateSortie = typeof dateSortieAO === 'string' ? new Date(dateSortieAO) : dateSortieAO;
    
    if (isNaN(dateSortie.getTime())) {
      logger.warn('DateUtils - Date de sortie AO invalide', { metadata: { dateSortieAO 

            });
      return undefined;
    }

    // Calculer la date limite : date de sortie + délai en jours
    const dateLimite = new Date(dateSortie);
    dateLimite.setDate(dateLimite.getDate() + delaiJours);

    logger.debug('DateUtils - Date limite calculée', { metadata: { 
        dateSortie: dateSortie.formatDateFR(new Date()), 
        dateLimite: dateLimite.formatDateFR(new Date()),
        delaiJours 
            }
 
            });
    
    return dateLimite;
  
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {}
    } );
}

/**
 * Structure des dates importantes d'un dossier
 */
export interface DatesImportantes {
  dateLimiteRemise?: Date; // Date limite de remise de l'AO (saisie ou extraite)
  dateRemiseCalculee?: Date; // Date de remise interne (J-15 automatique)
  dateSortieAO?: Date; // Date de sortie de l'AO
  demarragePrevu?: Date; // Date de démarrage des travaux (extraite par OCR)
  dateLivraisonPrevue?: Date; // Date de livraison (extraite par OCR)
  dateAcceptationAO?: Date; // Date d'acceptation de l'AO
}

/**
 * Calcule toutes les dates importantes d'un dossier à partir des données extraites
 * @param dateLimiteRemise - Date limite de remise
 * @param demarragePrevu - Date de démarrage extraite par OCR
 * @param dateLivraisonPrevue - Date de livraison extraite par OCR
 * @returns Objet avec toutes les dates importantes calculées
 */
export function calculerDatesImportantes(
  dateLimiteRemise?: string | Date | null,
  demarragePrevu?: string | Date | null,
  dateLivraisonPrevue?: string | Date | null
): DatesImportantes {
  const dates: DatesImportantes = {};

  // Date limite de remise
  if (dateLimiteRemise) {
    return withErrorHandling(
    async () => {

      dates.dateLimiteRemise = typeof dateLimiteRemise === 'string' ? new Date(dateLimiteRemise) : dateLimiteRemise;
      
      // Calculer automatiquement la date de remise (J-15)
      dates.dateRemiseCalculee = calculerDateRemiseJ15(dates.dateLimiteRemise);
    
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {
      });
  }

  // Date de démarrage des travaux
  if (demarragePrevu) {
    return withErrorHandling(
    async () => {

      dates.demarragePrevu = typeof demarragePrevu === 'string' ? new Date(demarragePrevu) : demarragePrevu;
    
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {
      });
  }

  // Date de livraison prévue
  if (dateLivraisonPrevue) {
    return withErrorHandling(
    async () => {

      dates.dateLivraisonPrevue = typeof dateLivraisonPrevue === 'string' ? new Date(dateLivraisonPrevue) : dateLivraisonPrevue;
    
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {
      });
  }

  return dates;
}

/**
 * Formate une date pour l'affichage en français
 * @param date - Date à formater
 * @param options - Options de formatage
 * @returns Date formatée ou chaîne vide si invalide
 */
export function formaterDateFR(date?: Date | string | null, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return '';

  return withErrorHandling(
    async () => {

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    return dateObj.toLocaleDateString('fr-FR', defaultOptions);
  
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {}
    } );
}

/**
 * Calcule le nombre de jours entre deux dates
 * @param dateDebut - Date de début
 * @param dateFin - Date de fin
 * @returns Nombre de jours ou null si une date est invalide
 */
export function calculerNombreJours(dateDebut?: Date | string | null, dateFin?: Date | string | null): number | null {
  if (!dateDebut || !dateFin) return null;

  return withErrorHandling(
    async () => {

    const debut = typeof dateDebut === 'string' ? new Date(dateDebut) : dateDebut;
    const fin = typeof dateFin === 'string' ? new Date(dateFin) : dateFin;

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return null;

    const diffTime = fin.getTime() - debut.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  
    },
    {
      operation: 'e',
      service: 'dateUtils',
      metadata: {
      });
}

/**
 * Vérifie si une date est dans le passé
 * @param date - Date à vérifier
 * @returns true si la date est passée, false sinon
 */
export function estDatePassee(date?: Date | string | null): boolean {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return false;

    return dateObj.getTime() < Date.now();
  } catch (error) {
    return false;
  }

/**
 * Vérifie si une date est urgente (dans les 7 prochains jours)
 * @param date - Date à vérifier
 * @returns true si la date est urgente, false sinon
 */
export function estDateUrgente(date?: Date | string | null): boolean {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return false;

    const maintenant = new Date();
    const dans7Jours = new Date(maintenant.getTime() + 7 * 24 * 60 * 60 * 1000);

    return dateObj.getTime() <= dans7Jours.getTime() && dateObj.getTime() >= maintenant.getTime();
  } catch (error) {
    return false;
  }

// ========================================
// FONCTIONS ANALYTICS DATE HELPERS - PHASE 3.1.4
// ========================================

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Parse une période textuelle vers un DateRange pour Analytics API
 * @param period - Période ('week', 'month', 'quarter', 'year')
 * @returns DateRange correspondant
 */
export function parsePeriod(period: string): DateRange {
  const now = new Date();
  switch (period) {
    case 'week':
      return {
        from: subWeeks(now, 1),
        to: now
      };
    case 'month':
      return {
        from: subMonths(now, 1),
        to: now
      };
    case 'quarter':
      return {
        from: subMonths(now, 3),
        to: now
      };
    case 'year':
      return {
        from: subYears(now, 1),
        to: now
      };
    default:
      return getDefaultPeriod();
  }

/**
 * Retourne la période par défaut pour les analytics (1 mois)
 * @returns DateRange pour le mois précédent
 */
export function getDefaultPeriod(): DateRange {
  const now = new Date();
  return {
    from: subMonths(now, 1),
    to: now
  };
}

/**
 * Retourne une période des N derniers mois
 * @param count - Nombre de mois à récupérer
 * @returns DateRange pour les N derniers mois
 */
export function getLastMonths(count: number): DateRange {
  const now = new Date();
  return {
    from: subMonths(now, count),
    to: now
  };
}