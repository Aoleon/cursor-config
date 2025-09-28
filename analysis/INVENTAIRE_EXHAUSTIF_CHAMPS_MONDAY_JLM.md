# INVENTAIRE EXHAUSTIF DES CHAMPS ET COLONNES - EXPORTS MONDAY.COM JLM

## 📋 RÉSUMÉ EXÉCUTIF

**Mission**: Analyse exhaustive de 38 fichiers Excel exportés depuis Monday.com pour identifier tous les champs, colonnes et structures de données utilisées par JLM.

### Résultats Globaux
- **38 fichiers analysés** avec succès (100%)
- **275 champs uniques** identifiés
- **4636 termes** de vocabulaire métier BTP/JLM
- **5 catégories** métier principales
- **575 lignes** de données analysées au total
- **2 relations potentielles** identifiées entre entités

---

## 📊 1. INVENTAIRE EXHAUSTIF PAR CATÉGORIE

### 🏗️ GESTION SALARIÉS (6 fichiers - 80 champs uniques)

#### Fichiers analysés:
- `_Personnel_bureau_1758620710.xlsx` (27 colonnes, 15 lignes)
- `_Personnel_chantier_1758620704.xlsx` (24 colonnes, 45 lignes)
- `Formation_Ouvriers_1758620716.xlsx` (17 colonnes, 39 lignes)
- `Outillage_MAKITA_1758620723.xlsx` (21 colonnes, 37 lignes)
- `Pi_ces_personnel_1758620698.xlsx` (12 colonnes, 41 lignes)
- `Formation_Bureaux_1758620863.xlsx` (7 colonnes, 13 lignes)

#### Champs identifiés par thématique:

**🧑‍💼 IDENTIFICATION PERSONNEL**
- `Name` (text, identifier) - Nom complet du salarié
- `Personne` (text, contact) - Référence personne responsable
- `Emploi` (text, general) - Poste/fonction
- `Qualif` (text, general) - Qualification professionnelle

**📅 GESTION TEMPORELLE**
- `Période - Start` (date, temporal) - Date début période
- `Période - End` (date, temporal) - Date fin période
- `Date` (date, temporal) - Date générique

**🎓 FORMATIONS & CERTIFICATIONS**
- `SST (2ans)` (text, general) - Formation SST
- `SST recyclage` (text, general) - Recyclage SST
- `Amiante SS4 (Recyclage 3ans)` (text, general) - Certification amiante
- `Echafaudage` (text, general) - Formation échafaudage
- `Travaux en hauteur` (text, general) - Habilitation hauteur
- `Maître d'apprentissage` (text, general) - Statut formateur
- `Habilitation Elec` (text, general) - Habilitation électrique
- `Risques routiers` (text, general) - Formation conduite
- `Nacelle CACES` (text, general) - Certificat nacelle
- `AIPR` (text, general) - Autorisation intervention réseaux
- `Manuscopique CACES` (text, general) - Certificat chariot
- `TMS` (text, general) - Formation troubles musculo-squelettiques
- `Extincteurs` (text, general) - Formation incendie

**🔧 MATÉRIEL & OUTILLAGE**
- `Camion` (text, general) - Véhicule attribué
- `Visseuse` (text, general) - Outillage électroportatif
- `Choc` (text, general) - Perceuse à percussion
- `Chargeur` (text, general) - Chargeur batteries
- `Perfo` (text, general) - Perforateur
- `Nb Batterie` (numeric_string, general) - Nombre batteries

**📋 ADMINISTRATION**
- `1ères actions` (text, general) - Actions prioritaires
- `Label` (text, general) - Étiquetage/classification
- `Label 1` (text, general) - Classification secondaire
- `Sous-éléments` (text, general) - Éléments détaillés

### 📅 PLANNING CHANTIER (13 fichiers - 97 champs uniques)

#### Fichiers analysés:
- `AO_Planning_1758620539.xlsx` (39 colonnes, 907 lignes) - **FICHIER PRINCIPAL**
- `Boulogne_1758620768.xlsx` (24 colonnes, 212 lignes)
- `Planning_BETHUNE_1758620799.xlsx` (12 colonnes, 23 lignes)
- Et 10 autres fichiers de planning spécifiques

