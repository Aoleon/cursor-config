import { test, expect } from '@playwright/test'

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display dashboard correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/JLM ERP/)
    
    // Vérifier la présence du header
    await expect(page.locator('[data-testid="header"]')).toBeVisible()
    
    // Vérifier la sidebar
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    
    // Vérifier le titre
    await expect(page.locator('h1')).toContainText('Tableau de Bord')
  })

  test('should navigate to offers page', async ({ page }) => {
    await page.click('text=Dossiers d\'Offre')
    await expect(page).toHaveURL('/offers')
    await expect(page.locator('h1')).toContainText('Dossiers d\'Offre')
  })

  test('should navigate to BE dashboard for authorized users', async ({ page }) => {
    // Simuler un utilisateur BE
    await page.goto('/be-dashboard')
    
    await expect(page).toHaveURL('/be-dashboard')
    await expect(page.locator('h1')).toContainText('Tableau de Bord BE')
  })

  test('should display stats cards', async ({ page }) => {
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    
    // Vérifier les métriques principales
    await expect(page.locator('text=Dossiers d\'Offre')).toBeVisible()
    await expect(page.locator('text=En Chiffrage')).toBeVisible()
    await expect(page.locator('text=En Validation')).toBeVisible()
  })

  test('should handle mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Vérifier que la navigation mobile fonctionne
    await expect(page.locator('.md\\:hidden')).toBeVisible()
    
    await page.click('text=Projets')
    await expect(page).toHaveURL('/projects')
  })

  test('should load offers table without create button', async ({ page }) => {
    await expect(page.locator('[data-testid="offers-table"]')).toBeVisible()
    
    // Sur le dashboard, le bouton de création ne doit pas être visible
    await expect(page.locator('button:has-text("Nouveau Dossier")')).not.toBeVisible()
  })
})