# Guide d'Utilisation - Configuration Cursor

## 📚 Structure

```
.cursor/
├── rules/          # Règles Cursor (96+ fichiers)
├── context/        # Contexte du projet
└── checkpoints/    # Checkpoints (générés)

.cursorrules        # Fichier principal de règles
.cursor-version     # Version installée
```

## 🎯 Utilisation

### Règles par Priorité

- **P0 - Critiques** : Toujours chargées
- **P1 - Importantes** : Chargées selon contexte
- **P2 - Optimisation** : Sur demande

### Référencer une règle

Dans vos messages Cursor, utilisez `@` pour référencer :

```
@.cursor/rules/core.md
@.cursor/rules/backend.md
@AGENTS.md
```

### Personnalisation

1. **Règles spécifiques** : Créer `.cursor/rules/project-specific/`
2. **Contexte** : Modifier `.cursor/context/*.md`
3. **Règles principales** : Modifier `.cursorrules`

## 🔄 Workflow

1. **Nouveau projet** : Installer configuration
2. **Personnaliser** : Adapter contexte et règles
3. **Développer** : Utiliser règles automatiquement
4. **Mettre à jour** : Exécuter `update-cursor-config.sh`

## 📝 Bonnes Pratiques

- ✅ Ne pas modifier règles partagées directement
- ✅ Créer règles spécifiques dans `project-specific/`
- ✅ Documenter personnalisations
- ✅ Mettre à jour régulièrement
