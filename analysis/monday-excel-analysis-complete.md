# ANALYSE EXHAUSTIVE DES FICHIERS EXCEL MONDAY.COM - RAPPORT COMPLET

## Résumé Exécutif

- **Total fichiers analysés**: 38/38
- **Erreurs**: 0
- **Vocabulaire métier unique**: 4636 termes
- **Champs uniques identifiés**: 275
- **Relations potentielles**: 2

## Analyse par Catégorie


### AMOPALE
- **Fichiers**: 1
- **Total colonnes**: 5
- **Total lignes**: 19
- **Champs uniques**: 5

**Champs principaux**:
- Name
- Personne
- Statut
- Période - Start
- Période - End



### PLANNINGCHANTIER
- **Fichiers**: 13
- **Total colonnes**: 192
- **Total lignes**: 1311
- **Champs uniques**: 97

**Champs principaux**:
- Name
- Sous-éléments
- Lieu
- Version
- Texte
- Lien internet
- LOT
- Rendu
- MOA
- MOE
- Type Marché
- Personnes
- Devis
- Bouclage AO
- Visite de site
- Année Prod
- Code Devis
- DS
- Nombre heures
- CA HT
- Marge H
- Coef Vente
- Objectif Marge H
- CA Objectif
- Passation
- Nb Mois Travail Eq
- Code chantier
- Date Accord
- Connecter les tableaux
- Bouton

... et 67 autres


### PROJETSSPECIFIQUES
- **Fichiers**: 3
- **Total colonnes**: 42
- **Total lignes**: 36
- **Champs uniques**: 19

**Champs principaux**:
- Name
- Owner
- Status
- Priority
- Timeline - Start
- Timeline - End
- Dependent On
- Duration
- Planned Effort
- Effort Spent
- Budget
- Completion Date
- link to JLM CHANTIERS
- Sous-éléments
- Démarrage
- Durée
- Prévision - Start
- Prévision - End
- J Eq



### GESTIONGENERALE
- **Fichiers**: 15
- **Total colonnes**: 228
- **Total lignes**: 7241
- **Champs uniques**: 133

**Champs principaux**:
- Nom
- Sous-éléments
- Num Devis
- Qui ?
- Statut de la demande
- Date de la demande
- Demandeur
- DS
- Nb Heures
- CA HT
- Coef vente
- Marge H
- A faire pour  (Échéance) : - Start
- A faire pour  (Échéance) : - End
- Chronomètre
- Résumé exécutif
- Bon de commande
- Hashtags
- CHANTIERS - Etudes
- Time Tracking
- Name
- Subitems
- Sous-éléments Gain / Achat
- TOTAL Gain / Achat
- Echéance
- Tps étude
- Texte
- Commande
- Lot
- Personne

... et 103 autres


### GESTIONSALARIES
- **Fichiers**: 6
- **Total colonnes**: 108
- **Total lignes**: 190
- **Champs uniques**: 80

**Champs principaux**:
- Name
- Personne
- 1ères actions
- Label
- Label 1
- Période - Start
- Période - End
- Sous-éléments
- SST (2ans)
- SST recyclage
- Amiante SS4 (Recyclage 3ans)
- Echafaudage
- Travaux en hauteur
- Maître d'apprentissage
- Date
- Habilitation Elec
- Risques routiers
- Nacelle CACES
- AIPR
- Manuscopique CACES
- TMS
- Extincteurs
- Qualif
- Emploi
- Camion
- Visseuse
- Choc
- Chargeur
- Perfo
- Nb Batterie

... et 50 autres


## Types de Champs Identifiés


### Name (identifier)
- **Type principal**: text
- **Occurrences**: 28 fichier(s)
- **Exemples**: Terrassement - Assainissement, Gros oeuvre, Charpente - Couverture

### Personne (contact)
- **Type principal**: text
- **Occurrences**: 12 fichier(s)
- **Exemples**: Personne

### Statut (status)
- **Type principal**: status
- **Occurrences**: 16 fichier(s)
- **Exemples**: En cours, Statut

### Période - Start (temporal)
- **Type principal**: date
- **Occurrences**: 12 fichier(s)
- **Exemples**: 2023-10-22, 2023-10-12, 2023-10-11

