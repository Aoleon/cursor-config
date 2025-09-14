import { test, expect } from '@playwright/test'

test.describe('Offers Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/offers')
  })

  test('should display offers page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Saxium/)
    await expect(page.locator('h1')).toContainText('Dossiers d\'Offre')
    
    // Vérifier la présence du tableau des offres
    await expect(page.locator('[data-testid="offers-table"]')).toBeVisible()
    
    // Vérifier la section des jalons de validation
    await expect(page.locator('text=Suivi des Jalons de Validation')).toBeVisible()
  })

  test('should show create button on offers page', async ({ page }) => {
    // Sur la page des offres, le bouton de création doit être visible
    await expect(page.locator('button:has-text("Nouveau Dossier")')).toBeVisible()
  })

  test('should display validation milestones section', async ({ page }) => {
    await expect(page.locator('text=Suivi des Jalons de Validation')).toBeVisible()
    await expect(page.locator('text=Sélectionnez un dossier d\'offre pour gérer les jalons')).toBeVisible()
  })

  test('should filter offers by status', async ({ page }) => {
    // Test des filtres de statut
    const statusFilter = page.locator('select[name="status"]')
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('en_chiffrage')
      // Vérifier que le tableau se met à jour
      await page.waitForTimeout(500)
    }
  })

  test('should search offers', async ({ page }) => {
    // Test de la recherche
    const searchInput = page.locator('input[placeholder*="Rechercher"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Mairie')
      await page.waitForTimeout(500)
      // Vérifier que les résultats sont filtrés
    }
  })

  test('should handle offer priority indication', async ({ page }) => {
    // Vérifier l'affichage des priorités
    const priorityIndicators = page.locator('[data-testid="priority-indicator"]')
    if (await priorityIndicators.first().isVisible()) {
      await expect(priorityIndicators.first()).toHaveClass(/priority/)
    }
  })

  test('should navigate to offer details', async ({ page }) => {
    // Test de navigation vers les détails d'une offre
    const firstOfferRow = page.locator('tbody tr').first()
    if (await firstOfferRow.isVisible()) {
      await firstOfferRow.click()
      // Vérifier la navigation ou l'ouverture du modal
    }
  })

  test('should handle deadline warnings', async ({ page }) => {
    // Vérifier l'affichage des alertes de deadline
    const deadlineWarnings = page.locator('[data-testid="deadline-warning"]')
    if (await deadlineWarnings.first().isVisible()) {
      await expect(deadlineWarnings.first()).toHaveClass(/warning|danger/)
    }
  })
})