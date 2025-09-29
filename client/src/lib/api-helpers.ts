/**
 * API Helpers - Types et utilitaires pour améliorer la sécurité des types dans les réponses API
 * Conçu pour remplacer les `any` par des types stricts dans les useQuery
 */

// ========================================
// TYPES POUR LES RÉPONSES API COMMUNES
// ========================================

/**
 * Interface générique pour les réponses API standardisées
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    [key: string]: any;
  };
  error?: string;
  message?: string;
}

/**
 * Interface pour les réponses paginées
 */
export interface ApiPaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
}

/**
 * Interface pour les réponses d'erreur
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

// ========================================
// HELPERS POUR EXTRACTION DE DONNÉES
// ========================================

/**
 * Helper générique pour extraire data des réponses API
 * Remplace les `select: (response: any) => response?.data || []` 
 * par `select: selectData<TypeStruct>`
 * 
 * @param response - Réponse API brute
 * @returns Array typé des données ou array vide
 */
export const selectData = <T>(response: any): T[] => {
  // Gestion des cas où response peut être null/undefined
  if (!response) return [];
  
  // Si response.data est un array, on le retourne
  if (Array.isArray(response.data)) {
    return response.data as T[];
  }
  
  // Si response.data existe mais n'est pas un array, on le wrappe
  if (response.data !== undefined && response.data !== null) {
    return [response.data] as T[];
  }
  
  // Si response est directement un array (cas de certaines APIs)
  if (Array.isArray(response)) {
    return response as T[];
  }
  
  // Fallback: array vide
  return [];
};

/**
 * Helper pour extraire un objet unique des réponses API
 * Remplace les `select: (response: any) => response?.data`
 * par `select: selectItem<TypeStruct>`
 * 
 * @param response - Réponse API brute  
 * @returns Objet typé ou null
 */
export const selectItem = <T>(response: any): T | null => {
  if (!response) return null;
  
  // Si response.data existe, on le retourne
  if (response.data !== undefined && response.data !== null) {
    return response.data as T;
  }
  
  // Si response est directement l'objet (cas de certaines APIs)
  if (typeof response === 'object' && !Array.isArray(response) && response.success !== false) {
    return response as T;
  }
  
  return null;
};

/**
 * Helper pour extraire des métadonnées des réponses API
 * 
 * @param response - Réponse API brute
 * @returns Métadonnées ou objet vide
 */
export const selectMeta = (response: any): Record<string, any> => {
  return response?.meta || {};
};

/**
 * Helper pour vérifier si une réponse API est un succès
 * 
 * @param response - Réponse API brute
 * @returns true si succès, false sinon
 */
export const isApiSuccess = (response: any): response is ApiResponse<any> => {
  return response && response.success === true;
};

/**
 * Helper pour vérifier si une réponse API est une erreur
 * 
 * @param response - Réponse API brute
 * @returns true si erreur, false sinon
 */
export const isApiError = (response: any): response is ApiErrorResponse => {
  return response && response.success === false;
};

// ========================================
// TYPES RÉUTILISABLES POUR USEQUERY
// ========================================

/**
 * Type pour les options de select dans useQuery avec types stricts
 */
export type ApiSelectOptions<TData, TSelected = TData> = {
  select: (data: ApiResponse<TData>) => TSelected;
};

/**
 * Factory pour créer des selecteurs typés pour les listes
 */
export const createListSelector = <T>() => (response: any): T[] => selectData<T>(response);

/**
 * Factory pour créer des selecteurs typés pour les objets uniques  
 */
export const createItemSelector = <T>() => (response: any): T | null => selectItem<T>(response);

// ========================================
// UTILITAIRES POUR LA GESTION D'ERREURS API
// ========================================

/**
 * Helper pour extraire un message d'erreur lisible
 * 
 * @param error - Erreur d'API ou d'exception
 * @returns Message d'erreur formaté
 */
export const getErrorMessage = (error: any): string => {
  // Si c'est une ApiErrorResponse
  if (isApiError(error)) {
    return error.message || error.error || 'Erreur API inconnue';
  }
  
  // Si c'est une Error standard
  if (error instanceof Error) {
    return error.message;
  }
  
  // Si c'est un string
  if (typeof error === 'string') {
    return error;
  }
  
  // Si c'est un objet avec message
  if (error && typeof error === 'object' && error.message) {
    return error.message;
  }
  
  return 'Erreur inconnue';
};

/**
 * Helper pour formater les erreurs API en format standard
 * 
 * @param error - Erreur d'API
 * @returns Objet d'erreur formaté
 */
export const formatApiError = (error: any): ApiErrorResponse => {
  return {
    success: false,
    error: getErrorMessage(error),
    message: getErrorMessage(error),
    details: error,
    timestamp: new Date().toISOString()
  };
};

// ========================================
// HELPERS SPÉCIALISÉS POUR LE DOMAINE MÉTIER
// ========================================

/**
 * Helper spécialisé pour les offres - types stricts
 */
export const selectOffers = createListSelector<{
  id: string;
  reference: string;
  client: string;
  status: string;
  estimatedAmount: number;
  isPriority: boolean;
  responsibleUser?: {
    firstName: string;
    lastName: string;
  };
}>();

/**
 * Helper spécialisé pour les projets - types stricts
 */
export const selectProjects = createListSelector<{
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: string;
  endDate?: string;
}>();

/**
 * Helper spécialisé pour les utilisateurs - types stricts
 */
export const selectUsers = createListSelector<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}>();

/**
 * Helper spécialisé pour les milestones - types stricts
 */
export const selectMilestones = createListSelector<{
  id: string;
  offerId: string;
  milestoneType: string;
  title: string;
  status: string;
  expectedCompletionDate?: string;
  assignedUserId?: string;
}>();

/**
 * Helper spécialisé pour les charges BE - types stricts
 */
export const selectBeWorkload = createListSelector<{
  id: string;
  userId: string;
  userName: string;
  loadPercentage: string;
  assignedOffers: number;
  department: string;
}>();