### Période - End (temporal)
- **Type principal**: date
- **Occurrences**: 12 fichier(s)
- **Exemples**: 2023-10-22, 2023-10-20, Période - End

### Sous-éléments (general)
- **Type principal**: text
- **Occurrences**: 15 fichier(s)
- **Exemples**: Sous-éléments, Etude, Name

### Lieu (general)
- **Type principal**: text
- **Occurrences**: 3 fichier(s)
- **Exemples**: Lieu, Sains les Marquions, Le Touquet-Paris-Plage, France

### Version (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: 1, Version, Date

### Texte (general)
- **Type principal**: text
- **Occurrences**: 5 fichier(s)
- **Exemples**: Texte, Métrés Ext ? ou Yannick, Status

### Lien internet (general)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Lien internet, '/Users/julienl/Library/CloudStorage/OneDrive-JLM/01 - ETUDES AO - Documents/01 - AO EN COURS/LE TOUQUET - HITO - GCC/02 - Etudes JLM/LE TOUQUET HITO Note 24 juil. 2025.pdf' - https://'/Users/julienl/Library/CloudStorage/OneDrive-JLM/01%20-%20ETUDES%20AO%20-%20Documents/01%20-%20AO%20EN%20COURS/LE%20TOUQUET%20-%20HITO%20-%20GCC/02%20-%20Etudes%20JLM/LE%20TOUQUET%20HITO%20Note%2024%20juil.%202025.pdf'

### LOT (project)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Menu Ext, LOT, Menu int

### Rendu (temporal)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: 2025-10-01, Rendu, 2025-03-31

### MOA (contact)
- **Type principal**: text
- **Occurrences**: 4 fichier(s)
- **Exemples**: PARTENORD HABITAT, COGEDIM, MOA

### MOE (contact)
- **Type principal**: text
- **Occurrences**: 4 fichier(s)
- **Exemples**: AB+, MOE, DVA

### Type Marché (general)
- **Type principal**: text
- **Occurrences**: 2 fichier(s)
- **Exemples**: Privé, Type Marché, EG

### Personnes (contact)
- **Type principal**: text
- **Occurrences**: 2 fichier(s)
- **Exemples**: Personnes, Flavie LAMBOROT, Julien DUCROCQ

### Devis (project)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Devis, En cours, A Faire

### Bouclage AO (general)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Bouclage AO, 2025-06-11, 2025-05-07

### Visite de site (general)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Visite de site, 2024-11-25, 2025-08-14

### Année Prod (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Année Prod, 2025, 2026

### Code Devis (project)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Code Devis, 202089, 202212

### DS (general)
- **Type principal**: numeric_string
- **Occurrences**: 2 fichier(s)
- **Exemples**: DS, 3670, 107786

### Nombre heures (identifier)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Nombre heures, 28, 354

### CA HT (financial)
- **Type principal**: numeric_string
- **Occurrences**: 5 fichier(s)
- **Exemples**: 100000, CA HT, 115900

### Marge H (general)
- **Type principal**: numeric_string
- **Occurrences**: 2 fichier(s)
- **Exemples**: no_numeric_values_available, Marge H, 52.5

### Coef Vente (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: no_numeric_values_available, Coef Vente, 1.4

### Objectif Marge H (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Objectif Marge H, 55, 37

### CA Objectif (financial)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: 0, CA Objectif, 3670

### Passation (general)
- **Type principal**: text
- **Occurrences**: 5 fichier(s)
- **Exemples**: Passation, A Faire, Faite

### Nb Mois Travail Eq (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: 0, Nb Mois Travail Eq, 0.01035503

### Code chantier (project)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: 23066, Code chantier, 23027

### Date Accord (temporal)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Date Accord, 2025-04-28, 2025-04-09

### Connecter les tableaux (general)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Connecter les tableaux

### Bouton (general)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Click me, Bouton

### Durée - Start (temporal)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Durée - Start, 2025-03-03, 2025-03-11

### Durée - End (temporal)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Durée - End, 2025-03-03, 2025-03-13

