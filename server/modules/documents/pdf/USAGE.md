# PDF Template Engine - Guide d'Utilisation

## Vue d'ensemble

Le système PDF Template Engine de Saxium offre une solution complète pour générer des PDF dynamiques avec support des placeholders, images, et optimisation de layout.

## Installation et Configuration

```typescript
import { PdfGeneratorService } from '@/services/pdfGeneratorService';
import { PDFTemplateEngine, createPDFEngine } from '@/modules/documents/pdf';
```

## Utilisation Basique

### 1. Génération d'un PDF LDM Simple

```typescript
// Préparer les données
const ldmData = {
  reference: 'LDM-2025-001',
  client: {
    name: 'Entreprise ABC',
    address: '123 Rue de la Paix, 75001 Paris',
    contact: 'Jean Dupont',
    email: 'jean.dupont@abc.fr',
    phone: '01 23 45 67 89'
  },
  project: {
    name: 'Rénovation Bureau',
    reference: 'PROJ-2025-042',
    location: 'Paris 8ème',
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-12-31')
  },
  items: [
    {
      reference: 'ART-001',
      designation: 'Bureau ergonomique',
      quantity: 10,
      unit: 'pièce',
      unitPrice: new Decimal(450),
      total: new Decimal(4500)
    }
  ],
  totals: {
    ht: new Decimal(4500),
    tva: new Decimal(900),
    ttc: new Decimal(5400)
  }
};

// Générer le PDF
const pdfResult = await PdfGeneratorService.generateLDMPdf(
  ldmData,
  'basic', // 'basic' | 'complex' | 'visual'
  {
    format: 'A4',
    orientation: 'portrait'
  }
);

// Sauvegarder ou envoyer le PDF
fs.writeFileSync('ldm.pdf', pdfResult.buffer);
```

### 2. Utilisation avec Template Personnalisé

```typescript
// Charger un template personnalisé
const customTemplate = {
  id: 'custom-ldm',
  name: 'Mon Template LDM',
  type: 'handlebars',
  content: `
    <!DOCTYPE html>
    <html>
      <head><title>[reference]</title></head>
      <body>
        <h1>Devis [reference]</h1>
        <p>Client: [client.name]</p>
        
        [if:has_discount]
          <p>Remise appliquée: [discount:currency]</p>
        [/if]
        
        <table>
          [foreach:items]
            <tr>
              <td>[item.designation]</td>
              <td>[item.quantity:number:0]</td>
              <td>[item.unitPrice:currency]</td>
            </tr>
          [/foreach]
        </table>
        
        <p>Total: [totals.ttc:currency]</p>
      </body>
    </html>
  `
};

// Générer avec le template personnalisé
const result = await PdfGeneratorService.generateFromTemplate(
  customTemplate,
  data,
  { format: 'A4' }
);
```

### 3. Intégration d'Images

```typescript
const dataWithImages = {
  ...ldmData,
  // Images depuis Object Storage
  featuredItems: [
    {
      designation: 'Chaise de bureau',
      image: 'chair-001', // Référence dans Object Storage
      unitPrice: new Decimal(250)
    }
  ],
  // Logo entreprise
  supplier: {
    name: 'Saxium',
    logo: 'saxium-logo'
  }
};

// Utiliser le template visuel avec images
const visualPdf = await PdfGeneratorService.generateLDMPdf(
  dataWithImages,
  'visual', // Template avec support images
  {
    format: 'A4',
    orientation: 'landscape'
  }
);
```

## Syntaxe des Placeholders

### Placeholders Basiques
- `[client_name]` - Valeur simple
- `[project.reference]` - Valeur imbriquée
- `[amount?0]` - Avec valeur par défaut

### Formatters
- `[amount:currency]` - Montant en euros
- `[date:date:dd/mm/yyyy]` - Date formatée
- `[quantity:number:2]` - Nombre avec décimales
- `[text:uppercase]` - Texte en majuscules
- `[text:lowercase]` - Texte en minuscules
- `[text:capitalize]` - Première lettre majuscule

### Conditions
```handlebars
[if:has_discount]
  Remise: [discount_amount:currency]
[else]
  Pas de remise
[/if]
```

### Boucles
```handlebars
[foreach:items]
  - [item.name] ([item.quantity] x [item.unitPrice:currency])
[/foreach]
```

### Images
- `[image pub logo]` - Image publique
- `[image product thumbnail]` - Miniature produit
- `[image private signature]` - Image privée

## API Avancée

### Validation de Template

```typescript
// Valider avant utilisation
const validation = await PdfGeneratorService.validateTemplate(customTemplate);

if (!validation.valid) {
  console.error('Erreurs de validation:', validation.errors);
  console.warn('Avertissements:', validation.warnings);
}
```

### Gestion du Cache

```typescript
// Obtenir les statistiques du cache
const stats = PdfGeneratorService.getTemplateCacheStats();
console.log(`Cache: ${stats.hits}/${stats.hits + stats.misses} hits`);

// Vider le cache
PdfGeneratorService.clearTemplateCache(); // Tout le cache
PdfGeneratorService.clearTemplateCache('template-id'); // Template spécifique
```