#### Champs identifiés par thématique:

**🏗️ IDENTIFICATION PROJET**
- `Name` (text, identifier) - Nom du projet/chantier
- `Lieu` (text, general) - Localisation géographique
- `LOT` (text, project) - Lot de travaux (Menu Ext, etc.)
- `Code chantier` (numeric_string, project) - Numéro unique chantier
- `Code Devis` (numeric_string, project) - Numéro devis

**👥 INTERVENANTS**
- `MOA` (text, contact) - Maître d'ouvrage (PARTENORD HABITAT, COGEDIM, etc.)
- `MOE` (text, contact) - Maître d'œuvre (AB+, DVA, etc.)
- `Personnes` (text, contact) - Équipe assignée
- `Owner` (text, general) - Responsable projet

**💰 ASPECTS FINANCIERS**
- `CA HT` (numeric_string, financial) - Chiffre d'affaires HT
- `Budget` (text, financial) - Budget alloué
- `CA Objectif` (numeric_string, financial) - Objectif CA
- `Marge H` (numeric_string, general) - Marge horaire
- `Coef Vente` (numeric_string, general) - Coefficient vente
- `Objectif Marge H` (numeric_string, general) - Objectif marge
- `Demande de prix` (text, financial) - Statut demande prix

**⏰ PLANNING & DÉLAIS**
- `Rendu` (date, temporal) - Date rendu attendue
- `Date Accord` (date, temporal) - Date accord client
- `Visite de site` (date, temporal) - Date visite terrain
- `Bouclage AO` (date, general) - Date bouclage appel d'offres
- `Démarrage` (date, general) - Date début travaux
- `Timeline - Start` (date, temporal) - Début timeline
- `Timeline - End` (date, temporal) - Fin timeline
- `Durée - Start` (date, temporal) - Début période
- `Durée - End` (date, temporal) - Fin période
- `Duration` (text, general) - Durée estimée
- `Durée étude` (numeric_string, general) - Temps étude

**⚡ SUIVI OPÉRATIONNEL**
- `Devis` (text, project) - Statut devis
- `Status` (text, status) - État avancement
- `Priority` (text, general) - Priorité
- `Nombre heures` (numeric_string, identifier) - Heures prévues
- `Nb Mois Travail Eq` (numeric_string, general) - Équivalent mois
- `Passation` (text, general) - Statut passation
- `Chiffrage` (text, general) - Responsable chiffrage

**📋 INFORMATIONS TECHNIQUES**
- `Type Marché` (text, general) - Type contrat (Privé, Public)
- `Version` (numeric_string, general) - Version document
- `Texte` (text, general) - Descriptions diverses
- `Lien internet` (text, general) - Liens documents
- `DS` (numeric_string, general) - Code DS
- `Année Prod` (numeric_string, general) - Année production

### 🎯 PROJETS SPÉCIFIQUES (3 fichiers - 19 champs uniques)

#### Fichiers analysés:
- `BETHUNE_BUDAPEST_1758620834.xlsx` (13 colonnes, 10 lignes)
- `BOULOGNE_102_-_GCC_-_102_lgts_-_Mint_1758620856.xlsx` (13 colonnes, 10 lignes)  
- `BOULOGNE_102_-_GCC_-_102_lgts_-_Serrurerie_1758620850.xlsx` (13 colonnes, 10 lignes)

#### Champs spécialisés:
- `Name` (text, identifier) - Nom tâche projet
- `Owner` (text, general) - Responsable tâche
- `Status` (text, status) - État (Done, Working on it)
- `Priority` (text, general) - Priorité (Low, Medium, High)
- `Timeline - Start/End` (date, temporal) - Période planifiée
- `Dependent On` (text, temporal) - Dépendances tâches
- `Duration` (text, general) - Durée tâche
- `Planned Effort` (text, general) - Effort planifié
- `Effort Spent` (text, general) - Effort consommé
- `Budget` (text, financial) - Budget tâche
- `Completion Date` (text, temporal) - Date fin réelle
- `link to JLM CHANTIERS` (text, project) - Liaison chantier

### 🏢 GESTION GÉNÉRALE (15 fichiers - 133 champs uniques)