### Priority (general)
- **Type principal**: text
- **Occurrences**: 8 fichier(s)
- **Exemples**: Priority, Medium, High

### Date Métrés (temporal)
- **Type principal**: date
- **Occurrences**: 1 fichier(s)
- **Exemples**: Date Métrés, 2025-04-02, 2025-04-15

### Demande de prix (financial)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: A faire, Demande de prix, En cours

### Durée étude (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Durée étude, 12, 154

### Démarrage (general)
- **Type principal**: date
- **Occurrences**: 2 fichier(s)
- **Exemples**: Démarrage, 2025-04-17, 2025-04-22

### Chiffrage (general)
- **Type principal**: text
- **Occurrences**: 1 fichier(s)
- **Exemples**: Chiffrage, FL, SB

### Duree J Eq (general)
- **Type principal**: numeric_string
- **Occurrences**: 1 fichier(s)
- **Exemples**: Duree J Eq, 4, 92

### Owner (general)
- **Type principal**: text
- **Occurrences**: 6 fichier(s)
- **Exemples**: Julien LAMBOROT, Owner

### Status (status)
- **Type principal**: text
- **Occurrences**: 6 fichier(s)
- **Exemples**: Done, Working on it, Status

### Timeline - Start (temporal)
- **Type principal**: date
- **Occurrences**: 5 fichier(s)
- **Exemples**: 2025-03-16, 2025-04-01, Timeline - Start

### Timeline - End (temporal)
- **Type principal**: date
- **Occurrences**: 5 fichier(s)
- **Exemples**: 2025-03-22, 2025-04-15, Timeline - End

### Dependent On (temporal)
- **Type principal**: text
- **Occurrences**: 6 fichier(s)
- **Exemples**: Task 1, Dependent On

### Duration (general)
- **Type principal**: text
- **Occurrences**: 5 fichier(s)
- **Exemples**: 7, 15, Duration

### Planned Effort (general)
- **Type principal**: text
- **Occurrences**: 6 fichier(s)
- **Exemples**: 12, 22, Planned Effort



... et 225 autres champs

## Relations Potentielles Entre Entités


### name
- **Type**: potential_foreign_key
- **Catégories concernées**: gestionSalaries, planningChantier, projetsSpecifiques, gestionGenerale, amopale

### nom
- **Type**: potential_foreign_key
- **Catégories concernées**: planningChantier, gestionGenerale


## Vocabulaire Métier BTP/JLM (Top 100)

- Name
- Personne
- Statut
- Période - Start
- Période
- Start
- Période - End
- End
- En cours
- cours
- 2023-10-22
- 2023-10-12
- 2023-10-11
- Sous-éléments
- Sous
- éléments
- Lieu
- Version
- Texte
- Lien internet
- Lien
- internet
- LOT
- Rendu
- MOA
- MOE
- Type Marché
- Type
- Marché
- Personnes
- Devis
- Bouclage AO
- Bouclage
- Visite de site
- Visite
- site
- Année Prod
- Année
- Prod
- Code Devis
- Code
- DS
- Nombre heures
- Nombre
- heures
- CA HT
- Marge H
- Marge
- Coef Vente
- Coef
- Vente
- Objectif Marge H
- Objectif
- CA Objectif
- Passation
- Nb Mois Travail Eq
- Mois
- Travail
- Code chantier
- chantier
- Date Accord
- Date
- Accord
- Connecter les tableaux
- Connecter
- les
- tableaux
- Bouton
- Durée - Start
- Durée
- Durée - End
- Priority
- Date Métrés
- Métrés
- Demande de prix
- Demande
- prix
- Durée étude
- étude
- Démarrage
- Chiffrage
- Duree J Eq
- Duree
- 2025-10-01
- PARTENORD HABITAT
- PARTENORD
- HABITAT
- Click me
- Click
- A faire
- faire
- Menu Ext
- Menu
- Ext
- Privé
- COGEDIM
- AB+
- no_numeric_values_available
- numeric
- values

... et 4536 autres termes

## Recommandations Détaillées


### Standardisation des noms (Priorité: Haute)
Standardiser les noms de colonnes similaires entre fichiers


**Exemples**: name, nom



