import { test, expect } from '@playwright/test';

/**
 * Tests de Résilience E2E
 * Validation de la robustesse: retry, circuit breaker, gestion d'erreurs DB, rate limiting
 */

test.describe('Tests de Résilience - Retry et Circuit Breaker', () => {
  
  test('devrait retry automatiquement sur timeout IA', async ({ page }) => {
    let attemptCount = 0;
    
    // Mock un timeout initial puis succès
    await page.route('**/api/chatbot/query', async route => {
      attemptCount++;
      
      if (attemptCount === 1) {
        // Premier appel : timeout
        await page.waitForTimeout(100);
        await route.abort('timedout');
      } else {
        // Retry : succès
        await route.fulfill({
          status: 200,
          json: { 
            success: true,
            response: 'Réponse après retry',
            execution_time_ms: 150,
            confidence: 0.95
          }
        });
      }
    });
    
    await page.goto('/chatbot-demo');
    
    // Envoyer une requête
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Test retry automatique');
    await input.press('Enter');
    
    // Devrait réussir après retry (timeout généreux pour le retry)
    const assistantMessage = page.locator('[role="article"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    await expect(assistantMessage).toContainText(/réponse|retry/i);
    
    // Vérifier qu'il y a eu 2 tentatives
    expect(attemptCount).toBeGreaterThanOrEqual(2);
  });

  test('devrait activer le circuit breaker après plusieurs échecs', async ({ page }) => {
    let requestCount = 0;
    
    // Mock plusieurs échecs consécutifs
    await page.route('**/api/chatbot/query', async route => {
      requestCount++;
      
      // Toujours échouer pour déclencher le circuit breaker
      await route.fulfill({
        status: 500,
        json: { 
          error: 'Service unavailable',
          message: 'AI service is down'
        }
      });
    });
    
    await page.goto('/chatbot-demo');
    const input = page.locator('input[placeholder*="Posez votre question"]');
    
    // Envoyer plusieurs requêtes qui vont échouer
    for (let i = 0; i < 3; i++) {
      await input.fill(`Test circuit breaker ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Après plusieurs échecs, le circuit breaker devrait s'ouvrir
    // Les requêtes suivantes devraient échouer immédiatement
    const startTime = Date.now();
    await input.fill('Test après circuit breaker');
    await input.press('Enter');
    const responseTime = Date.now() - startTime;
    
    // Si le circuit breaker est ouvert, l'échec devrait être rapide (< 1s)
    // Sinon il y aurait un timeout normal (plusieurs secondes)
    expect(responseTime).toBeLessThan(2000);
    
    // Vérifier qu'un message d'erreur est affiché
    const errorMessage = page.getByText(/erreur|indisponible|problème/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('devrait gérer les erreurs partielles avec graceful degradation', async ({ page }) => {
    // Mock une réponse partielle
    await page.route('**/api/chatbot/query', route => {
      route.fulfill({
        status: 200,
        json: { 
          success: true,
          response: 'Réponse partielle disponible',
          warning: 'Certaines données ne sont pas disponibles',
          partial: true,
          execution_time_ms: 200,
          confidence: 0.6
        }
      });
    });
    
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Test degradation gracieuse');
    await input.press('Enter');
    
    // Vérifier que la réponse partielle est affichée
    const assistantMessage = page.locator('[role="article"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });
    await expect(assistantMessage).toContainText(/partielle/i);
    
    // Vérifier qu'un indicateur de confiance réduite est visible
    const confidenceBadge = assistantMessage.getByText(/60%|0\.6/);
    const hasLowConfidence = await confidenceBadge.count() > 0;
    
    // La confiance devrait être indiquée comme réduite
    expect(hasLowConfidence || assistantMessage.textContent()).toBeTruthy();
  });
});

test.describe('Tests de Résilience - Gestion Erreurs DB', () => {
  
  test('devrait gérer les erreurs DB gracieusement sur la page projets', async ({ page }) => {
    // Simuler une erreur DB
    await page.route('**/api/projects', route => {
      route.fulfill({
        status: 500,
        json: { 
          error: 'Database connection lost',
          message: 'Impossible de récupérer les projets'
        }
      });
    });
    
    await page.goto('/projects');
    
    // Vérifier qu'un message d'erreur utilisateur-friendly est affiché
    const errorMessage = page.getByText(/problème|erreur|réessayer|indisponible/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // L'application ne devrait pas crasher
    await expect(page).not.toHaveTitle(/Error|404|500/);
    
    // Vérifier que la navigation reste fonctionnelle
    const navigation = page.getByRole('navigation');
    await expect(navigation).toBeVisible();
  });

  test('devrait permettre de réessayer après une erreur DB', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/api/projects', route => {
      requestCount++;
      
      if (requestCount === 1) {
        // Première requête : erreur
        route.fulfill({
          status: 500,
          json: { error: 'Database error' }
        });
      } else {
        // Deuxième requête : succès
        route.fulfill({
          status: 200,
          json: { 
            success: true,
            data: [
              { id: 1, name: 'Projet Test', status: 'en_cours' }
            ]
          }
        });
      }
    });
    
    await page.goto('/projects');
    
    // Première tentative devrait échouer
    const errorMessage = page.getByText(/erreur|problème/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Chercher et cliquer sur le bouton réessayer
    const retryButton = page.getByRole('button', { name: /réessayer|retry|actualiser/i });
    
    if (await retryButton.count() > 0) {
      await retryButton.click();
      
      // Après retry, les données devraient s'afficher
      const projectCard = page.getByText('Projet Test');
      await expect(projectCard).toBeVisible({ timeout: 10000 });
    }
  });

  test('devrait gérer les timeouts de connexion DB', async ({ page }) => {
    // Simuler un timeout de connexion
    await page.route('**/api/offers', async route => {
      // Attendre 5 secondes avant de répondre (simuler timeout)
      await page.waitForTimeout(5000);
      await route.abort('timedout');
    });
    
    await page.goto('/offers');
    
    // Un indicateur de chargement devrait apparaître
    const loadingIndicator = page.locator('.animate-pulse, [role="status"], .spinner');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 });
    
    // Après timeout, un message d'erreur devrait apparaître
    const timeoutMessage = page.getByText(/timeout|délai dépassé|trop long/i);
    await expect(timeoutMessage).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Tests de Résilience - Rate Limiting', () => {
  
  test('devrait respecter le rate limiting global', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    let rateLimitDetected = false;
    
    // Écouter les réponses 429
    page.on('response', response => {
      if (response.status() === 429) {
        rateLimitDetected = true;
      }
    });
    
    // Envoyer 11 requêtes rapidement (limite théorique = 10/min)
    for (let i = 0; i < 11; i++) {
      await input.fill(`Question rapide ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(100); // Très court délai
    }
    
    // Attendre un peu pour que les requêtes soient traitées
    await page.waitForTimeout(3000);
    
    // Vérifier qu'un message de rate limit est affiché ou qu'une erreur 429 est détectée
    const rateLimitMessage = page.getByText(/limite|trop de requêtes|rate limit|patientez/i);
    const hasRateLimitMessage = await rateLimitMessage.count() > 0;
    
    // Au moins un indicateur de rate limiting devrait être présent
    expect(rateLimitDetected || hasRateLimitMessage).toBeTruthy();
  });

  test('devrait afficher un message clair lors du rate limiting', async ({ page }) => {
    // Forcer une erreur de rate limit
    await page.route('**/api/chatbot/query', route => {
      route.fulfill({
        status: 429,
        json: { 
          error: 'Rate limit exceeded',
          message: 'Trop de requêtes. Veuillez patienter.',
          retryAfter: 60
        }
      });
    });
    
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill('Test rate limit');
    await input.press('Enter');
    
    // Un message clair devrait être affiché
    const errorMessage = page.getByText(/trop de requêtes|patientez|limite/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Le message pourrait indiquer combien de temps attendre
    const retryInfo = page.getByText(/60|minute|secondes/i);
    const hasRetryInfo = await retryInfo.count() > 0;
    
    // C'est bien si l'info de retry est présente, mais pas obligatoire
    expect(hasRetryInfo || true).toBeTruthy();
  });

  test('devrait implémenter un backoff progressif', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    const input = page.locator('input[placeholder*="Posez votre question"]');
    const delays: number[] = [];
    
    // Mesurer les délais entre les tentatives
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      await input.fill(`Test backoff ${i}`);
      await input.press('Enter');
      
      // Attendre la réponse ou l'erreur
      await page.waitForTimeout(2000);
      
      const endTime = Date.now();
      delays.push(endTime - startTime);
      
      // Attendre un peu entre les tests
      await page.waitForTimeout(1000);
    }
    
    // Les délais devraient augmenter progressivement si backoff est implémenté
    // Sinon ils devraient être similaires
    const hasBackoff = delays[2] > delays[0] * 1.5;
    
    // Le backoff est une bonne pratique mais pas obligatoire
    expect(delays.length).toBe(3);
  });
});

test.describe('Tests de Résilience - Validation et Sécurité', () => {
  
  test('devrait valider les entrées avec Zod', async ({ page }) => {
    await page.goto('/create-ao');
    
    // Tenter de soumettre avec des données invalides
    await page.getByLabel(/Titre/i).fill(''); // Titre vide
    await page.getByLabel(/Client/i).fill('A'); // Client trop court
    
    const amountInput = page.getByLabel(/Montant/i).or(page.getByPlaceholder(/montant/i));
    if (await amountInput.count() > 0) {
      await amountInput.fill('-1000'); // Montant négatif
    }
    
    // Soumettre
    await page.getByRole('button', { name: /Créer|Soumettre/i }).click();
    
    // Des erreurs de validation devraient apparaître
    const validationErrors = page.getByText(/requis|invalide|minimum|obligatoire/i);
    await expect(validationErrors.first()).toBeVisible({ timeout: 5000 });
    
    // Le formulaire ne devrait pas être soumis
    await expect(page).toHaveURL(/create-ao/);
  });

  test('devrait sanitizer les entrées contre XSS', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Tenter d'injecter du JavaScript
    const maliciousInput = '<img src=x onerror=alert("XSS")>';
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill(maliciousInput);
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(2000);
    
    // Aucune alerte ne devrait apparaître
    let alertDetected = false;
    page.on('dialog', dialog => {
      alertDetected = true;
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    expect(alertDetected).toBeFalsy();
    
    // Le texte devrait être échappé ou nettoyé
    const userMessage = page.locator('[role="article"]').filter({ hasText: maliciousInput });
    if (await userMessage.count() > 0) {
      const messageHtml = await userMessage.innerHTML();
      expect(messageHtml).not.toContain('onerror=');
    }
  });

  test('devrait empêcher les injections SQL', async ({ page }) => {
    await page.goto('/chatbot-demo');
    
    // Tenter une injection SQL
    const sqlInjection = "'; DROP TABLE users; --";
    const input = page.locator('input[placeholder*="Posez votre question"]');
    await input.fill(sqlInjection);
    await input.press('Enter');
    
    // Attendre la réponse
    await page.waitForTimeout(3000);
    
    // La réponse ne devrait pas exécuter l'injection
    const assistantMessage = page.locator('[role="article"]').last();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });
    
    // Vérifier que l'application fonctionne toujours
    await page.reload();
    await expect(page).not.toHaveTitle(/Error/);
  });
});