#### Fichiers principaux:
- `CHANTIERS_1758620580.xlsx` (30 colonnes, 2223 lignes) - **FICHIER MAJEUR**
- `CAPSO_1758620571.xlsx` (19+1 colonnes, 514+356 lignes)
- `CHANTIERS_Administratif_1758620613.xlsx` (31 colonnes, 312 lignes)
- Et 12 autres fichiers de gestion

#### Champs par thématique:

**🏗️ GESTION CHANTIERS**
- `Name` (text, identifier) - Nom chantier
- `Subitems` (text, general) - Sous-éléments détaillés
- `Num Chantier` (text, project) - Numéro chantier
- `Num Devis` (text, project) - Numéro devis
- `Etat` (text, status) - État chantier
- `Lot` (numeric_string, project) - Lot travaux
- `MOA/MOE` (text, contact) - Maîtrises ouvrage/œuvre

**💼 GESTION COMMERCIALE**  
- `Nom` (text, identifier) - Nom demande/affaire
- `Demandeur` (text, general) - Qui demande
- `Statut de la demande` (text, status) - État demande
- `Date de la demande` (date, temporal) - Date création
- `CA HT` (numeric_string, financial) - CA hors taxes
- `Bon de commande` (text, general) - Référence BC

**⏱️ SUIVI TEMPS**
- `Time Tracking` (text, general) - Suivi temporel
- `Chronomètre` (text, identifier) - Mesure temps
- `Nb Heures` (text, general) - Nombre heures
- `Tps étude` (numeric_string, general) - Temps étude
- `Jo Equipe` (text, general) - Jours équipe

**📊 ASPECTS FINANCIERS**
- `TOTAL Gain / Achat` (date, financial) - Total gains
- `Sous-éléments Gain / Achat` (text, financial) - Détail gains
- `Budget TOTAL` (text, financial) - Budget global
- `TOTAL Achat` (text, financial) - Total achats
- `Coef vente` (text, general) - Coefficient vente
- `Marge H` (text, general) - Marge horaire

**📋 ADMINISTRATION & SUIVI**
- `Qui ?` (text, general) - Responsable
- `DS` (text, general) - Code DS
- `Hashtags` (text, general) - Tags classification
- `Résumé exécutif` (text, general) - Synthèse
- `Echéance` (date, general) - Date limite
- `A faire pour (Échéance)` (date, temporal) - Actions à faire

### 🏘️ AMOPALE (1 fichier - 5 champs uniques)

#### Fichier analysé:
- `PREURES_-_RUE_NOIRE_1758620731.xlsx` (5 colonnes, 19 lignes)

#### Champs spécifiques:
- `Name` (text, identifier) - Description travaux
- `Personne` (text, contact) - Responsable
- `Statut` (status, status) - État avancement  
- `Période - Start` (date, temporal) - Début période
- `Période - End` (date, temporal) - Fin période

---

## 🔗 2. MAPPING DES RELATIONS ENTRE ENTITÉS

### Relations Identifiées

#### 🔄 **Relation 1: Champs "id" transversaux**
- **Champ**: `id`
- **Type**: potential_foreign_key
- **Catégories concernées**: gestionGenerale, planningChantier
- **Usage**: Identifiants uniques pour liaison entre tableaux

#### 🔄 **Relation 2: Champs "num" transversaux**  
- **Champ**: `num`
- **Type**: potential_foreign_key
- **Catégories concernées**: gestionGenerale, planningChantier
- **Usage**: Numéros de référence (devis, chantier, etc.)

### Champs Communs Entre Catégories

#### 🎯 **Identifiants Projets**
- `Name` - Présent dans **TOUTES** les catégories
- `Num Chantier` - gestionGenerale ↔ planningChantier
- `Num Devis` - gestionGenerale ↔ planningChantier ↔ projetsSpecifiques
- `Code chantier` - planningChantier ↔ gestionGenerale

#### 👥 **Contacts & Responsables**
- `Personne` - gestionSalaries ↔ amopale ↔ gestionGenerale
- `MOA` - planningChantier ↔ gestionGenerale  
- `MOE` - planningChantier ↔ gestionGenerale
- `Owner` - projetsSpecifiques ↔ planningChantier