### Schéma de base de données (Priorité: Haute)
Créer un schéma unifié basé sur les champs identifiés

**Détails**: Utiliser les champs les plus fréquents comme base




### Validation des données (Priorité: Moyenne)
Implémenter une validation des types de données pour l'import

**Détails**: Basée sur l'analyse des types détectés




### Mapping métier (Priorité: Moyenne)
Créer un mapping entre vocabulaires métier et entités Saxium



**Taille vocabulaire**: 4636 termes


### Relations entre entités (Priorité: Haute)
Établir des relations basées sur les champs communs




**Relations potentielles**: 2


## Analyse par Fichier (Détails)


### PREURES_-_RUE_NOIRE_1758620731.xlsx
- **Catégorie**: amopale
- **Feuilles**: 1
- **Total colonnes**: 5
- **Total lignes**: 19
- **Champs extraits**: 5

**Feuilles analysées**:

  - **preures - rue noire**: 5 colonnes, 19 lignes
    - Headers: Name, Personne, Statut, Période - Start, Période - End


### AO_Planning_1758620539.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 39
- **Total lignes**: 907
- **Champs extraits**: 39

**Feuilles analysées**:

  - **ao planning  🖥️**: 39 colonnes, 907 lignes
    - Headers: Name, Sous-éléments, Lieu, Version, Texte...


### BETHUNE_BUDAPEST_1758620834.xlsx
- **Catégorie**: projetsSpecifiques
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 10
- **Champs extraits**: 13

**Feuilles analysées**:

  - **bethune budapest**: 13 colonnes, 10 lignes
    - Headers: Name, Owner, Status, Priority, Timeline - Start...


### BOULOGNE_102_-_GCC_-_102_lgts_-_Mint_1758620856.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 10
- **Champs extraits**: 13

**Feuilles analysées**:

  - **boulogne 102 - gcc - **: 13 colonnes, 10 lignes
    - Headers: Name, Owner, Status, Priority, Timeline - Start...


### BOULOGNE_102_-_GCC_-_102_lgts_-_Serrurerie_1758620850.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 10
- **Champs extraits**: 13

**Feuilles analysées**:

  - **boulogne 102 - gcc - **: 13 colonnes, 10 lignes
    - Headers: Name, Owner, Status, Priority, Timeline - Start...


### CAPSO_1758620571.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 2
- **Total colonnes**: 20
- **Total lignes**: 870
- **Champs extraits**: 20

**Feuilles analysées**:

  - **capso**: 19 colonnes, 514 lignes
    - Headers: Nom, Sous-éléments, Num Devis, Qui ?, Statut de la demande...

  - **chronometre**: 1 colonnes, 356 lignes
    - Headers: Time Tracking


### CHANTIERS_1758620580.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 30
- **Total lignes**: 2223
- **Champs extraits**: 29

**Feuilles analysées**:

  - **chantiers 🏗️**: 30 colonnes, 2223 lignes
    - Headers: Name, Subitems, Sous-éléments Gain / Achat, TOTAL Gain / Achat, Echéance...


### CHANTIERS_Administratif_1758620613.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 31
- **Total lignes**: 312
- **Champs extraits**: 31

**Feuilles analysées**:

  - **chantiers administrat**: 31 colonnes, 312 lignes
    - Headers: Name, Sous-éléments, Sous-éléments Commande, Lot, MOA...


### Contacts_1758620760.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 9
- **Total lignes**: 5
- **Champs extraits**: 9

**Feuilles analysées**:

  - **contacts**: 9 colonnes, 5 lignes
    - Headers: Nom, Intitulé du poste, Entreprise, Type, Priorité...


### Copie_de_CHANTIERS_PROJET_1758620682.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 28
- **Total lignes**: 1862
- **Champs extraits**: 28

**Feuilles analysées**:

  - **copie de chantiers 🏗️**: 28 colonnes, 1862 lignes
    - Headers: Name, Subitems, Etudes, Commande, Lot...


### DIRECTION_1758620650.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 8
- **Total lignes**: 118
- **Champs extraits**: 8

**Feuilles analysées**:

  - **direction**: 8 colonnes, 118 lignes
    - Headers: Name, Sous-éléments, Personne, Texte, Statut...


