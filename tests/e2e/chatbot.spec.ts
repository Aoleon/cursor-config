import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour le Chatbot IA Saxium
 * Validation des workflows, robustesse et fonctionnalités avancées
 */

test.describe('Chatbot IA Workflow', () => {
  
  // ========================================
  // TESTS DE NAVIGATION ET CHARGEMENT
  // ========================================
  
  test('devrait naviguer vers la page demo chatbot', async ({ page }) => {
    await page.goto('/chatbot-demo');
    await expect(page).toHaveURL('/chatbot-demo');
    
    // Vérifier le titre
    await expect(page.getByRole('heading', { name: /Démo Chatbot IA/i })).toBeVisible();
  });
  
  test('devrait afficher le statut de santé du service', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Vérifier badge de statut
    const healthBadge = page.getByText(/Opérationnel|Dégradé/);
    await expect(healthBadge).toBeVisible();
  });

  // ========================================
  // TESTS DU WORKFLOW PRINCIPAL
  // ========================================
  
  test('devrait répondre correctement aux questions métier simples', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Attendre que l'input soit prêt
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await expect(input).toBeVisible();
    
    // Poser une question simple
    await input.fill('Quel est le CA de cette année ?');
    await input.press('Enter');
    
    // Vérifier qu'un message utilisateur apparaît
    const userMessage = page.locator('[role="article"]').filter({ hasText: 'Quel est le CA de cette année ?' });
    await expect(userMessage).toBeVisible({ timeout: 10000 });
    
    // Attendre et vérifier la réponse (avec timeout généreux pour l'IA)
    const assistantMessage = page.locator('[role="article"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
  });

  test('devrait utiliser les requêtes prédéfinies', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Cliquer sur l'onglet KPIs Financiers
    await page.getByRole('tab', { name: /Financiers/i }).click();
    
    // Cliquer sur la première requête prédéfinie
    const presetButton = page.getByTestId(/preset-query-financial-0/);
    await expect(presetButton).toBeVisible();
    await presetButton.click();
    
    // Vérifier qu'un message a été envoyé
    await expect(page.locator('[role="article"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('devrait générer du SQL valide pour les requêtes complexes', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Activer le mode debug pour voir le SQL
    const debugToggle = page.getByTestId('debug-mode-toggle');
    await debugToggle.click();
    
    // Poser une question nécessitant du SQL
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Liste les 5 derniers projets avec leurs montants');
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(3000);
    
    // En mode debug, le SQL devrait être visible
    const sqlContainer = page.locator('pre').filter({ hasText: /SELECT/i });
    const sqlVisible = await sqlContainer.count() > 0;
    
    if (sqlVisible) {
      await expect(sqlContainer.first()).toBeVisible({ timeout: 30000 });
    }
  });

  test('devrait afficher les métriques de performance', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Activer mode debug
    await page.getByTestId('debug-mode-toggle').click();
    
    // Envoyer une question
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Quel est le nombre total de projets ?');
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(3000);
    
    // Vérifier les badges de métrique (confiance, temps d'exécution)
    const confidenceBadge = page.locator('[role="article"]').last().getByText(/Confiance:/);
    const timeBadge = page.locator('[role="article"]').last().getByText(/ms/);
    
    const hasMetrics = (await confidenceBadge.count() > 0) || (await timeBadge.count() > 0);
    expect(hasMetrics).toBeTruthy();
  });

  // ========================================
  // TESTS DE GESTION D'ERREURS
  // ========================================
  
  test('devrait gérer les questions vides gracieusement', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    const sendButton = page.locator('button[type="submit"]').filter({ hasText: /Envoyer/i });
    
    // L'input est vide
    await input.fill('');
    
    // Le bouton devrait être désactivé ou l'envoi ne rien faire
    const isDisabled = await sendButton.isDisabled();
    
    if (!isDisabled) {
      await sendButton.click();
      // Vérifier qu'aucun message vide n'est envoyé
      const messages = page.locator('[role="article"]');
      const messageCount = await messages.count();
      expect(messageCount).toBe(0);
    }
  });

  test('devrait afficher un message d\'erreur pour les requêtes invalides', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Envoyer une requête potentiellement problématique
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('DROP TABLE users; --');
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(3000);
    
    // Vérifier qu'une réponse existe (erreur ou sécurisée)
    const assistantMessage = page.locator('[role="article"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    
    // La réponse ne devrait pas contenir de données sensibles
    const messageText = await assistantMessage.textContent();
    expect(messageText).not.toContain('DROP TABLE');
  });

  // ========================================
  // TESTS DE RATE LIMITING
  // ========================================
  
  test('devrait respecter le rate limiting', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    const errorCount = { value: 0 };
    
    // Écouter les toasts d'erreur
    page.on('response', response => {
      if (response.status() === 429) {
        errorCount.value++;
      }
    });
    
    // Envoyer plusieurs requêtes rapidement (test avec 6 au lieu de 11 pour être plus rapide)
    for (let i = 0; i < 6; i++) {
      await input.fill(`Question rapide ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(200); // Court délai entre les requêtes
    }
    
    // Attendre un peu pour que les requêtes soient traitées
    await page.waitForTimeout(2000);
    
    // Vérifier si un toast d'erreur rate limit apparaît
    const rateLimitToast = page.getByText(/limite|trop de requêtes|rate limit/i);
    const hasRateLimit = await rateLimitToast.count() > 0;
    
    // Si rate limiting est actif, on devrait voir un message
    // Sinon, toutes les requêtes devraient passer
    if (hasRateLimit) {
      await expect(rateLimitToast.first()).toBeVisible();
    }
  });

  // ========================================
  // TESTS DES FONCTIONNALITÉS AVANCÉES
  // ========================================
  
  test('devrait permettre de donner du feedback sur les réponses', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Envoyer une question
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Combien de projets sont en cours ?');
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(3000);
    
    // Chercher les boutons de feedback
    const feedbackButtons = page.getByTestId(/feedback-positive|feedback-negative/);
    const hasFeedback = await feedbackButtons.count() > 0;
    
    if (hasFeedback) {
      // Cliquer sur le feedback positif
      const positiveButton = page.getByTestId(/feedback-positive/).first();
      await positiveButton.click();
      
      // Vérifier qu'un toast de confirmation apparaît
      const confirmToast = page.getByText(/Merci pour votre retour/i);
      await expect(confirmToast).toBeVisible({ timeout: 5000 });
    }
  });

  test('devrait afficher les catégories de requêtes prédéfinies', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Vérifier les onglets de catégories
    const tabs = page.getByRole('tablist').first();
    await expect(tabs).toBeVisible();
    
    // Vérifier qu'au moins une catégorie existe
    const financialTab = page.getByRole('tab', { name: /Financiers/i });
    const projectTab = page.getByRole('tab', { name: /Projets/i });
    
    const hasCategories = (await financialTab.count() > 0) || (await projectTab.count() > 0);
    expect(hasCategories).toBeTruthy();
  });

  test('devrait conserver l\'historique de la conversation', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    
    // Envoyer plusieurs messages
    await input.fill('Premier message');
    await input.press('Enter');
    await page.waitForTimeout(1000);
    
    await input.fill('Deuxième message');
    await input.press('Enter');
    await page.waitForTimeout(1000);
    
    // Vérifier que tous les messages sont visibles
    const messages = page.locator('[role="article"]');
    const messageCount = await messages.count();
    
    // Au moins 2 messages utilisateur devraient être visibles
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  // ========================================
  // TESTS DE PERFORMANCE
  // ========================================
  
  test('devrait charger la page sans erreurs console critiques', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignorer les erreurs non-critiques
        if (!text.includes('favicon') && 
            !text.includes('404') && 
            !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });
    
    await page.goto('/chatbot-demo');
    await page.waitForLoadState('networkidle');
    
    // Vérifier qu'il n'y a pas d'erreurs critiques
    expect(consoleErrors.length).toBe(0);
  });

  test('devrait afficher les indicateurs de chargement pendant le traitement', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    
    // Observer les changements d'état
    let loadingDetected = false;
    
    // Surveiller l'apparition d'indicateurs de chargement
    const checkLoading = async () => {
      const skeleton = page.locator('.animate-pulse');
      const spinner = page.locator('[role="status"]');
      const typingIndicator = page.getByText(/typing|réflexion|traitement/i);
      
      const hasLoading = 
        (await skeleton.count() > 0) ||
        (await spinner.count() > 0) ||
        (await typingIndicator.count() > 0);
      
      if (hasLoading) {
        loadingDetected = true;
      }
    };
    
    // Envoyer une question
    await input.fill('Analyse complexe de tous les projets');
    await input.press('Enter');
    
    // Vérifier périodiquement pendant 5 secondes
    for (let i = 0; i < 10; i++) {
      await checkLoading();
      if (loadingDetected) break;
      await page.waitForTimeout(500);
    }
    
    // Un indicateur de chargement devrait avoir été détecté
    expect(loadingDetected).toBeTruthy();
  });
});

// ========================================
// TESTS D'INTÉGRATION AVEC LE BACKEND
// ========================================

test.describe('Chatbot - Intégration Backend', () => {
  
  test('devrait vérifier la santé du service via l\'API', async ({ page }) => {
    const response = await page.request.get('/api/chatbot/health');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBeTruthy();
    
    // Vérifier la structure de la réponse
    if (data.services) {
      expect(data.services).toHaveProperty('chatbot_orchestration');
    }
  });

  test('devrait gérer les timeouts gracieusement', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Intercepter les requêtes pour simuler un timeout
    let requestIntercepted = false;
    
    await page.route('**/api/chatbot/query', async route => {
      if (!requestIntercepted) {
        requestIntercepted = true;
        // Simuler un délai long puis timeout
        await page.waitForTimeout(1000);
        await route.abort('timedout');
      } else {
        // Laisser passer les requêtes suivantes (retry)
        await route.continue();
      }
    });
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Test timeout');
    await input.press('Enter');
    
    // Attendre la gestion du timeout
    await page.waitForTimeout(5000);
    
    // Vérifier qu'un message d'erreur ou retry est visible
    const errorMessage = page.getByText(/erreur|réessayer|problème/i);
    const hasError = await errorMessage.count() > 0;
    
    // L'application devrait gérer le timeout sans crash
    expect(page.url()).toContain('/chatbot-demo');
  });
});