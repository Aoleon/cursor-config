/**
 * RESPONSE BUILDER - Chatbot Response Construction
 * 
 * Extracted from ChatbotOrchestrationService to reduce file size.
 * Handles all response formatting and message generation.
 * 
 * Target LOC: ~400-500
 */

import type {
  ChatbotQueryResponse,
  ProposeActionResponse
} from "@shared/schema";
import { logger } from '../../utils/logger';

export interface ActionIntention {
  hasActionIntention: boolean;
  actionType: string;
  entity: string;
  operation: string;
  confidence: number;
}

export class ResponseBuilder {
  /**
   * Crée une réponse d'erreur standardisée
   */
  createErrorResponse(
    conversationId: string,
    query: string,
    errorType: string,
    message: string,
    userFriendlyMessage: string
  ): ChatbotQueryResponse {
    return {
      success: false,
      conversation_id: conversationId,
      query,
      explanation: "Désolé, je n'ai pas pu traiter votre demande.",
      suggestions: [
        "Essayez de reformuler votre question",
        "Vérifiez que vous avez les permissions nécessaires",
        "Contactez l'administrateur si le problème persiste"
      ],
      confidence: 0,
      execution_time_ms: 0,
      cache_hit: false,
      error: {
        type: errorType as 'rbac' | 'security' | 'timeout' | 'validation' | 'unknown',
        message,
        user_friendly_message: userFriendlyMessage
      }
    };
  }

  /**
   * Génère une explication pour les résultats
   */
  generateExplanation(query: string, results: unknown[], userRole: string): string {
    const resultCount = results.length;
    if (resultCount === 0) {
      return "Aucun résultat trouvé pour votre recherche. Vous pouvez essayer de reformuler votre question ou d'élargir vos critères.";
    }
    if (resultCount === 1) {
      return `J'ai trouvé 1 résultat correspondant à votre demande "${query}".`;
    }
    return `J'ai trouvé ${resultCount} résultats correspondant à votre demande "${query}". Les données sont triées par pertinence.`;
  }

  /**
   * Génère un message de remerciement pour le feedback
   */
  generateThankYouMessage(feedbackType: string, rating: number): string {
    if (rating >= 4) {
      return "Merci pour votre retour positif ! Nous continuons à améliorer le chatbot pour mieux vous servir.";
    }
    return "Merci pour votre retour. Nous prenons en compte vos suggestions pour améliorer l'expérience.";
  }

  /**
   * Génère un message d'erreur convivial pour l'utilisateur
   */
  generateUserFriendlyErrorMessage(errorType: string): string {
    switch (errorType) {
      case "rbac":
        return "Vous n'avez pas les permissions nécessaires pour accéder à ces données.";
      case "security":
        return "Votre requête contient des éléments non autorisés pour des raisons de sécurité.";
      case "timeout":
        return "Votre requête a pris trop de temps à s'exécuter. Essayez de la simplifier.";
      case "validation":
        return "Votre requête n'est pas dans un format valide. Pouvez-vous la reformuler ?";
      default:
        return "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support.";
    }
  }

  /**
   * Génère un résumé de conversation
   */
  generateConversationSummary(query: string, response: unknown, errorOccurred: boolean): string {
    if (errorOccurred) {
      return `Erreur lors du traitement de: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`;
    }
    return `Question: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`;
  }

  /**
   * Génère des suggestions d'amélioration basées sur le feedback
   */
  generateImprovementSuggestions(feedbackType: string, rating: number, categories?: string[]): string[] {
    const suggestions: string[] = [];
    if (rating <= 2) {
      suggestions.push("Améliorer la précision des réponses");
      suggestions.push("Réduire le temps de réponse");
    }
    if (feedbackType === "thumbs_down") {
      suggestions.push("Revoir la pertinence des suggestions");
      suggestions.push("Améliorer la compréhension du contexte");
    }
    if (categories?.includes("accuracy")) {
      suggestions.push("Enrichir la base de connaissances métier");
    }
    return suggestions;
  }

  /**
   * Crée une réponse spécialisée pour les propositions d'actions
   */
  createActionProposalResponse(
    conversationId: string,
    originalQuery: string,
    actionProposal: ProposeActionResponse,
    actionIntention: ActionIntention,
    userRole: string
  ): ChatbotQueryResponse {
    if (!actionProposal.success) {
      return this.createErrorResponse(
        conversationId,
        originalQuery,
        actionProposal.error?.type || "action_error",
        actionProposal.error?.message || "Erreur lors de la proposition d'action",
        this.generateActionErrorMessage(actionProposal.error?.type || "unknown")
      );
    }

    const explanation = this.generateActionExplanation(
      actionIntention,
      actionProposal,
      userRole
    );

    const suggestions = this.generateActionSuggestions(
      actionIntention.actionType,
      actionIntention.entity,
      userRole
    );

    return {
      success: true,
      conversation_id: conversationId,
      query: originalQuery,
      explanation,
      sql: undefined,
      suggestions,
      confidence: actionIntention.confidence,
      execution_time_ms: 0,
      model_used: "action_detection_engine",
      cache_hit: false,
      action_proposal: {
        action_id: actionProposal.actionId,
        confirmation_required: actionProposal.confirmationRequired,
        confirmation_id: actionProposal.confirmationId,
        risk_level: actionProposal.riskLevel,
        estimated_time: actionProposal.estimatedTime,
        warnings: actionProposal.warnings
      }
    };
  }