### ECQUES_BUREAUX_JLM_1758620829.xlsx
- **Catégorie**: projetsSpecifiques
- **Feuilles**: 1
- **Total colonnes**: 16
- **Total lignes**: 16
- **Champs extraits**: 16

**Feuilles analysées**:

  - **ecques bureaux jlm**: 16 colonnes, 16 lignes
    - Headers: Name, Sous-éléments, Owner, Status, Priority...


### Formation_Bureaux_1758620863.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 7
- **Total lignes**: 13
- **Champs extraits**: 7

**Feuilles analysées**:

  - **formation bureaux**: 7 colonnes, 13 lignes
    - Headers: Name, Personne, 1ères actions, Label, Label 1...


### Formation_Ouvriers_1758620716.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 17
- **Total lignes**: 39
- **Champs extraits**: 17

**Feuilles analysées**:

  - **formation ouvriers**: 17 colonnes, 39 lignes
    - Headers: Name, Sous-éléments, Personne, SST (2ans), SST recyclage...


### Outillage_MAKITA_1758620723.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 21
- **Total lignes**: 37
- **Champs extraits**: 21

**Feuilles analysées**:

  - **outillage makita 🛠️**: 21 colonnes, 37 lignes
    - Headers: Name, Sous-éléments, Qualif, Emploi, Camion...


### Pi_ces_personnel_1758620698.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 12
- **Total lignes**: 41
- **Champs extraits**: 12

**Feuilles analysées**:

  - **pièces personnel**: 12 colonnes, 41 lignes
    - Headers: Name, Sous-éléments, FICHE, PERMIS, PERMIS VERIFIE 2024...


### _Personnel_bureau_1758620710.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 27
- **Total lignes**: 15
- **Champs extraits**: 27

**Feuilles analysées**:

  - **👩‍💻 personnel bureau**: 27 colonnes, 15 lignes
    - Headers: Name, Emploi, Ancienneté, Date Entrée, Date Sortie...


### _Personnel_chantier_1758620704.xlsx
- **Catégorie**: gestionSalaries
- **Feuilles**: 1
- **Total colonnes**: 24
- **Total lignes**: 45
- **Champs extraits**: 24

**Feuilles analysées**:

  - **👷‍♂️ personnel chanti**: 24 colonnes, 45 lignes
    - Headers: Name, Sous-éléments, Emploi, Ancienneté, Niveau d'études...


### Heures_Insertion_1758620671.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 9
- **Total lignes**: 24
- **Champs extraits**: 9

**Feuilles analysées**:

  - **heures insertion**: 9 colonnes, 24 lignes
    - Headers: Name, Sous-éléments, Statut, Date, Période - Start...


### JLM_CHANTIERS_1758620597.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 20
- **Total lignes**: 8
- **Champs extraits**: 20

**Feuilles analysées**:

  - **jlm chantiers**: 20 colonnes, 8 lignes
    - Headers: Nom, Admin, Santé du projet (RAG), Progression du projet, Priorité...


### PERENCHIES_10_14_-_Portes_de_Hall_1758620845.xlsx
- **Catégorie**: projetsSpecifiques
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 10
- **Champs extraits**: 13

**Feuilles analysées**:

  - **perenchies 10+14 - po**: 13 colonnes, 10 lignes
    - Headers: Name, Owner, Status, Priority, Timeline - Start...


### P_RENCHIES_-_Charpente_Brisis_1758620839.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 10
- **Champs extraits**: 13

**Feuilles analysées**:

  - **pérenchies - charpent**: 13 colonnes, 10 lignes
    - Headers: Name, Owner, Status, Priority, Timeline - Start...


### BOULOGNE_1758620773.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 5
- **Total lignes**: 10
- **Champs extraits**: 5

**Feuilles analysées**:

  - **boulogne**: 5 colonnes, 10 lignes
    - Headers: Name, Personne, Statut, Période - Start, Période - End


### Boulogne_1758620768.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 24
- **Total lignes**: 212
- **Champs extraits**: 23

**Feuilles analysées**:

  - **boulogne**: 24 colonnes, 212 lignes
    - Headers: Name, colonne, entrée, BATIMENT, Etage...


