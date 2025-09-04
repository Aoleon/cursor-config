/**
 * Utilitaires pour la gestion des dates importantes dans les dossiers d'AO
 */

/**
 * Calcule automatiquement la date de remise à J-15 de la date limite
 * @param dateLimiteRemise - Date limite de remise de l'AO
 * @returns Date de remise calculée (J-15) ou undefined si la date limite est invalide
 */
export function calculerDateRemiseJ15(dateLimiteRemise: Date | string | null): Date | undefined {
  if (!dateLimiteRemise) return undefined;

  try {
    const dateLimite = typeof dateLimiteRemise === 'string' ? new Date(dateLimiteRemise) : dateLimiteRemise;
    
    if (isNaN(dateLimite.getTime())) {
      console.warn('[DateUtils] Date limite invalide:', dateLimiteRemise);
      return undefined;
    }

    // Calculer J-15 (15 jours avant la date limite)
    const dateRemise = new Date(dateLimite);
    dateRemise.setDate(dateRemise.getDate() - 15);

    console.log(`[DateUtils] Date limite: ${dateLimite.toLocaleDateString('fr-FR')}, Date remise calculée (J-15): ${dateRemise.toLocaleDateString('fr-FR')}`);
    
    return dateRemise;
  } catch (error) {
    console.error('[DateUtils] Erreur lors du calcul de la date de remise:', error);
    return undefined;
  }
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
    try {
      dates.dateLimiteRemise = typeof dateLimiteRemise === 'string' ? new Date(dateLimiteRemise) : dateLimiteRemise;
      
      // Calculer automatiquement la date de remise (J-15)
      dates.dateRemiseCalculee = calculerDateRemiseJ15(dates.dateLimiteRemise);
    } catch (error) {
      console.warn('[DateUtils] Erreur parsing date limite:', error);
    }
  }

  // Date de démarrage des travaux
  if (demarragePrevu) {
    try {
      dates.demarragePrevu = typeof demarragePrevu === 'string' ? new Date(demarragePrevu) : demarragePrevu;
    } catch (error) {
      console.warn('[DateUtils] Erreur parsing date démarrage:', error);
    }
  }

  // Date de livraison prévue
  if (dateLivraisonPrevue) {
    try {
      dates.dateLivraisonPrevue = typeof dateLivraisonPrevue === 'string' ? new Date(dateLivraisonPrevue) : dateLivraisonPrevue;
    } catch (error) {
      console.warn('[DateUtils] Erreur parsing date livraison:', error);
    }
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

  try {
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
  } catch (error) {
    console.warn('[DateUtils] Erreur formatage date:', error);
    return '';
  }
}

/**
 * Calcule le nombre de jours entre deux dates
 * @param dateDebut - Date de début
 * @param dateFin - Date de fin
 * @returns Nombre de jours ou null si une date est invalide
 */
export function calculerNombreJours(dateDebut?: Date | string | null, dateFin?: Date | string | null): number | null {
  if (!dateDebut || !dateFin) return null;

  try {
    const debut = typeof dateDebut === 'string' ? new Date(dateDebut) : dateDebut;
    const fin = typeof dateFin === 'string' ? new Date(dateFin) : dateFin;

    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return null;

    const diffTime = fin.getTime() - debut.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.warn('[DateUtils] Erreur calcul nombre de jours:', error);
    return null;
  }
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
}