### Utilisation Directe du Template Engine

```typescript
import { PDFTemplateEngine, createPDFEngine } from '@/modules/documents/pdf';

// Créer une instance configurée
const engine = await createPDFEngine({
  cacheEnabled: true,
  cacheTTL: 3600,
  validationStrict: true,
  imageOptimization: true,
  layoutOptimization: true
});

// Compiler un template
const compiled = await engine.compileTemplate(template);

// Render avec contexte complet
const result = await engine.render({
  template: compiled,
  context: {
    data: myData,
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    helpers: {
      customHelper: (value) => value.toUpperCase()
    }
  },
  layout: {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: '2cm',
      bottom: '2cm',
      left: '1.5cm',
      right: '1.5cm'
    },
    grid: {
      enabled: true,
      columns: 12
    },
    optimization: {
      removeEmptyElements: true,
      optimizeImages: true
    }
  }
});
```

## Optimisation des Performances

### 1. Pré-compiler les Templates

```typescript
// Au démarrage de l'application
const engine = await createPDFEngine({
  preloadTemplates: true // Charge les templates LDM automatiquement
});
```

### 2. Utiliser le Cache

```typescript
// Les templates compilés sont automatiquement mis en cache
// Réutiliser les mêmes IDs de template pour bénéficier du cache
```

### 3. Optimiser les Images

```typescript
const imageOptions = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 85, // Pour JPEG
  fallback: '/assets/placeholder.png'
};

// Dans le template
`[image product thumbnail width=200 height=200 quality=85]`
```

## Gestion des Erreurs

```typescript
try {
  const pdf = await PdfGeneratorService.generateLDMPdf(data, 'complex');
} catch (error) {
  if (error instanceof TemplateError) {
    console.error('Erreur de template:', error.code, error.details);
  } else if (error instanceof PlaceholderError) {
    console.error('Placeholder manquant:', error.details);
  } else if (error instanceof ImageError) {
    console.error('Image non trouvée:', error.details);
  }
}
```

## Templates Disponibles

### 1. Basic LDM (`templates/ldm/basic-ldm.hbs`)
- Design simple et épuré
- Informations essentielles
- Format portrait A4

### 2. Complex LDM (`templates/ldm/complex-ldm.hbs`)
- Sections multiples
- Métriques et graphiques
- Timeline du projet
- Format portrait A4

### 3. Visual LDM (`templates/ldm/visual-ldm.hbs`)
- Galerie d'images produits
- Design moderne avec cards
- Support des échantillons matériaux
- Format paysage A4

## Exemples d'Intégration

### Route Express

```typescript
app.post('/api/pdf/generate-ldm', async (req, res) => {
  try {
    const { data, templateType = 'basic' } = req.body;
    
    // Valider les données
    const ldmData = createLDMData(data);
    
    // Générer le PDF
    const pdfResult = await PdfGeneratorService.generateLDMPdf(
      ldmData,
      templateType
    );
    
    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.filename}"`);
    res.send(pdfResult.buffer);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur génération PDF',
      details: error.message 
    });
  }
});
```

### Avec Upload vers Object Storage

```typescript
import { ObjectStorageService } from '@/objectStorage';

const objectStorage = new ObjectStorageService();

// Générer le PDF
const pdfResult = await PdfGeneratorService.generateLDMPdf(data, 'visual');

// Upload vers Object Storage
const uploadPath = `documents/ldm/${pdfResult.filename}`;
await objectStorage.putObject(uploadPath, pdfResult.buffer);

// Obtenir l'URL signée
const signedUrl = await objectStorage.getSignedUrl(uploadPath);
```

## Bonnes Pratiques

1. **Toujours valider les templates** avant utilisation en production
2. **Utiliser le cache** pour les templates fréquemment utilisés
3. **Optimiser les images** pour réduire la taille des PDF
4. **Gérer les erreurs** avec des fallbacks appropriés
5. **Tester les templates** avec différents jeux de données
6. **Documenter les placeholders** utilisés dans vos templates
7. **Versionner les templates** pour tracer les modifications

## Support et Débogage

```typescript
// Activer le mode debug
const engine = await createPDFEngine({
  debugMode: true,
  performanceTracking: true
});

// Obtenir les métadonnées de rendu
const result = await engine.render(options);
console.log('Métriques:', result.metadata);
// - renderTime: temps de rendu
// - placeholdersResolved: nombre de placeholders résolus
// - placeholdersMissing: placeholders manquants
// - imagesLoaded: images chargées avec succès
```

## Migration depuis l'Ancien Système

Si vous utilisez l'ancien système de génération PDF, voici comment migrer:

```typescript
// Ancien système
const pdf = await PdfGeneratorService.generateDpgfPdf(dpgfData);

// Nouveau système (plus flexible)
const pdf = await PdfGeneratorService.generateFromTemplate(
  'templates/ldm/basic-ldm.hbs',
  dpgfData
);
```

Le nouveau système est rétro-compatible et offre plus de fonctionnalités tout en préservant l'API existante.