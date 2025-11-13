import * as fs from 'fs';

const filePath = 'server/routes-poc.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix first logger.info
content = content.replace(
  /logger\.info\('Initialisation des règles métier menuiserie', \{ metadata: \{ context: 'app_startup'[\s\S]*?\}\);}/,
  `logger.info('Initialisation des règles métier menuiserie', {
    metadata: {
      context: 'app_startup'
    }
  });`
);

// Fix second logger.info
content = content.replace(
  /logger\.info\('Règles métier initialisées avec succès', \{ metadata: \{ context: 'app_startup'[\s\S]*?\}\);}/,
  `logger.info('Règles métier initialisées avec succès', {
    metadata: {
      context: 'app_startup'
    }
  });`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed logger.info calls in routes-poc.ts');