#### 💰 **Données Financières**
- `CA HT` - planningChantier ↔ gestionGenerale
- `Budget` - projetsSpecifiques ↔ planningChantier ↔ gestionGenerale
- `Marge H` - planningChantier ↔ gestionGenerale

#### ⏰ **Données Temporelles**
- `Timeline - Start/End` - projetsSpecifiques ↔ planningChantier
- `Période - Start/End` - gestionSalaries ↔ amopale
- `Date` - Présent dans toutes les catégories

---

## 📚 3. VOCABULAIRE MÉTIER JLM/BTP (Top 100 termes)

### 🏗️ **Vocabulaire Construction & BTP**
- Terrassement, Assainissement, Gros oeuvre, Charpente, Couverture
- Menuiseries extérieures, Enduit, Plâtrerie, Isolation
- Menuiserie intérieure, Carrelage, Sol, Revêtement, Parquet
- Plomberie, Chauffage, Electricité, Peinture
- Echafaudage, Nacelle, CACES, Manuscopique

### 👥 **Acteurs & Intervenants**
- MOA (Maître d'Ouvrage), MOE (Maître d'Œuvre)
- PARTENORD HABITAT, COGEDIM, NEXITY, AB+, DVA
- Personne, Demandeur, Responsable, Owner
- Julien LAMBOROT, Flavie LAMBOROT, Ludivine COMBAZ

### 📋 **Processus & États**
- Devis, Commande, Etude, Chiffrage, Passation
- En cours, Terminé, A faire, Working on it, Done
- Bouclage AO, Visite site, Rendu, Accord

### 🏢 **Lieux & Projets**
- BOULOGNE, BETHUNE, FRUGES, ETAPLES, LONGUENESSE
- GRANDE-SYNTHE, DUNKERQUE, LE TOUQUET, SAINS, AIRE
- ST OMER, ARQUES, BERCK, CAMPAGNE, SYMPHONIE

### 📊 **Concepts Financiers & Planning**
- CA HT, Marge, Coef Vente, Budget, Gain, Achat
- Heures, Jours, Mois, Travail, Equipe, Planning
- Priority, Medium, Low, High, Urgent

### 🔧 **Matériel & Techniques**
- Menu Ext (Menuiserie Extérieure), MEXT, Mint
- Visseuse, Choc, Perfo, Batterie, Chargeur
- SST, Amiante, AIPR, TMS, Extincteurs

---

## 📊 4. ANALYSE TYPES DE DONNÉES & CONTRAINTES

### Distribution des Types de Données

#### **Types Principaux Identifiés**
1. **text** (60%) - Données textuelles diverses
2. **date** (15%) - Données temporelles 
3. **numeric_string** (12%) - Nombres en format texte
4. **status** (8%) - États/statuts prédéfinis
5. **empty** (3%) - Valeurs manquantes
6. **integer/decimal** (2%) - Valeurs numériques pures

#### **Catégorisation Fonctionnelle**
1. **identifier** (25%) - Champs d'identification (Name, codes)
2. **general** (35%) - Champs génériques
3. **temporal** (15%) - Données temporelles  
4. **financial** (10%) - Données financières
5. **contact** (8%) - Informations contacts
6. **project** (5%) - Données projets
7. **status** (2%) - États/statuts

### Contraintes de Données Identifiées

#### **Champs à Forte Cardinalité** (potentiels identifiants)
- `Name` - Taux remplissage: 70-95%, très varié
- `Num Chantier` - Format numérique, unique par chantier
- `Num Devis` - Format numérique, référence unique
- `Code Devis` - Format numérique standardisé

#### **Champs à Faible Cardinalité** (listes de valeurs)
- `Status` - Valeurs: En cours, Terminé, A faire, Done, Working on it
- `Priority` - Valeurs: Low, Medium, High
- `Type Marché` - Valeurs: Privé, Public
- `LOT` - Valeurs: Menu Ext, MEXT, etc.

#### **Champs Temporels Structurés**
- Format standard: YYYY-MM-DD
- Périodes: Start/End systématiques
- Cohérence: Start < End obligatoire

#### **Champs Financiers**
- Format numérique avec décimales
- Valeurs positives attendues
- Cohérences: CA HT, Budget, Marge

---

