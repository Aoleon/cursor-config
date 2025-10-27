import { storage } from '../server/storage-poc';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function monitorExtraction() {
  console.log(`\n${colors.bold}${colors.cyan}📊 Monitoring extraction Monday.com${colors.reset}\n`);

  const interval = setInterval(async () => {
    try {
      const allAOs = await storage.getAos();
      const completeAOs = allAOs.filter(ao => 
        ao.intituleOperation && 
        ao.intituleOperation.trim() !== '' &&
        ao.menuiserieType &&
        ao.source
      );

      const recentAOs = allAOs.filter(ao => {
        const createdAt = new Date(ao.createdAt);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return diffMinutes <= 60; // AOs créés dans la dernière heure
      });

      console.clear();
      console.log(`\n${colors.bold}${colors.cyan}📊 État de l'extraction${colors.reset}`);
      console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}\n`);
      console.log(`${colors.green}Total AOs en base:${colors.reset} ${allAOs.length}`);
      console.log(`${colors.green}AOs complets:${colors.reset} ${completeAOs.length} (${((completeAOs.length / allAOs.length) * 100).toFixed(1)}%)`);
      console.log(`${colors.yellow}Extraits récemment (60min):${colors.reset} ${recentAOs.length}`);
      
      if (recentAOs.length > 0) {
        const latestAO = recentAOs[recentAOs.length - 1];
        console.log(`${colors.cyan}\nDernier AO extrait:${colors.reset}`);
        console.log(`  Référence: ${latestAO.reference}`);
        console.log(`  Intitulé: ${latestAO.intituleOperation?.substring(0, 50)}...`);
        console.log(`  Date: ${new Date(latestAO.createdAt).toLocaleTimeString('fr-FR')}`);
      }

      console.log(`\n${colors.cyan}Mis à jour à: ${new Date().toLocaleTimeString('fr-FR')}${colors.reset}`);
      console.log(`${colors.yellow}Appuyez sur Ctrl+C pour arrêter le monitoring${colors.reset}\n`);

    } catch (error) {
      console.error('Erreur monitoring:', error);
    }
  }, 5000); // Rafraîchir toutes les 5 secondes

  // Garder le script actif
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log(`\n${colors.yellow}Monitoring arrêté${colors.reset}`);
    process.exit(0);
  });
}

monitorExtraction();
