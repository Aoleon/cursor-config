# Monday.com → Saxium - Matrice de Mapping Exhaustive

## Objectif
Cartographier **TOUTES** les colonnes Monday.com disponibles vers les champs de l'application Saxium (tables `aos`, `ao_lots`, `projects`, `contacts`, etc.).

## Méthodologie
1. **Analyse schéma Saxium** : 56 champs identifiés dans table `aos`
2. **Audit boards Monday** : Colonnes disponibles sur boards réels (AO Planning, JLM CHANTIERS, etc.)
3. **Mapping intelligent** : Correspondances Monday ↔ Saxium avec transformations

---

## 📊 STATUT MAPPING ACTUEL (AOBaseExtractor)

### ✅ CHAMPS DÉJÀ MAPPÉS (6/56)
| Champ Saxium | Type | Colonne Monday | Transformation |
|--------------|------|----------------|----------------|
| `mondayItemId` | varchar | `item.id` | Direct |
| `intituleOperation` | text | `item.name` | Direct |
| `montantEstime` | decimal | Mapping `estimatedAmount` | parseFloat() |
| `status` | enum | Mapping `status` | Enum conversion |
| `dateSortieAO` | timestamp | `timeline.from` | Date parsing |
| `dateLimiteRemise` | timestamp | `timeline.to` | Date parsing |

---

## 🚧 CHAMPS À MAPPER (50/56)

### PRIORITÉ 1 : Champs Critiques (Requis ou Hauts Valeur)

#### 1. Identité & Localisation
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `reference` | varchar | ✅ UNIQUE | Auto-généré | `AO-{boardId}-{itemId}` ou custom |
| `client` | varchar | Partiel | "Client" (text) | Direct |
| `clientName` | varchar | ❌ | "Client" (text) | Alias de `client` |
| `location` | varchar | Partiel | "Localisation" (location) | `city + departement` |
| `city` | varchar | ❌ | "Ville" (text) | Extraction de `location` |
| `departement` | departementEnum | Partiel | "Département" (dropdown) | Code postal → dépt |
| `specificLocation` | text | ❌ | "Quartier" (text) | Détails localisation |

#### 2. Menuiserie & Type (REQUIS)
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `menuiserieType` | enum | ✅ REQUIS | "Type menuiserie" (dropdown) | Enum mapping |
| `source` | enum | ✅ REQUIS | "Source AO" (dropdown) | Enum mapping ou default "other" |
| `typeMarche` | marcheTypeEnum | ❌ | "Type marché" (dropdown) | Enum mapping |

**Valeurs `menuiserieType`** : fenetre, porte, portail, volet, cloison, verriere, autre  
**Valeurs `source`** : mail, phone, website, partner, other

#### 3. Dates & Planning
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `dateRenduAO` | timestamp | ❌ | "Date rendu" (date) | Date parsing |
| `dateAcceptationAO` | timestamp | ❌ | "Date acceptation" (date) | Date parsing |
| `demarragePrevu` | timestamp | ❌ | "Démarrage prévu" (date) | Date parsing |
| `dateLivraisonPrevue` | timestamp | ❌ | "Livraison prévue" (date) | Date parsing |
| `dateOS` | timestamp | ❌ | "Date OS" (date) | Date parsing |
| `dueDate` | timestamp | ❌ | "Échéance" (date) | Alias `dateLimiteRemise` |
| `delaiContractuel` | integer | ❌ | "Délai (jours)" (numbers) | parseInt() |
| `estimatedDelay` | varchar | ❌ | "Délai estimé" (text) | Format "->01/10/25" |

#### 4. Montants & Budget
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `amountEstimate` | decimal | ❌ | "Montant estimé" (numbers) | Alias `montantEstime` |
| `prorataEventuel` | decimal | ❌ | "Prorata %" (numbers) | parseFloat() |

#### 5. Contacts Spécifiques AO
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `contactAONom` | varchar | ❌ | "Contact AO" (people) | Extraction people.name |
| `contactAOPoste` | varchar | ❌ | "Poste contact" (text) | Direct |
| `contactAOTelephone` | varchar | ❌ | "Tel contact" (phone) | Format normalisé |
| `contactAOEmail` | varchar | ❌ | "Email contact" (email) | Direct |

### PRIORITÉ 2 : Champs Métier Avancés

#### 6. Entités Techniques
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `bureauEtudes` | varchar | ❌ | "Bureau études" (text) | Direct |
| `bureauControle` | varchar | ❌ | "Bureau contrôle" (text) | Direct |
| `sps` | varchar | ❌ | "SPS" (text) | Direct |