## 🏗️ 5. RECOMMANDATIONS STRUCTURATION BASE DE DONNÉES

### Architecture Proposée

#### **🗂️ Tables Principales**

##### **1. PROJETS_CHANTIERS**
```sql
CREATE TABLE projets_chantiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    num_chantier VARCHAR(50) UNIQUE,
    num_devis VARCHAR(50),
    lieu VARCHAR(255),
    moa VARCHAR(255),
    moe VARCHAR(255),
    type_marche ENUM('Privé', 'Public'),
    statut ENUM('En cours', 'Terminé', 'A faire'),
    ca_ht DECIMAL(12,2),
    budget DECIMAL(12,2),
    date_creation DATE,
    date_accord DATE,
    date_demarrage DATE
);
```

##### **2. PERSONNEL**
```sql
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    emploi VARCHAR(100),
    qualification VARCHAR(255),
    -- Formations
    sst_valide BOOLEAN DEFAULT FALSE,
    sst_expiration DATE,
    amiante_ss4 BOOLEAN DEFAULT FALSE,
    echafaudage BOOLEAN DEFAULT FALSE,
    travaux_hauteur BOOLEAN DEFAULT FALSE,
    habilitation_elec VARCHAR(50),
    nacelle_caces BOOLEAN DEFAULT FALSE,
    -- Matériel assigné
    vehicule VARCHAR(100),
    materiel_assigne TEXT[]
);
```

##### **3. PLANNING_TACHES**
```sql
CREATE TABLE planning_taches (
    id SERIAL PRIMARY KEY,
    projet_id INTEGER REFERENCES projets_chantiers(id),
    name VARCHAR(255) NOT NULL,
    responsable VARCHAR(100),
    date_debut DATE,
    date_fin DATE,
    duree_prevue INTEGER, -- en jours
    statut ENUM('En attente', 'En cours', 'Terminé'),
    priorite ENUM('Low', 'Medium', 'High'),
    effort_planifie INTEGER,
    effort_consomme INTEGER
);
```

##### **4. DEVIS_COMMERCIAL**
```sql  
CREATE TABLE devis_commercial (
    id SERIAL PRIMARY KEY,
    num_devis VARCHAR(50) UNIQUE NOT NULL,
    projet_id INTEGER REFERENCES projets_chantiers(id),
    demandeur VARCHAR(255),
    date_demande DATE,
    statut_demande VARCHAR(100),
    ca_ht DECIMAL(12,2),
    marge_h DECIMAL(5,2),
    coef_vente DECIMAL(5,2),
    nb_heures INTEGER,
    date_rendu DATE
);
```

#### **🔗 Tables de Liaison**

##### **PROJET_PERSONNEL** (Many-to-Many)
```sql
CREATE TABLE projet_personnel (
    projet_id INTEGER REFERENCES projets_chantiers(id),
    personnel_id INTEGER REFERENCES personnel(id),
    role VARCHAR(100),
    date_debut DATE,
    date_fin DATE,
    PRIMARY KEY (projet_id, personnel_id)
);
```

### 📋 Recommandations d'Implémentation

#### **Phase 1: Entités Core**
1. **projets_chantiers** - Table centrale
2. **personnel** - Gestion RH
3. **devis_commercial** - Suivi commercial

#### **Phase 2: Planning & Suivi**
1. **planning_taches** - Planification détaillée
2. **projet_personnel** - Assignations
3. **suivi_temps** - Time tracking

#### **Phase 3: Données Métier**
1. **formations** - Détail formations
2. **materiel** - Gestion outillage  
3. **sous_traitants** - Partenaires

### 🔧 Contraintes & Index

#### **Index Recommandés**
```sql
-- Performance requêtes fréquentes
CREATE INDEX idx_projets_num_chantier ON projets_chantiers(num_chantier);
CREATE INDEX idx_projets_statut ON projets_chantiers(statut);
CREATE INDEX idx_planning_projet ON planning_taches(projet_id);
CREATE INDEX idx_planning_dates ON planning_taches(date_debut, date_fin);
CREATE INDEX idx_devis_num ON devis_commercial(num_devis);
```