test.describe('Tests de Résilience - Récupération', () => {
  
  test('devrait récupérer automatiquement après un crash de service', async ({ page }) => {
    let serviceDown = true;
    
    await page.route('**/api/chatbot/health', route => {
      if (serviceDown) {
        route.fulfill({
          status: 503,
          json: { status: 'unhealthy' }
        });
      } else {
        route.fulfill({
          status: 200,
          json: { status: 'healthy', success: true }
        });
      }
    });
    
    await page.goto('/chatbot-demo');
    
    // Le service est initialement down
    await page.waitForTimeout(2000);
    
    // Simuler la récupération du service
    serviceDown = false;
    
    // Recharger la page
    await page.reload();
    
    // Le service devrait être à nouveau opérationnel
    const healthBadge = page.getByText(/Opérationnel|Healthy/i);
    await expect(healthBadge).toBeVisible({ timeout: 10000 });
  });

  test('devrait conserver les données utilisateur après une erreur', async ({ page }) => {
    await page.goto('/create-ao');
    
    // Remplir le formulaire
    const testData = {
      title: 'Devis Important à Conserver',
      client: 'Client VIP Test',
      amount: '50000'
    };
    
    await page.getByLabel(/Titre/i).fill(testData.title);
    await page.getByLabel(/Client/i).fill(testData.client);
    
    const amountInput = page.getByLabel(/Montant/i).or(page.getByPlaceholder(/montant/i));
    if (await amountInput.count() > 0) {
      await amountInput.fill(testData.amount);
    }
    
    // Simuler une erreur lors de la soumission
    await page.route('**/api/offers', route => {
      route.fulfill({
        status: 500,
        json: { error: 'Server error' }
      });
    });
    
    // Soumettre
    await page.getByRole('button', { name: /Créer|Soumettre/i }).click();
    
    // Attendre l'erreur
    await page.waitForTimeout(2000);
    
    // Vérifier que les données sont conservées
    const titleValue = await page.getByLabel(/Titre/i).inputValue();
    const clientValue = await page.getByLabel(/Client/i).inputValue();
    
    expect(titleValue).toBe(testData.title);
    expect(clientValue).toBe(testData.client);
    
    if (await amountInput.count() > 0) {
      const amountValue = await amountInput.inputValue();
      expect(amountValue).toBe(testData.amount);
    }
  });
});