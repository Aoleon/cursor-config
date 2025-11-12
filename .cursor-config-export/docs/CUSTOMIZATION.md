# Guide de Personnalisation

## 🎨 Personnalisation par Projet

### 1. Contexte du Projet

Modifier `.cursor/context/` :

- `projectbrief.md` - Objectifs et périmètre
- `techContext.md` - Stack technique
- `activeContext.md` - Focus actuel
- `systemPatterns.md` - Patterns architecturaux

### 2. Règles Spécifiques

Créer `.cursor/rules/project-specific/` :

```bash
mkdir -p .cursor/rules/project-specific
```

Exemple `project-specific/custom-rules.md` :

```markdown
# Règles Spécifiques - Mon Projet

## Règles Métier

- Utiliser API spécifique X
- Patterns de validation Y
- ...

## Règles Techniques

- Framework Z obligatoire
- ...
```

### 3. Fichier Principal

Adapter `.cursorrules` :

```markdown
# Règles Cursor - Mon Projet

## Contexte du Projet

Mon projet est une application...

## Règles Spécifiques

@.cursor/rules/project-specific/custom-rules.md
```

## 🔄 Synchronisation

### Garder personnalisations lors de mise à jour

1. **Backup personnalisations** :
```bash
cp -r .cursor/rules/project-specific .cursor-personal-backup/
cp .cursorrules .cursorrules.personal
```

2. **Mettre à jour** :
```bash
bash scripts/update-cursor-config.sh
```

3. **Restaurer personnalisations** :
```bash
cp -r .cursor-personal-backup/project-specific .cursor/rules/
# Fusionner .cursorrules manuellement
```

## 📋 Checklist Personnalisation

- [ ] Adapter `projectbrief.md`
- [ ] Adapter `techContext.md`
- [ ] Créer règles spécifiques
- [ ] Documenter personnalisations
- [ ] Tester avec Cursor