### CAMPAGNE_1758620806.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 14
- **Total lignes**: 27
- **Champs extraits**: 14

**Feuilles analysées**:

  - **campagne**: 14 colonnes, 27 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### FRUGES_1758620811.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 14
- **Total lignes**: 30
- **Champs extraits**: 14

**Feuilles analysées**:

  - **fruges**: 14 colonnes, 30 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### FRUGES_TS_1758620823.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 9
- **Total lignes**: 17
- **Champs extraits**: 9

**Feuilles analysées**:

  - **fruges ts**: 9 colonnes, 17 lignes
    - Headers: Name, Personne, Statut, Période - Start, Période - End...


### PLANNING_SYMPHONIE_1758620816.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 12
- **Total lignes**: 20
- **Champs extraits**: 12

**Feuilles analysées**:

  - **planning symphonie**: 12 colonnes, 20 lignes
    - Headers: Name, Dépendance, Personne, Période - Start, Période - End...


### Planning_BETHUNE_1758620799.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 12
- **Total lignes**: 23
- **Champs extraits**: 12

**Feuilles analysées**:

  - **planning bethune**: 12 colonnes, 23 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### Planning_ETAPLES_GRAND_LARGE_men_ext_1758620793.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 12
- **Total lignes**: 15
- **Champs extraits**: 12

**Feuilles analysées**:

  - **planning etaples gran**: 12 colonnes, 15 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### Planning_ETAPLES_GRAND_LARGE_men_int_1758620787.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 12
- **Total lignes**: 14
- **Champs extraits**: 12

**Feuilles analysées**:

  - **planning etaples gran**: 12 colonnes, 14 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### Planning_LONGUENESSE_85_1758620780.xlsx
- **Catégorie**: planningChantier
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 16
- **Champs extraits**: 13

**Feuilles analysées**:

  - **planning longuenesse **: 13 colonnes, 16 lignes
    - Headers: Nom, Sous-tâches, Admin, Statut, Échéancier - Start...


### SOUS-TRAITANTS_1758620632.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 16
- **Total lignes**: 329
- **Champs extraits**: 15

**Feuilles analysées**:

  - **sous-traitants**: 16 colonnes, 329 lignes
    - Headers: Name, Sous-éléments, Marché, Avenant, Total Facturé...


### TEMPS_DE_POSE_JLM_1758620739.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 5
- **Total lignes**: 38
- **Champs extraits**: 5

**Feuilles analysées**:

  - **temps de pose jlm**: 5 colonnes, 38 lignes
    - Headers: Name, Sous-éléments, TEMPS DEVIS, OBJECTIF, Qt / j/homme


### TO_DO_FLAVIE_1758620656.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 7
- **Total lignes**: 97
- **Champs extraits**: 7

**Feuilles analysées**:

  - **to do flavie**: 7 colonnes, 97 lignes
    - Headers: Name, Sous-éléments, Personne, Texte, Statut...


### TO_DO_Julien_1758620664.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 9
- **Total lignes**: 152
- **Champs extraits**: 9

**Feuilles analysées**:

  - **to do julien**: 9 colonnes, 152 lignes
    - Headers: Name, Sous-éléments, Personne, Texte, Type...


### TO_DO_LUDIVINE_1758621044.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 10
- **Total lignes**: 1147
- **Champs extraits**: 10

**Feuilles analysées**:

  - **to do ludivine**: 10 colonnes, 1147 lignes
    - Headers: Nom, Sous-éléments, Personnes, Note, Statut...


### _Tableau_bord_JLM_1758620606.xlsx
- **Catégorie**: gestionGenerale
- **Feuilles**: 1
- **Total colonnes**: 13
- **Total lignes**: 46
- **Champs extraits**: 13

**Feuilles analysées**:

  - **🧭 tableau bord jlm**: 13 colonnes, 46 lignes
    - Headers: Name, Personne, Date, Facturation, PC du Mois...



## Fichiers avec Erreurs

Aucune erreur détectée ✅

---
*Rapport généré le 2025-09-28T13:08:08.786Z*
*Analysé avec le format Monday.com amélioré*