  /**
   * Génère une explication conversationnelle pour une action proposée
   */
  private generateActionExplanation(
    actionIntention: ActionIntention,
    actionProposal: ProposeActionResponse,
    userRole: string
  ): string {
    const { actionType, entity, operation } = actionIntention;
    let explanation = `🚀 **Action détectée** : ${this.getActionDisplayName(actionType)} sur ${this.getEntityDisplayName(entity)}\n\n`;
    explanation += `✅ **Opération** : ${this.getOperationDisplayName(operation)}\n`;
    explanation += `🔒 **Niveau de risque** : ${this.getRiskLevelDisplay(actionProposal.riskLevel)}\n`;
    
    if (actionProposal.confirmationRequired) {
      explanation += `⚠️ **Confirmation requise** : Cette action nécessite votre validation avant exécution\n`;
    }
    
    if (actionProposal.warnings && actionProposal.warnings.length > 0) {
      explanation += `\n📋 **Avertissements** :\n`;
      actionProposal.warnings.forEach(warning => {
        explanation += `• ${warning}\n`;
      });
    }
    
    if (actionProposal.estimatedTime) {
      explanation += `\n⏱️ **Temps d'exécution estimé** : ${actionProposal.estimatedTime} seconde(s)\n`;
    }
    
    explanation += `\n${actionProposal.confirmationRequired ? 
      '💡 **Prochaines étapes** : Confirmez cette action pour procéder à son exécution.' : 
      '💡 **Prochaines étapes** : Action prête à être exécutée automatiquement.'
    }`;
    
    return explanation;
  }

  /**
   * Génère des suggestions contextuelles pour les actions
   */
  private generateActionSuggestions(
    actionType: string,
    entity: string,
    userRole: string
  ): string[] {
    const suggestions: string[] = [];
    
    switch (actionType) {
      case 'create':
        suggestions.push(`Afficher les ${entity}s récemment créé(e)s`);
        suggestions.push(`Lister les templates pour ${entity}`);
        break;
      case 'update':
        suggestions.push(`Voir l'historique des modifications de ${entity}`);
        suggestions.push(`Afficher les ${entity}s avec le même statut`);
        break;
      case 'delete':
        suggestions.push(`Voir les ${entity}s archivé(e)s`);
        suggestions.push(`Récupérer les ${entity}s supprimé(e)s récemment`);
        break;
      case 'business_action':
        suggestions.push(`Afficher les processus métier disponibles`);
        suggestions.push(`Voir l'état des workflows en cours`);
        break;
    }
    
    if (userRole === 'chef_projet') {
      suggestions.push("Mes projets nécessitant une action");
      suggestions.push("Actions en attente dans mes projets");
    } else if (userRole === 'commercial') {
      suggestions.push("Offres nécessitant un suivi");
      suggestions.push("Actions commerciales recommandées");
    }
    
    return suggestions.slice(0, 4);
  }

  /**
   * Génère un message d'erreur adapté pour les actions
   */
  private generateActionErrorMessage(errorType: string): string {
    switch (errorType) {
      case "permission":
        return "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
      case "validation":
        return "Les paramètres de l'action ne sont pas valides. Veuillez vérifier votre requête.";
      case "business_rule":
        return "Cette action ne respecte pas les règles métier en vigueur.";
      case "security":
        return "Cette action a été bloquée pour des raisons de sécurité.";
      default:
        return "Une erreur inattendue s'est produite lors du traitement de votre action.";
    }
  }

  /**
   * Utilitaires d'affichage pour actions
   */
  private getActionDisplayName(actionType: string): string {
    const displayNames: Record<string, string> = {
      'create': 'Création',
      'update': 'Modification',
      'delete': 'Suppression',
      'business_action': 'Action métier'
    };
    return displayNames[actionType] || actionType;
  }

  private getEntityDisplayName(entity: string): string {
    const displayNames: Record<string, string> = {
      'offer': 'offre',
      'project': 'projet',
      'ao': 'appel d\'offre',
      'contact': 'contact',
      'task': 'tâche',
      'supplier': 'fournisseur',
      'milestone': 'jalon'
    };
    return displayNames[entity] || entity;
  }

  private getOperationDisplayName(operation: string): string {
    const displayNames: Record<string, string> = {
      'create_offer': 'Créer une nouvelle offre',
      'create_project': 'Créer un nouveau projet',
      'update_status': 'Mettre à jour le statut',
      'update_montant': 'Modifier le montant',
      'archive_offer': 'Archiver l\'offre',
      'transform_to_project': 'Transformer en projet',
      'create_project_task': 'Créer une tâche de projet'
    };
    return displayNames[operation] || operation.replace(/_/g, ' ');
  }

  private getRiskLevelDisplay(riskLevel: string): string {
    const displays: Record<string, string> = {
      'low': '🟢 Faible',
      'medium': '🟡 Modéré', 
      'high': '🔴 Élevé'
    };
    return displays[riskLevel] || riskLevel;
  }

  /**
   * Formate un nombre pour l'affichage
   */
  formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  }
}