#### 7. Documents & Description
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `description` | text | ❌ | "Description" (long_text) | Direct |
| `cctp` | text | ❌ | "CCTP" (long_text / files) | Extraction texte ou lien |

#### 8. Extensions Monday.com Phase 1
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `aoCategory` | enum | ❌ | "Catégorie AO" (dropdown) | Enum mapping |
| `operationalStatus` | enum | ❌ | "Statut opérationnel" (status) | Enum mapping |
| `priority` | priorityLevelEnum | ❌ | "Priorité" (dropdown) | Enum mapping |
| `tags` | varchar[] | ❌ | "Tags" (tags) | Array extraction |
| `projectSize` | varchar | ❌ | "Taille projet" (text) | "60 lgts", "85 lgts" |
| `clientRecurrency` | enum | ❌ | "Type client" (dropdown) | "Nouveau client", "Récurrent" |

### PRIORITÉ 3 : Champs Workflow & Métadonnées

#### 9. Sélection & Workflow
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `isSelected` | boolean | ❌ | "Sélectionné" (checkbox) | Boolean |
| `selectionComment` | text | ❌ | "Commentaire sélection" (long_text) | Direct |
| `isDraft` | boolean | ❌ | Calculé | Validation incomplet |

#### 10. Sync Monday ↔ Saxium (Export)
| Champ Saxium | Type | Requis? | Colonne Monday Suggérée | Transformation |
|--------------|------|---------|-------------------------|----------------|
| `mondayId` | varchar | ❌ | N/A (export uniquement) | ID item créé |
| `lastExportedAt` | timestamp | ❌ | N/A (système) | Auto |
| `mondaySyncStatus` | varchar | ❌ | N/A (système) | synced/error |
| `mondayConflictReason` | text | ❌ | N/A (système) | Error message |
| `mondayLastSyncedAt` | timestamp | ❌ | N/A (système) | Auto |

---

## 📋 TYPES DE COLONNES MONDAY.COM

### Colonnes Standards Détectées
| Type Monday | Description | Extraction |
|-------------|-------------|------------|
| `text` | Texte simple | `column_values[].text` |
| `numbers` | Nombres | `column_values[].text` → parseFloat() |
| `date` | Date simple | `column_values[].date` → new Date() |
| `timeline` | Plage de dates | `column_values[].value → {from, to}` |
| `status` | Label coloré | `column_values[].text` → enum |
| `dropdown` | Liste déroulante | `column_values[].text` → enum |
| `people` | Personnes | `column_values[].persons_and_teams` |
| `location` | Localisation | `column_values[].lat`, `lng`, `address` |
| `phone` | Téléphone | `column_values[].phone`, `countryShortName` |
| `email` | Email | `column_values[].email`, `text` |
| `tags` | Tags multiples | `column_values[].tag_ids` |
| `checkbox` | Booléen | `column_values[].checked` → true/false |
| `long_text` | Texte long | `column_values[].text` |
| `files` | Fichiers | `column_values[].files` → URLs |
| `link` | Liens | `column_values[].url`, `text` |
| `subitems` | Sous-éléments | `subitems[]` → lots |

---

## 🔄 STRATÉGIE D'IMPLÉMENTATION

### Phase 1 : Étendre AOBaseExtractor (CETTE TÂCHE)
1. **Ajouter mappings priorité 1** : client, location, menuiserieType, dates, montants
2. **Parsing intelligent** : location → city + departement, dates multiples
3. **Valeurs par défaut** : menuiserieType='autre', source='other' si absent
4. **Validation** : isDraft=true si champs requis manquants

### Phase 2 : Créer Extractors Spécialisés
1. **ContactExtractor** : Extraire contactAO* depuis people columns
2. **DocumentExtractor** : Extraire CCTP depuis files/long_text
3. **MetadataExtractor** : Tags, priority, operational status

### Phase 3 : Configuration Par Board
1. **Fichier config** : `server/services/monday/boardConfigs/ao-planning-3946257560.json`
2. **Mapping custom** : Colonnes spécifiques par board
3. **Fallbacks** : Colonnes génériques si custom absent

---

## 🎯 NEXT STEPS
1. ✅ Analyser board AO Planning (3946257560) pour voir colonnes réelles
2. ⏳ Créer fichier config mapping pour board AO Planning
3. ⏳ Étendre AOBaseExtractor avec mappings priorité 1
4. ⏳ Ajouter tests unitaires pour nouveaux mappings
5. ⏳ Valider avec import réel sur échantillon

---

**Dernière mise à jour** : 2025-10-23  
**Champs mappés** : 6/56 (10.7%)  
**Objectif Phase 1** : 30/56 (53%)  
**Board cible** : AO Planning (ID: 3946257560, 500+ items)
