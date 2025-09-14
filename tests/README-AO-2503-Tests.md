# Guide Test Global AO 2503 - Saxium

## Objectif

Ce guide présente le test global basé sur l'AO 2503 (SCICV Boulogne Sandettie) qui sert de référence pour tester l'ensemble des fonctionnalités de Saxium au fur et à mesure de leur développement.

## Données de référence AO 2503

### Informations générales
- **Référence**: AO-2503-2161
- **Client**: JLM Menuiserie
- **Maître d'ouvrage**: SCICV Boulogne Sandettie
- **Projet**: Construction de 98 logements collectifs
- **Localisation**: 62200 Boulogne-sur-Mer, rue de Wissant
- **Montant total**: 280 000 € HT

### Dates importantes (testent le calcul automatique J-15)
- **Date limite de remise**: 14/03/2025 à 18h00
- **Date de rendu AO (calculée J-15)**: 27/02/2025
- **Démarrage prévu**: Juin 2025
- **Livraison prévue**: Décembre 2026 (18 mois de travaux)

### Lots techniques
1. **Lot 07.1 - Menuiseries extérieures**: 185 000 € HT
   - 45 fenêtres aluminium double vitrage (Façade Sud)
   - 32 fenêtres PVC double vitrage (Façade Nord)
   - 18 portes-fenêtres avec seuil PMR
   - 6 baies coulissantes triple vitrage
   - Performance: Uw ≤ 1,4 W/m².K, Rw ≥ 35 dB

2. **Lot 08 - Menuiserie intérieure**: 95 000 € HT
   - 196 portes intérieures stratifiées chêne clair
   - 98 blocs-portes d'entrée sécurisées
   - 24 portes techniques
   - 12 placards sur mesure
   - Performance: DnT,w ≥ 40 dB

## Tests disponibles

### 1. Test de configuration automatique
```bash
npx tsx scripts/setup-ao-2503.ts
```
Crée automatiquement l'AO 2503 avec toutes ses données en base.

### 2. Tests backend (unitaires)
```bash
npm test tests/backend/ao-2503-data-setup.test.ts
```
Teste la création, les calculs de dates, l'intégrité des données.

### 3. Tests E2E (Playwright)
```bash
npm run test:e2e -- tests/e2e/ao-2503-complete-workflow.spec.ts
```
Teste l'interface utilisateur complète avec le workflow AO 2503.

## Scénarios de test couverts

### ✅ Fonctionnalités actuellement testées

1. **Création AO avec données complètes**
   - Tous les champs remplis avec données réelles AO 2503
   - Validation des informations techniques
   - Contacts et intervenants

2. **Calcul automatique des dates importantes**
   - Date de rendu AO calculée à J-15 automatiquement
   - Vérification des alertes selon proximité des dates
   - Extraction OCR des dates de démarrage et livraison

3. **Gestion des lots techniques**
   - Ajout des 2 lots avec spécifications détaillées
   - Calcul automatique du montant total
   - Validation des performances thermiques et acoustiques

4. **Espace documentaire**
   - Création arborescence automatique
   - Upload de documents par catégorie
   - Vue compacte et vue détaillée
   - Navigation entre modes

5. **Validation BE enrichie**
   - Checklist par criticité (bloquant, majeur, mineur, info)
   - Réunions de validation avec participants
   - Traçabilité des validations

6. **Transformation AO → Offre**
   - Pré-remplissage automatique des données
   - Conservation des lots et montants
   - Génération arborescence documentaire offre

### 🔄 Fonctionnalités en développement (tests à compléter)

7. **Import OCR enrichi**
   - Extraction automatique des 35+ champs
   - Calcul automatique des dates importantes
   - Détection automatique des lots

8. **Synchronisation OneDrive**
   - Upload automatique des documents
   - Synchronisation bidirectionnelle
   - Gestion des conflits

9. **Génération DPGF automatique**
   - Création basée sur les lots chiffrés
   - Export PDF formaté
   - Intégration avec le chiffrage

10. **Suivi temps BE**
    - Pointage des heures par dossier
    - Calcul des coûts BE
    - Alertes sur dépassements

## Manuel de test utilisateur

### Étape 1: Configuration initiale
1. Lancer l'application: `npm run dev`
2. Créer l'AO 2503: `npx tsx scripts/setup-ao-2503.ts`
3. Accéder à l'interface: http://localhost:5000

### Étape 2: Test de l'interface
1. **Navigation**: Aller dans "Appels d'offres"
2. **Visualisation**: Chercher l'AO "AO-2503-2161"
3. **Détails**: Cliquer pour voir le détail complet
4. **Onglets**: Tester tous les onglets (Général, Lots, Documents, Validation BE)

### Étape 3: Test des dates importantes
1. **Tableau de bord**: Vérifier les alertes de dates
2. **Calcul J-15**: Confirmer que 27/02/2025 apparaît comme date de rendu
3. **Urgence**: Vérifier les badges colorés selon proximité

### Étape 4: Test transformation en offre
1. **Bouton**: Cliquer "Créer offre depuis cet AO"
2. **Pré-remplissage**: Vérifier que toutes les données sont reprises
3. **Complétion**: Ajouter description et heures estimées
4. **Validation**: Créer l'offre et vérifier l'arborescence

### Étape 5: Test validation BE
1. **Accès**: Onglet "Validation BE" de l'AO
2. **Checklist**: Tester les différents niveaux de criticité
3. **Réunion**: Créer une réunion de validation
4. **Finalisation**: Marquer la validation comme terminée

## Évolution du test

Ce test global sera enrichi progressivement avec:

- ✅ **Phase 1** (actuelle): Création, dates, lots, documents, validation BE
- 🔄 **Phase 2**: OCR enrichi, calculs automatiques avancés
- ⏳ **Phase 3**: Synchronisation OneDrive, DPGF automatique
- ⏳ **Phase 4**: Workflow complet AO → Offre → Projet → Planning
- ⏳ **Phase 5**: Intégrations externes, notifications, reporting

## Utilisation pour le développement

### Ajout d'une nouvelle fonctionnalité
1. Ajouter le test dans `ao-2503-complete-workflow.spec.ts`
2. Utiliser les données AO 2503 existantes
3. Tester l'intégration avec les fonctionnalités existantes
4. Mettre à jour ce README

### Debugging
1. Utiliser l'AO 2503 comme référence constante
2. Les données étant complètes, tous les cas de figure sont couverts
3. Facilite la reproduction des bugs

### Validation avant livraison
1. Exécuter tous les tests AO 2503
2. Vérifier le workflow complet en interface
3. Confirmer l'intégrité des données

---

**Note**: L'AO 2503 sert de "dossier de référence" pour tous les tests. Ses données étant représentatives d'un vrai projet JLM Menuiserie, il permet de valider l'ensemble des fonctionnalités dans un contexte réaliste.