import { Router } from 'express'
import { storage } from '../storage'
import { validationMilestones, insertValidationMilestoneSchema } from '../../shared/schema'
import { z } from 'zod'
import { asyncHandler } from '../utils/error-handler'
import { logger } from '../utils/logger'

const router = Router()

// Obtenir les jalons de validation pour une offre
router.get('/:offerId', asyncHandler(async (req, res) => {
  const { offerId } = req.params
  
  logger.info('Fetching validation milestones', {
    metadata: {
      route: '/validation-milestones/:offerId',
      offerId
    }
  })
  
  const milestones = await storage.getValidationMilestones(offerId)
  res.json(milestones)
}))

// Initialiser les jalons pour une offre
router.post('/init', asyncHandler(async (req, res) => {
  const { offerId } = req.body
  
  if (!offerId) {
    return res.status(400).json({ message: 'offerId is required' })
  }

  logger.info('Initializing validation milestones', {
    metadata: {
      route: '/validation-milestones/init',
      offerId
    }
  })

  // Vérifier si les jalons existent déjà
  const existing = await storage.getValidationMilestones(offerId)
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Milestones already exist for this offer' })
  }

  // Créer les jalons par défaut pour le nouveau "Bouclage" (anciennement Validation BE)
  const milestoneTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages'] as const
  const createdMilestones = []

  for (const milestoneType of milestoneTypes) {
    const milestone = await storage.createValidationMilestone({
      offerId,
      milestoneType,
      isCompleted: false
    })
    createdMilestones.push(milestone)
  }

  logger.info('Validation milestones created', {
    metadata: {
      route: '/validation-milestones/init',
      offerId,
      count: createdMilestones.length
    }
  })

  res.status(201).json(createdMilestones)
}))

// Mettre à jour un jalon
router.patch('/:milestoneId', asyncHandler(async (req, res) => {
  const { milestoneId } = req.params
  const updateData = req.body

  // Validation des données
  const validatedData = insertValidationMilestoneSchema.partial().parse(updateData)

  // Si on complète le jalon, ajouter la date et l'utilisateur
  if (validatedData.isCompleted) {
    validatedData.completedAt = new Date()
    validatedData.completedBy = 'test-user-1' // En mode développement
  } else {
    // Si on décomplète, effacer les données de complétion
    validatedData.completedAt = undefined
    validatedData.completedBy = undefined
  }

  const updatedMilestone = await storage.updateValidationMilestone(milestoneId, validatedData)
  
  // CORRECTION WORKFLOW BOUCLAGE : Si un milestone bouclage est complété,
  // vérifier si tous les milestones bouclage sont terminés pour déclencher la progression
  if (validatedData.isCompleted && updatedMilestone.offerId) {
    const requiredBouclageTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages'] as const
    
    // Vérifier si c'est un milestone de bouclage
    if (requiredBouclageTypes.includes(updatedMilestone.milestoneType)) {
      logger.info('Milestone bouclage complété', {
        metadata: {
          workflow: 'bouclage',
          route: '/validation-milestones/:milestoneId',
          milestoneType: updatedMilestone.milestoneType,
          offerId: updatedMilestone.offerId
        }
      })
      
      try {
        // Récupérer tous les milestones de cette offre
        const allMilestones = await storage.getValidationMilestones(updatedMilestone.offerId)
        
        // Vérifier si tous les milestones bouclage sont complétés
        const bouclageComplete = requiredBouclageTypes.every(type => 
          allMilestones.some(m => m.milestoneType === type && m.isCompleted)
        )
        
        if (bouclageComplete) {
          logger.info('Bouclage complet détecté - Mise à jour automatique statut offre', {
            metadata: {
              workflow: 'bouclage',
              route: '/validation-milestones/:milestoneId',
              offerId: updatedMilestone.offerId
            }
          })
          
          await storage.updateOffer(updatedMilestone.offerId, {
            status: 'fin_etudes_validee',
            finEtudesValidatedAt: new Date(),
            finEtudesValidatedBy: 'test-user-1'
          })
          
          logger.info('Statut offre mis à jour', {
            metadata: {
              workflow: 'bouclage',
              route: '/validation-milestones/:milestoneId',
              offerId: updatedMilestone.offerId,
              newStatus: 'fin_etudes_validee'
            }
          })
        } else {
          const completedTypes = allMilestones.filter(m => requiredBouclageTypes.includes(m.milestoneType) && m.isCompleted).map(m => m.milestoneType)
          const pendingTypes = requiredBouclageTypes.filter(type => !completedTypes.includes(type))
          
          logger.info('Bouclage partiel', {
            metadata: {
              workflow: 'bouclage',
              route: '/validation-milestones/:milestoneId',
              offerId: updatedMilestone.offerId,
              completedTypes,
              pendingTypes
            }
          })
        }
      } catch (offerUpdateError) {
        logger.error('Erreur vérification bouclage complet', offerUpdateError as Error, {
          metadata: {
            workflow: 'bouclage',
            route: '/validation-milestones/:milestoneId',
            offerId: updatedMilestone.offerId
          }
        })
        // Ne pas faire échouer la requête si la vérification échoue
      }
    }
  }
  
  res.json(updatedMilestone)
}))

// Supprimer un jalon
router.delete('/:milestoneId', asyncHandler(async (req, res) => {
  const { milestoneId } = req.params
  
  logger.info('Deleting validation milestone', {
    metadata: {
      route: '/validation-milestones/:milestoneId',
      milestoneId
    }
  })
  
  await storage.deleteValidationMilestone(milestoneId)
  res.status(204).send()
}))

export default router