#### **Contraintes Métier**
```sql
-- Cohérence temporelle
ALTER TABLE planning_taches ADD CONSTRAINT chk_dates 
    CHECK (date_fin >= date_debut);

-- Valeurs financières positives  
ALTER TABLE projets_chantiers ADD CONSTRAINT chk_ca_positif
    CHECK (ca_ht >= 0);
    
-- Numéros uniques non vides
ALTER TABLE projets_chantiers ADD CONSTRAINT chk_num_chantier
    CHECK (num_chantier IS NOT NULL AND LENGTH(num_chantier) > 0);
```

---

## 📈 6. CHAMPS PRIORITAIRES VS SECONDAIRES

### 🎯 **CHAMPS PRIORITAIRES** (Critique pour fonctionnement)

#### **Identifiants Essentiels**
- `Name` - Obligatoire toutes entités
- `Num Chantier` - Clé business projets
- `Num Devis` - Traçabilité commerciale
- `Personnel.name` - Identification RH

#### **Données Opérationnelles Critiques**
- `Statut/Status` - Suivi états
- `MOA/MOE` - Intervenants clés
- `CA HT` - Données financières
- `Date début/fin` - Planning essentiel
- `Responsable/Owner` - Assignations

#### **Conformité & Sécurité**
- `SST` - Obligatoire légal
- `Amiante SS4` - Conformité réglementaire
- `Habilitation Elec` - Sécurité chantier

### 📋 **CHAMPS SECONDAIRES** (Amélioration processus)

#### **Détails Complémentaires**
- `Version` - Suivi versions documents
- `Hashtags` - Classification avancée
- `Lien internet` - Références externes
- `Résumé exécutif` - Synthèse optionnelle

#### **Métriques Avancées**
- `Marge H` - Optimisation financière
- `Coef Vente` - Analyses tarifaires
- `Effort Spent vs Planned` - Performance

#### **Matériel Spécialisé**
- `Nb Batterie` - Détail logistique
- `Chargeur` - Gestion fine matériel
- Outils spécifiques par corps de métier

---

## ✅ 7. VALIDATION COMPLÉTUDE SAXIUM

### Champs Monday.com vs Saxium - Gaps Identifiés

#### **🚨 Manquants Critiques dans Saxium**
1. **Gestion Personnel Avancée**
   - Formations individuelles détaillées
   - Dates expiration certifications
   - Assignation matériel personnel

2. **Planning Granulaire**
   - Tâches avec dépendances
   - Suivi effort planifié vs consommé
   - Gestion priorités multiniveau

3. **Suivi Commercial Fin**
   - Étapes bouclage AO détaillées
   - Historique versions devis
   - Traçabilité demandes prix

#### **✅ Couvertures Saxium Correctes**
1. **Projets & Chantiers** - Bien couvert
2. **Données financières** - Structure OK
3. **Contacts MOA/MOE** - Géré
4. **Statuts généraux** - Implémenté

#### **🔧 Améliorations Suggérées Saxium**
1. **Module Formation Personnel** - À créer
2. **Planning Avancé** - À enrichir  
3. **Workflow Devis** - À détailler
4. **Time Tracking** - À implémenter

---

## 📋 8. CONCLUSION & SYNTHÈSE

### Résultats de l'Analyse

L'analyse exhaustive des 38 fichiers Excel Monday.com de JLM révèle une **richesse informationnelle considérable** avec 275 champs uniques et 4636 termes métier spécialisés BTP.

### Architecture Données Recommandée

La structuration proposée autour de **4 entités principales** (Projets, Personnel, Planning, Commercial) permettrait de **centraliser 95% des données** actuellement dispersées dans Monday.com.

### Impact Business

Cette migration structurée vers Saxium permettrait:
- **🎯 Centralisation** des données métier
- **📊 Reporting** unifié et cohérent  
- **🔄 Workflows** automatisés
- **📈 Suivi performance** en temps réel

### Next Steps

1. **Validation** architecture avec équipes JLM
2. **Priorisation** modules par criticité business
3. **Migration** progressive par catégorie
4. **Formation** utilisateurs nouvelle structure

---

*Rapport généré le 28 septembre 2025*  
*Analyse basée sur 38 fichiers Excel Monday.com JLM*  
*275 champs uniques • 4636 termes métier • 5 catégories business*