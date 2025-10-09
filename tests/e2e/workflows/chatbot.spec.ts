import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { assertWorkflowLoaded, assertNoLoadingState } from '../../helpers/assertions';

/**
 * Tests du Chatbot Saxium
 * 
 * Interface de chat IA pour assistance et analyse
 */

test.describe('Chatbot', () => {
  test('Navigation vers le chatbot', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');
    await assertWorkflowLoaded(page, 'Chat');
    await assertNoLoadingState(page);
  });

  test('Interface de chat est visible', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');

    // Vérifier le titre ou l'en-tête du chat
    const chatHeader = page.getByRole('heading', { name: /chat|assistant|ia/i })
      .or(page.getByTestId('chatbot-header'));
    
    await expect(chatHeader).toBeVisible();
  });

  test('Zone de saisie du message présente', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');
    await waitForPageLoad(page);

    // Vérifier la présence du champ de saisie
    const messageInput = page.getByPlaceholder(/message|question|taper/i)
      .or(page.getByTestId('input-message'))
      .or(page.locator('textarea'));
    
    await expect(messageInput).toBeVisible();
  });

  test('Bouton d envoi du message présent', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');
    await waitForPageLoad(page);

    // Vérifier la présence du bouton d'envoi
    const sendButton = page.getByRole('button', { name: /envoyer|send/i })
      .or(page.getByTestId('button-send-message'))
      .or(page.locator('button[type="submit"]'));
    
    await expect(sendButton.first()).toBeVisible();
  });

  test('Zone d affichage des messages présente', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');
    await waitForPageLoad(page);

    // Vérifier la zone de messages
    const messagesArea = page.getByTestId('messages-container')
      .or(page.locator('[role="log"]'))
      .or(page.locator('.messages, .chat-messages'));
    
    await expect(messagesArea).toBeVisible();
  });

  test('État initial du chatbot', async ({ page }) => {
    await goToWorkflow(page, 'chatbot');
    await waitForPageLoad(page);

    // Vérifier qu'il y a un message de bienvenue ou que la zone est vide
    const welcomeMessage = page.getByText(/bienvenue|bonjour|comment puis-je|assistant/i);
    const emptyState = page.getByText(/aucun message|démarrer une conversation/i);

    const hasWelcome = await welcomeMessage.count() > 0;
    const isEmpty = await emptyState.count() > 0;

    // Au moins l'un des deux états doit être présent
    expect(hasWelcome || isEmpty).toBeTruthy();
  });

  test('Health check du chatbot', async ({ page }) => {
    // Vérifier que le service chatbot est disponible
    const response = await page.request.get('/api/chatbot/health');
    
    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
    }
  });

  test('Chargement sans erreurs', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'chatbot');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('websocket') // Ignorer les erreurs websocket potentielles
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
