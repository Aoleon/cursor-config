import { Router } from 'express'
import { storage } from '../storage'
import { validationMilestones, insertValidationMilestoneSchema } from '../../shared/schema'
import { z } from 'zod'

const router = Router()

// Obtenir les jalons de validation pour une offre
router.get('/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params
    const milestones = await storage.getValidationMilestones(offerId)
    res.json(milestones)
  } catch (error) {
    console.error('Error fetching validation milestones:', error)
    res.status(500).json({ message: 'Failed to fetch validation milestones' })
  }
})

// Initialiser les jalons pour une offre
router.post('/init', async (req, res) => {
  try {
    const { offerId } = req.body
    
    if (!offerId) {
      return res.status(400).json({ message: 'offerId is required' })
    }

    // Vérifier si les jalons existent déjà
    const existing = await storage.getValidationMilestones(offerId)
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Milestones already exist for this offer' })
    }

    // Créer les jalons par défaut pour le nouveau "Bouclage" (anciennement Validation BE)
    const milestoneTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages']
    const createdMilestones = []

    for (const milestoneType of milestoneTypes) {
      const milestone = await storage.createValidationMilestone({
        offerId,
        milestoneType,
        isCompleted: false
      })
      createdMilestones.push(milestone)
    }

    res.status(201).json(createdMilestones)
  } catch (error) {
    console.error('Error creating validation milestones:', error)
    res.status(500).json({ message: 'Failed to create validation milestones' })
  }
})

// Mettre à jour un jalon
router.patch('/:milestoneId', async (req, res) => {
  try {
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
      const requiredBouclageTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages']
      
      // Vérifier si c'est un milestone de bouclage
      if (requiredBouclageTypes.includes(updatedMilestone.milestoneType)) {
        console.log(`[WORKFLOW] Milestone bouclage complété: ${updatedMilestone.milestoneType} pour offre ${updatedMilestone.offerId}`)
        
        try {
          // Récupérer tous les milestones de cette offre
          const allMilestones = await storage.getValidationMilestones(updatedMilestone.offerId)
          
          // Vérifier si tous les milestones bouclage sont complétés
          const bouclageComplete = requiredBouclageTypes.every(type => 
            allMilestones.some(m => m.milestoneType === type && m.isCompleted)
          )
          
          if (bouclageComplete) {
            console.log(`[WORKFLOW] ✅ Bouclage complet détecté - Mise à jour automatique statut offre ${updatedMilestone.offerId}`)
            
            await storage.updateOffer(updatedMilestone.offerId, {
              status: 'fin_etudes_validee',
              finEtudesValidatedAt: new Date(),
              finEtudesValidatedBy: 'test-user-1'
            })
            
            console.log(`[WORKFLOW] ✅ Statut offre mis à jour: fin_etudes_validee`)
          } else {
            const completedTypes = allMilestones.filter(m => requiredBouclageTypes.includes(m.milestoneType) && m.isCompleted).map(m => m.milestoneType)
            const pendingTypes = requiredBouclageTypes.filter(type => !completedTypes.includes(type))
            console.log(`[WORKFLOW] ⏳ Bouclage partiel - Complétés: [${completedTypes.join(', ')}], En attente: [${pendingTypes.join(', ')}]`)
          }
        } catch (offerUpdateError) {
          console.error('[WORKFLOW] ❌ Erreur vérification bouclage complet:', offerUpdateError)
          // Ne pas faire échouer la requête si la vérification échoue
        }
      }
    }
    
    res.json(updatedMilestone)
  } catch (error) {
    console.error('Error updating validation milestone:', error)
    res.status(500).json({ message: 'Failed to update validation milestone' })
  }
})

// Supprimer un jalon
router.delete('/:milestoneId', async (req, res) => {
  try {
    const { milestoneId } = req.params
    await storage.deleteValidationMilestone(milestoneId)
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting validation milestone:', error)
    res.status(500).json({ message: 'Failed to delete validation milestone' })
  }
})

export default router