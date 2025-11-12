# Configuration Cursor - Partagée

Configuration Cursor optimisée pour développement avec IA.

## 📋 Contenu

- `.cursor/` - Règles et contexte Cursor
- `.cursorrules` - Fichier principal de règles
- `scripts/` - Scripts d'installation et mise à jour
- `VERSION` - Version actuelle
- `CHANGELOG.md` - Historique des changements

## 🚀 Installation

Voir `docs/INSTALLATION.md` pour les instructions complètes.

### Installation rapide

```bash
# Dans votre projet
bash <(curl -s https://raw.githubusercontent.com/votre-org/cursor-config/main/scripts/install.sh)
```

### Installation manuelle

```bash
git clone git@github.com:votre-org/cursor-config.git .cursor-config
cp -r .cursor-config/.cursor .
cp .cursor-config/.cursorrules .
echo "3.0.0" > .cursor-version
```

## 🔄 Mise à jour

```bash
# Mise à jour automatique
bash scripts/update-cursor-config.sh

# Ou manuellement
cd .cursor-config && git pull && cd ..
cp -r .cursor-config/.cursor .
cp .cursor-config/.cursorrules .
```

## 📚 Documentation

- `docs/INSTALLATION.md` - Guide d'installation
- `docs/USAGE.md` - Guide d'utilisation
- `docs/CUSTOMIZATION.md` - Personnalisation par projet

## 🔗 Liens

- [Documentation Cursor Rules](https://docs.cursor.com/context/rules)
- [Repository](https://github.com/votre-org/cursor-config)

