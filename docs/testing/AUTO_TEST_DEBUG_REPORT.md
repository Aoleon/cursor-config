# Rapport Automatique de Test et Debug

**Date:** 2025-11-10T10:27:34.837Z  
**Statut:** ⏳ Erreurs détectées

---

## 📊 Résumé

| Métrique | Valeur |
|----------|--------|
| **Erreurs détectées** | 14064 |
| **Fichiers avec erreurs** | 90 |
| **Corrections appliquées** | 0 |
| **Fichiers corrigés** | 0 |

---

## 🔍 Erreurs par Fichier

### > rest-express@1.0.0 check
> tsc

server/batigestService.ts

**1 erreur(s)**

- **Ligne 541:3** [TS1434] Unexpected keyword or identifier.

### server/batigestService.ts

**45 erreur(s)**

- **Ligne 541:34** [TS1109] Expression expected.
- **Ligne 541:53** [TS1005] ',' expected.
- **Ligne 541:71** [TS1005] ';' expected.
- **Ligne 542:11** [TS1005] ',' expected.
- **Ligne 542:15** [TS1005] ':' expected.
- **Ligne 542:25** [TS1005] ',' expected.
- **Ligne 622:5** [TS1005] ',' expected.
- **Ligne 622:11** [TS1005] ':' expected.
- **Ligne 630:6** [TS1005] ',' expected.
- **Ligne 632:11** [TS1005] ':' expected.
- ... et 35 autre(s) erreur(s)

### server/contactService.ts

**5 erreur(s)**

- **Ligne 636:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 637:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 638:5** [TS1128] Declaration or statement expected.
- **Ligne 639:3** [TS1128] Declaration or statement expected.
- **Ligne 640:1** [TS1128] Declaration or statement expected.

### server/dateUtils.ts

**15 erreur(s)**

- **Ligne 133:7** [TS1128] Declaration or statement expected.
- **Ligne 135:3** [TS1128] Declaration or statement expected.
- **Ligne 150:7** [TS1128] Declaration or statement expected.
- **Ligne 151:5** [TS1128] Declaration or statement expected.
- **Ligne 152:3** [TS1128] Declaration or statement expected.
- **Ligne 167:7** [TS1128] Declaration or statement expected.
- **Ligne 168:5** [TS1128] Declaration or statement expected.
- **Ligne 169:3** [TS1128] Declaration or statement expected.
- **Ligne 172:1** [TS1128] Declaration or statement expected.
- **Ligne 205:7** [TS1128] Declaration or statement expected.
- ... et 5 autre(s) erreur(s)

### server/db.ts

**1 erreur(s)**

- **Ligne 25:5** [TS1135] Argument expression expected.

### server/db/config.ts

**87 erreur(s)**

- **Ligne 103:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 106:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 140:3** [TS1128] Declaration or statement expected.
- **Ligne 145:3** [TS1128] Declaration or statement expected.
- **Ligne 145:32** [TS1005] ',' expected.
- **Ligne 145:40** [TS1005] ';' expected.
- **Ligne 145:42** [TS1434] Unexpected keyword or identifier.
- **Ligne 165:3** [TS1128] Declaration or statement expected.
- **Ligne 165:42** [TS1005] ',' expected.
- **Ligne 165:52** [TS1005] ';' expected.
- ... et 77 autre(s) erreur(s)

### server/documentProcessor.ts

**164 erreur(s)**

- **Ligne 402:1** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:4** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:10** [TS1435] Unknown keyword or identifier. Did you mean 'export'?
- **Ligne 402:17** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:20** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:28** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:31** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:41** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:52** [TS1434] Unexpected keyword or identifier.
- ... et 154 autre(s) erreur(s)

### server/eventBus.ts

**305 erreur(s)**

- **Ligne 85:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 87:3** [TS1128] Declaration or statement expected.
- **Ligne 92:3** [TS1128] Declaration or statement expected.
- **Ligne 92:27** [TS1005] ',' expected.
- **Ligne 92:50** [TS1109] Expression expected.
- **Ligne 92:64** [TS1005] ';' expected.
- **Ligne 92:66** [TS1434] Unexpected keyword or identifier.
- **Ligne 110:12** [TS1128] Declaration or statement expected.
- **Ligne 113:5** [TS1128] Declaration or statement expected.
- **Ligne 128:3** [TS1128] Declaration or statement expected.
- ... et 295 autre(s) erreur(s)

### server/index.ts

**18 erreur(s)**

- **Ligne 264:5** [TS1005] ')' expected.
- **Ligne 264:6** [TS1128] Declaration or statement expected.
- **Ligne 265:3** [TS1128] Declaration or statement expected.
- **Ligne 377:5** [TS1128] Declaration or statement expected.
- **Ligne 378:3** [TS1128] Declaration or statement expected.
- **Ligne 378:4** [TS1128] Declaration or statement expected.
- **Ligne 380:9** [TS1005] ';' expected.
- **Ligne 381:4** [TS1128] Declaration or statement expected.
- **Ligne 437:7** [TS1128] Declaration or statement expected.
- **Ligne 438:5** [TS1128] Declaration or statement expected.
- ... et 8 autre(s) erreur(s)

### server/middleware/monday-webhook.ts

**3 erreur(s)**

- **Ligne 89:6** [TS1128] Declaration or statement expected.
- **Ligne 91:3** [TS1128] Declaration or statement expected.
- **Ligne 92:1** [TS1128] Declaration or statement expected.

### server/modules/admin/routes.ts

**7 erreur(s)**

- **Ligne 590:5** [TS1128] Declaration or statement expected.
- **Ligne 590:6** [TS1005] ')' expected.
- **Ligne 594:7** [TS1128] Declaration or statement expected.
- **Ligne 595:5** [TS1128] Declaration or statement expected.
- **Ligne 595:6** [TS1128] Declaration or statement expected.
- **Ligne 596:3** [TS1128] Declaration or statement expected.
- **Ligne 743:1** [TS1128] Declaration or statement expected.

### server/modules/aftersales/routes.ts

**25 erreur(s)**

- **Ligne 94:11** [TS1005] ')' expected.
- **Ligne 97:5** [TS1128] Declaration or statement expected.
- **Ligne 97:6** [TS1128] Declaration or statement expected.
- **Ligne 98:3** [TS1128] Declaration or statement expected.
- **Ligne 141:11** [TS1005] ')' expected.
- **Ligne 143:7** [TS1128] Declaration or statement expected.
- **Ligne 144:5** [TS1128] Declaration or statement expected.
- **Ligne 144:6** [TS1128] Declaration or statement expected.
- **Ligne 145:3** [TS1128] Declaration or statement expected.
- **Ligne 192:11** [TS1005] ')' expected.
- ... et 15 autre(s) erreur(s)

### server/modules/alerts/routes.ts

**56 erreur(s)**

- **Ligne 213:11** [TS1005] ')' expected.
- **Ligne 216:5** [TS1128] Declaration or statement expected.
- **Ligne 216:6** [TS1128] Declaration or statement expected.
- **Ligne 217:3** [TS1128] Declaration or statement expected.
- **Ligne 244:11** [TS1005] ')' expected.
- **Ligne 246:7** [TS1128] Declaration or statement expected.
- **Ligne 247:5** [TS1128] Declaration or statement expected.
- **Ligne 247:6** [TS1128] Declaration or statement expected.
- **Ligne 248:3** [TS1128] Declaration or statement expected.
- **Ligne 286:11** [TS1005] ')' expected.
- ... et 46 autre(s) erreur(s)

### server/modules/analytics/routes.ts

**50 erreur(s)**

- **Ligne 699:11** [TS1005] ')' expected.
- **Ligne 702:5** [TS1128] Declaration or statement expected.
- **Ligne 702:6** [TS1128] Declaration or statement expected.
- **Ligne 703:3** [TS1128] Declaration or statement expected.
- **Ligne 753:11** [TS1005] ')' expected.
- **Ligne 755:7** [TS1128] Declaration or statement expected.
- **Ligne 756:5** [TS1128] Declaration or statement expected.
- **Ligne 756:6** [TS1128] Declaration or statement expected.
- **Ligne 757:3** [TS1128] Declaration or statement expected.
- **Ligne 811:11** [TS1005] ')' expected.
- ... et 40 autre(s) erreur(s)

### server/modules/batigest/routes.ts

**9 erreur(s)**

- **Ligne 285:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 288:8** [TS1005] ';' expected.
- **Ligne 288:19** [TS1109] Expression expected.
- **Ligne 291:3** [TS1128] Declaration or statement expected.
- **Ligne 378:11** [TS1005] ',' expected.
- **Ligne 434:5** [TS1128] Declaration or statement expected.
- **Ligne 434:6** [TS1128] Declaration or statement expected.
- **Ligne 435:3** [TS1128] Declaration or statement expected.
- **Ligne 723:1** [TS1128] Declaration or statement expected.

### server/modules/chatbot/routes.ts

**20 erreur(s)**

- **Ligne 180:11** [TS1005] ')' expected.
- **Ligne 189:5** [TS1128] Declaration or statement expected.
- **Ligne 189:6** [TS1128] Declaration or statement expected.
- **Ligne 190:3** [TS1128] Declaration or statement expected.
- **Ligne 454:11** [TS1005] ')' expected.
- **Ligne 462:7** [TS1128] Declaration or statement expected.
- **Ligne 463:5** [TS1128] Declaration or statement expected.
- **Ligne 463:6** [TS1128] Declaration or statement expected.
- **Ligne 464:3** [TS1128] Declaration or statement expected.
- **Ligne 790:11** [TS1005] ')' expected.
- ... et 10 autre(s) erreur(s)

### server/modules/commercial/routes.ts

**44 erreur(s)**

- **Ligne 265:6** [TS1434] Unexpected keyword or identifier.
- **Ligne 265:96** [TS1002] Unterminated string literal.
- **Ligne 267:9** [TS1005] ',' expected.
- **Ligne 271:5** [TS1128] Declaration or statement expected.
- **Ligne 271:6** [TS1128] Declaration or statement expected.
- **Ligne 272:3** [TS1128] Declaration or statement expected.
- **Ligne 622:11** [TS1005] ')' expected.
- **Ligne 624:7** [TS1128] Declaration or statement expected.
- **Ligne 625:5** [TS1128] Declaration or statement expected.
- **Ligne 625:6** [TS1128] Declaration or statement expected.
- ... et 34 autre(s) erreur(s)

### server/modules/documents/pdf/ImageIntegrator.ts

**96 erreur(s)**

- **Ligne 159:6** [TS1005] 'try' expected.
- **Ligne 162:11** [TS1128] Declaration or statement expected.
- **Ligne 174:3** [TS1128] Declaration or statement expected.
- **Ligne 179:3** [TS1128] Declaration or statement expected.
- **Ligne 179:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 180:14** [TS1005] ',' expected.
- **Ligne 181:19** [TS1005] ',' expected.
- **Ligne 182:4** [TS1005] ';' expected.
- **Ligne 184:11** [TS1005] ':' expected.
- **Ligne 184:49** [TS1005] ',' expected.
- ... et 86 autre(s) erreur(s)

### server/modules/documents/pdf/LayoutOptimizer.ts

**44 erreur(s)**

- **Ligne 192:47** [TS1005] ';' expected.
- **Ligne 192:53** [TS1110] Type expected.
- **Ligne 194:45** [TS1005] ';' expected.
- **Ligne 194:51** [TS1110] Type expected.
- **Ligne 194:64** [TS1005] ';' expected.
- **Ligne 195:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 195:12** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 200:3** [TS1128] Declaration or statement expected.
- **Ligne 205:3** [TS1128] Declaration or statement expected.
- **Ligne 205:36** [TS1005] ',' expected.
- ... et 34 autre(s) erreur(s)

### server/modules/documents/pdf/PDFTemplateEngine.ts

**34 erreur(s)**

- **Ligne 357:5** [TS1128] Declaration or statement expected.
- **Ligne 360:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 369:5** [TS1128] Declaration or statement expected.
- **Ligne 370:3** [TS1128] Declaration or statement expected.
- **Ligne 375:3** [TS1128] Declaration or statement expected.
- **Ligne 375:10** [TS1434] Unexpected keyword or identifier.
- **Ligne 375:41** [TS1005] ',' expected.
- **Ligne 375:55** [TS1005] ';' expected.
- **Ligne 376:12** [TS1005] ':' expected.
- **Ligne 376:45** [TS1005] ',' expected.
- ... et 24 autre(s) erreur(s)

### server/modules/documents/pdf/PlaceholderResolver.ts

**69 erreur(s)**

- **Ligne 162:5** [TS1434] Unexpected keyword or identifier.
- **Ligne 162:11** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 162:17** [TS1003] Identifier expected.
- **Ligne 162:40** [TS1138] Parameter declaration expected.
- **Ligne 163:25** [TS1005] ',' expected.
- **Ligne 164:23** [TS1005] ',' expected.
- **Ligne 167:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 168:3** [TS1128] Declaration or statement expected.
- **Ligne 173:3** [TS1128] Declaration or statement expected.
- **Ligne 173:35** [TS1005] ',' expected.
- ... et 59 autre(s) erreur(s)

### server/modules/documents/pdf/TemplateValidator.ts

**140 erreur(s)**

- **Ligne 152:11** [TS1005] ';' expected.
- **Ligne 152:20** [TS1434] Unexpected keyword or identifier.
- **Ligne 152:25** [TS1434] Unexpected keyword or identifier.
- **Ligne 152:43** [TS1005] ',' expected.
- **Ligne 152:48** [TS1005] ':' expected.
- **Ligne 152:66** [TS1005] ',' expected.
- **Ligne 152:72** [TS1443] Module declaration names may only use ' or " quoted strings.
- **Ligne 161:19** [TS1434] Unexpected keyword or identifier.
- **Ligne 161:27** [TS1434] Unexpected keyword or identifier.
- **Ligne 161:42** [TS1434] Unexpected keyword or identifier.
- ... et 130 autre(s) erreur(s)

### server/modules/hr/routes.ts

**15 erreur(s)**

- **Ligne 78:11** [TS1005] ')' expected.
- **Ligne 81:5** [TS1128] Declaration or statement expected.
- **Ligne 81:6** [TS1128] Declaration or statement expected.
- **Ligne 82:3** [TS1128] Declaration or statement expected.
- **Ligne 131:11** [TS1005] ')' expected.
- **Ligne 133:7** [TS1128] Declaration or statement expected.
- **Ligne 134:5** [TS1128] Declaration or statement expected.
- **Ligne 134:6** [TS1128] Declaration or statement expected.
- **Ligne 135:3** [TS1128] Declaration or statement expected.
- **Ligne 178:11** [TS1005] ')' expected.
- ... et 5 autre(s) erreur(s)

### server/modules/monday/export-integration.ts

**6 erreur(s)**

- **Ligne 80:3** [TS1128] Declaration or statement expected.
- **Ligne 80:4** [TS1128] Declaration or statement expected.
- **Ligne 137:5** [TS1128] Declaration or statement expected.
- **Ligne 138:3** [TS1128] Declaration or statement expected.
- **Ligne 138:4** [TS1128] Declaration or statement expected.
- **Ligne 147:1** [TS1128] Declaration or statement expected.

### server/modules/monday/routes.ts

**20 erreur(s)**

- **Ligne 1008:18** [TS1005] ';' expected.
- **Ligne 1008:41** [TS1434] Unexpected keyword or identifier.
- **Ligne 1008:45** [TS1434] Unexpected keyword or identifier.
- **Ligne 1008:59** [TS1443] Module declaration names may only use ' or " quoted strings.
- **Ligne 1043:23** [TS1434] Unexpected keyword or identifier.
- **Ligne 1043:30** [TS1434] Unexpected keyword or identifier.
- **Ligne 1043:46** [TS1434] Unexpected keyword or identifier.
- **Ligne 1043:49** [TS1434] Unexpected keyword or identifier.
- **Ligne 1068:11** [TS1005] ';' expected.
- **Ligne 1068:37** [TS1434] Unexpected keyword or identifier.
- ... et 10 autre(s) erreur(s)

### server/modules/projects/routes.ts

**40 erreur(s)**

- **Ligne 881:11** [TS1005] ')' expected.
- **Ligne 884:5** [TS1128] Declaration or statement expected.
- **Ligne 884:6** [TS1128] Declaration or statement expected.
- **Ligne 885:3** [TS1128] Declaration or statement expected.
- **Ligne 923:11** [TS1005] ')' expected.
- **Ligne 925:7** [TS1128] Declaration or statement expected.
- **Ligne 926:5** [TS1128] Declaration or statement expected.
- **Ligne 926:6** [TS1128] Declaration or statement expected.
- **Ligne 927:3** [TS1128] Declaration or statement expected.
- **Ligne 984:11** [TS1005] ')' expected.
- ... et 30 autre(s) erreur(s)

### server/modules/stakeholders/routes.ts

**30 erreur(s)**

- **Ligne 258:11** [TS1005] ')' expected.
- **Ligne 261:5** [TS1128] Declaration or statement expected.
- **Ligne 261:6** [TS1128] Declaration or statement expected.
- **Ligne 262:3** [TS1128] Declaration or statement expected.
- **Ligne 285:11** [TS1005] ')' expected.
- **Ligne 287:7** [TS1128] Declaration or statement expected.
- **Ligne 288:5** [TS1128] Declaration or statement expected.
- **Ligne 288:6** [TS1128] Declaration or statement expected.
- **Ligne 289:3** [TS1128] Declaration or statement expected.
- **Ligne 312:11** [TS1005] ')' expected.
- ... et 20 autre(s) erreur(s)

### server/modules/suppliers/routes.ts

**25 erreur(s)**

- **Ligne 355:11** [TS1005] ')' expected.
- **Ligne 358:5** [TS1128] Declaration or statement expected.
- **Ligne 358:6** [TS1128] Declaration or statement expected.
- **Ligne 359:3** [TS1128] Declaration or statement expected.
- **Ligne 391:11** [TS1005] ')' expected.
- **Ligne 393:7** [TS1128] Declaration or statement expected.
- **Ligne 394:5** [TS1128] Declaration or statement expected.
- **Ligne 394:6** [TS1128] Declaration or statement expected.
- **Ligne 395:3** [TS1128] Declaration or statement expected.
- **Ligne 871:11** [TS1005] ')' expected.
- ... et 15 autre(s) erreur(s)

### server/modules/testing/routes.ts

**21 erreur(s)**

- **Ligne 48:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 51:8** [TS1005] ';' expected.
- **Ligne 51:19** [TS1109] Expression expected.
- **Ligne 54:3** [TS1128] Declaration or statement expected.
- **Ligne 55:6** [TS1128] Declaration or statement expected.
- **Ligne 63:3** [TS1128] Declaration or statement expected.
- **Ligne 64:1** [TS1128] Declaration or statement expected.
- **Ligne 173:6** [TS1128] Declaration or statement expected.
- **Ligne 175:3** [TS1128] Declaration or statement expected.
- **Ligne 176:1** [TS1128] Declaration or statement expected.
- ... et 11 autre(s) erreur(s)

### server/monitoring/notifier.ts

**133 erreur(s)**

- **Ligne 98:5** [TS1128] Declaration or statement expected.
- **Ligne 102:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 103:3** [TS1128] Declaration or statement expected.
- **Ligne 108:3** [TS1128] Declaration or statement expected.
- **Ligne 108:34** [TS1005] ',' expected.
- **Ligne 108:42** [TS1005] ';' expected.
- **Ligne 108:51** [TS1011] An element access expression should take an argument.
- **Ligne 108:53** [TS1005] ';' expected.
- **Ligne 127:3** [TS1128] Declaration or statement expected.
- **Ligne 127:11** [TS1434] Unexpected keyword or identifier.
- ... et 123 autre(s) erreur(s)

### server/objectStorage.ts

**71 erreur(s)**

- **Ligne 179:5** [TS1128] Declaration or statement expected.
- **Ligne 182:3** [TS1128] Declaration or statement expected.
- **Ligne 185:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 185:35** [TS1005] ';' expected.
- **Ligne 186:11** [TS1005] ':' expected.
- **Ligne 186:56** [TS1005] ',' expected.
- **Ligne 187:9** [TS1003] Identifier expected.
- **Ligne 194:5** [TS1005] ',' expected.
- **Ligne 194:11** [TS1005] ':' expected.
- **Ligne 194:34** [TS1005] ',' expected.
- ... et 61 autre(s) erreur(s)

### server/ocrService.ts

**430 erreur(s)**

- **Ligne 88:6** [TS1005] ',' expected.
- **Ligne 116:7** [TS1128] Declaration or statement expected.
- **Ligne 116:8** [TS1128] Declaration or statement expected.
- **Ligne 125:5** [TS1128] Declaration or statement expected.
- **Ligne 126:3** [TS1128] Declaration or statement expected.
- **Ligne 126:5** [TS1005] 'try' expected.
- **Ligne 129:1** [TS1128] Declaration or statement expected.
- **Ligne 489:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 490:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 492:5** [TS1128] Declaration or statement expected.
- ... et 420 autre(s) erreur(s)

### server/replitAuth.ts

**12 erreur(s)**

- **Ligne 279:8** [TS1005] ',' expected.
- **Ligne 282:3** [TS1128] Declaration or statement expected.
- **Ligne 400:5** [TS1128] Declaration or statement expected.
- **Ligne 401:3** [TS1128] Declaration or statement expected.
- **Ligne 401:4** [TS1128] Declaration or statement expected.
- **Ligne 514:5** [TS1128] Declaration or statement expected.
- **Ligne 515:3** [TS1128] Declaration or statement expected.
- **Ligne 515:4** [TS1128] Declaration or statement expected.
- **Ligne 516:1** [TS1128] Declaration or statement expected.
- **Ligne 583:10** [TS1128] Declaration or statement expected.
- ... et 2 autre(s) erreur(s)

### server/routes.ts

**5 erreur(s)**

- **Ligne 205:10** [TS1005] ',' expected.
- **Ligne 207:5** [TS1128] Declaration or statement expected.
- **Ligne 208:3** [TS1128] Declaration or statement expected.
- **Ligne 208:4** [TS1128] Declaration or statement expected.
- **Ligne 221:1** [TS1128] Declaration or statement expected.

### server/routes/ai-service.ts

**6 erreur(s)**

- **Ligne 516:5** [TS1128] Declaration or statement expected.
- **Ligne 524:3** [TS1005] ',' expected.
- **Ligne 524:5** [TS1005] ')' expected.
- **Ligne 550:1** [TS1128] Declaration or statement expected.
- **Ligne 550:2** [TS1128] Declaration or statement expected.
- **Ligne 550:3** [TS1128] Declaration or statement expected.

### server/routes/monitoring.ts

**65 erreur(s)**

- **Ligne 103:5** [TS1128] Declaration or statement expected.
- **Ligne 104:3** [TS1128] Declaration or statement expected.
- **Ligne 105:1** [TS1128] Declaration or statement expected.
- **Ligne 105:2** [TS1128] Declaration or statement expected.
- **Ligne 150:5** [TS1128] Declaration or statement expected.
- **Ligne 151:3** [TS1128] Declaration or statement expected.
- **Ligne 152:1** [TS1128] Declaration or statement expected.
- **Ligne 152:2** [TS1128] Declaration or statement expected.
- **Ligne 184:5** [TS1128] Declaration or statement expected.
- **Ligne 185:3** [TS1128] Declaration or statement expected.
- ... et 55 autre(s) erreur(s)

### server/scripts/migrate-from-monday.ts

**177 erreur(s)**

- **Ligne 240:5** [TS1127] Invalid character.
- **Ligne 279:1** [TS1127] Invalid character.
- **Ligne 279:2** [TS1127] Invalid character.
- **Ligne 279:3** [TS1127] Invalid character.
- **Ligne 279:4** [TS1127] Invalid character.
- **Ligne 279:5** [TS1127] Invalid character.
- **Ligne 279:6** [TS1127] Invalid character.
- **Ligne 279:7** [TS1127] Invalid character.
- **Ligne 279:8** [TS1127] Invalid character.
- **Ligne 279:9** [TS1127] Invalid character.
- ... et 167 autre(s) erreur(s)

### server/seeders/dateIntelligenceRulesSeeder.ts

**88 erreur(s)**

- **Ligne 60:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 63:8** [TS1005] ';' expected.
- **Ligne 63:40** [TS1109] Expression expected.
- **Ligne 66:3** [TS1128] Declaration or statement expected.
- **Ligne 69:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 69:13** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 69:19** [TS1003] Identifier expected.
- **Ligne 69:75** [TS1005] ',' expected.
- **Ligne 69:77** [TS1434] Unexpected keyword or identifier.
- **Ligne 69:99** [TS1005] ';' expected.
- ... et 78 autre(s) erreur(s)

### server/seeders/mondaySeed-simple.ts

**102 erreur(s)**

- **Ligne 187:3** [TS1128] Declaration or statement expected.
- **Ligne 189:3** [TS1128] Declaration or statement expected.
- **Ligne 189:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 189:32** [TS1005] ';' expected.
- **Ligne 215:3** [TS1128] Declaration or statement expected.
- **Ligne 215:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 215:28** [TS1005] ';' expected.
- **Ligne 216:9** [TS1005] ',' expected.
- **Ligne 216:24** [TS1005] ',' expected.
- **Ligne 217:11** [TS1005] ':' expected.
- ... et 92 autre(s) erreur(s)

### server/seeders/mondaySeed.ts

**156 erreur(s)**

- **Ligne 198:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 201:8** [TS1005] ';' expected.
- **Ligne 201:23** [TS1109] Expression expected.
- **Ligne 204:3** [TS1128] Declaration or statement expected.
- **Ligne 208:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 257:5** [TS1128] Declaration or statement expected.
- **Ligne 257:7** [TS1005] 'try' expected.
- **Ligne 268:3** [TS1128] Declaration or statement expected.
- **Ligne 274:3** [TS1128] Declaration or statement expected.
- **Ligne 274:11** [TS1434] Unexpected keyword or identifier.
- ... et 146 autre(s) erreur(s)

### server/services/ActionExecutionService.ts

**236 erreur(s)**

- **Ligne 241:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 242:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 243:5** [TS1128] Declaration or statement expected.
- **Ligne 244:3** [TS1128] Declaration or statement expected.
- **Ligne 249:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 249:34** [TS1005] ',' expected.
- **Ligne 249:52** [TS1005] ',' expected.
- **Ligne 249:61** [TS1005] ';' expected.
- **Ligne 250:12** [TS1005] ':' expected.
- **Ligne 290:6** [TS1472] 'catch' or 'finally' expected.
- ... et 226 autre(s) erreur(s)

### server/services/AIService.ts

**285 erreur(s)**

- **Ligne 619:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 622:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 642:5** [TS1128] Declaration or statement expected.
- **Ligne 643:3** [TS1128] Declaration or statement expected.
- **Ligne 652:3** [TS1128] Declaration or statement expected.
- **Ligne 652:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 652:43** [TS1005] ',' expected.
- **Ligne 652:60** [TS1005] ';' expected.
- **Ligne 654:16** [TS1005] ',' expected.
- **Ligne 654:27** [TS1005] ',' expected.
- ... et 275 autre(s) erreur(s)

### server/services/AuditService.ts

**196 erreur(s)**

- **Ligne 205:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 206:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 207:5** [TS1128] Declaration or statement expected.
- **Ligne 208:3** [TS1128] Declaration or statement expected.
- **Ligne 213:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 213:38** [TS1005] ',' expected.
- **Ligne 213:59** [TS1005] ';' expected.
- **Ligne 214:12** [TS1005] ':' expected.
- **Ligne 309:4** [TS1005] ',' expected.
- **Ligne 310:8** [TS1005] ';' expected.
- ... et 186 autre(s) erreur(s)

### server/services/BatigestExportService.ts

**21 erreur(s)**

- **Ligne 295:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 297:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 307:5** [TS1128] Declaration or statement expected.
- **Ligne 308:3** [TS1128] Declaration or statement expected.
- **Ligne 313:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 313:34** [TS1005] ',' expected.
- **Ligne 313:50** [TS1005] ';' expected.
- **Ligne 314:12** [TS1005] ':' expected.
- **Ligne 346:4** [TS1005] ',' expected.
- **Ligne 347:8** [TS1005] ';' expected.
- ... et 11 autre(s) erreur(s)

### server/services/BusinessContextService.ts

**451 erreur(s)**

- **Ligne 200:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 202:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 218:5** [TS1128] Declaration or statement expected.
- **Ligne 219:3** [TS1128] Declaration or statement expected.
- **Ligne 228:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 228:30** [TS1005] ',' expected.
- **Ligne 228:57** [TS1005] ';' expected.
- **Ligne 229:11** [TS1005] ':' expected.
- **Ligne 229:33** [TS1005] ',' expected.
- **Ligne 231:12** [TS1005] ':' expected.
- ... et 441 autre(s) erreur(s)

### server/services/CacheService.ts

**92 erreur(s)**

- **Ligne 230:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 231:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 233:5** [TS1128] Declaration or statement expected.
- **Ligne 234:3** [TS1128] Declaration or statement expected.
- **Ligne 239:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 239:19** [TS1005] ',' expected.
- **Ligne 239:34** [TS1005] ',' expected.
- **Ligne 239:49** [TS1005] ',' expected.
- **Ligne 239:58** [TS1005] ';' expected.
- **Ligne 239:72** [TS1109] Expression expected.
- ... et 82 autre(s) erreur(s)

### server/services/ChatbotOrchestrationService.ts

**471 erreur(s)**

- **Ligne 787:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 790:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 811:5** [TS1128] Declaration or statement expected.
- **Ligne 812:3** [TS1128] Declaration or statement expected.
- **Ligne 821:3** [TS1128] Declaration or statement expected.
- **Ligne 821:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 822:12** [TS1005] ',' expected.
- **Ligne 823:21** [TS1109] Expression expected.
- **Ligne 824:20** [TS1109] Expression expected.
- **Ligne 825:4** [TS1005] ';' expected.
- ... et 461 autre(s) erreur(s)

### server/services/consolidated/BusinessAnalyticsService.ts

**94 erreur(s)**

- **Ligne 238:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 239:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 245:5** [TS1128] Declaration or statement expected.
- **Ligne 246:3** [TS1128] Declaration or statement expected.
- **Ligne 248:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 249:11** [TS1005] ',' expected.
- **Ligne 250:13** [TS1109] Expression expected.
- **Ligne 251:17** [TS1005] ',' expected.
- **Ligne 252:4** [TS1005] ';' expected.
- **Ligne 253:12** [TS1005] ':' expected.
- ... et 84 autre(s) erreur(s)

### server/services/consolidated/MondayDataService.ts

**170 erreur(s)**

- **Ligne 182:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 185:8** [TS1005] ';' expected.
- **Ligne 185:30** [TS1109] Expression expected.
- **Ligne 188:3** [TS1128] Declaration or statement expected.
- **Ligne 447:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 448:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 449:5** [TS1128] Declaration or statement expected.
- **Ligne 450:3** [TS1128] Declaration or statement expected.
- **Ligne 460:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 461:15** [TS1005] ',' expected.
- ... et 160 autre(s) erreur(s)

### server/services/consolidated/MondayIntegrationService.ts

**90 erreur(s)**

- **Ligne 753:7** [TS1005] ',' expected.
- **Ligne 870:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 873:8** [TS1005] ';' expected.
- **Ligne 873:37** [TS1109] Expression expected.
- **Ligne 876:3** [TS1128] Declaration or statement expected.
- **Ligne 877:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 878:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 879:5** [TS1128] Declaration or statement expected.
- **Ligne 880:3** [TS1128] Declaration or statement expected.
- **Ligne 889:3** [TS1434] Unexpected keyword or identifier.
- ... et 80 autre(s) erreur(s)

### server/services/consolidated/MondayMigrationService.ts

**235 erreur(s)**

- **Ligne 269:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 270:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 271:5** [TS1128] Declaration or statement expected.
- **Ligne 272:3** [TS1128] Declaration or statement expected.
- **Ligne 274:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 274:24** [TS1005] ',' expected.
- **Ligne 274:42** [TS1005] ';' expected.
- **Ligne 275:11** [TS1005] ':' expected.
- **Ligne 275:17** [TS1005] ',' expected.
- **Ligne 275:25** [TS1005] ',' expected.
- ... et 225 autre(s) erreur(s)

### server/services/consolidated/TechnicalMetricsService.ts

**137 erreur(s)**

- **Ligne 322:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 326:3** [TS1128] Declaration or statement expected.
- **Ligne 335:24** [TS1005] ';' expected.
- **Ligne 335:53** [TS1109] Expression expected.
- **Ligne 362:29** [TS1005] ';' expected.
- **Ligne 363:9** [TS1005] ':' expected.
- **Ligne 363:38** [TS1005] ',' expected.
- **Ligne 364:9** [TS1005] ':' expected.
- **Ligne 364:52** [TS1005] ',' expected.
- **Ligne 365:9** [TS1005] ':' expected.
- ... et 127 autre(s) erreur(s)

### server/services/ContextBuilderService.ts

**674 erreur(s)**

- **Ligne 179:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 180:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 181:5** [TS1128] Declaration or statement expected.
- **Ligne 182:3** [TS1128] Declaration or statement expected.
- **Ligne 187:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 187:34** [TS1005] ',' expected.
- **Ligne 187:66** [TS1005] ';' expected.
- **Ligne 188:11** [TS1005] ':' expected.
- **Ligne 188:33** [TS1005] ',' expected.
- **Ligne 189:9** [TS1005] ',' expected.
- ... et 664 autre(s) erreur(s)

### server/services/ContextCacheService.ts

**897 erreur(s)**

- **Ligne 16:32** [TS1005] '{' expected.
- **Ligne 27:16** [TS1011] An element access expression should take an argument.
- **Ligne 30:1** [TS1005] ',' expected.
- **Ligne 115:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 118:8** [TS1005] ';' expected.
- **Ligne 118:32** [TS1109] Expression expected.
- **Ligne 121:3** [TS1128] Declaration or statement expected.
- **Ligne 122:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 123:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 125:5** [TS1128] Declaration or statement expected.
- ... et 887 autre(s) erreur(s)

### server/services/ContextTierService.ts

**286 erreur(s)**

- **Ligne 186:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 190:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 204:5** [TS1128] Declaration or statement expected.
- **Ligne 205:3** [TS1128] Declaration or statement expected.
- **Ligne 214:3** [TS1128] Declaration or statement expected.
- **Ligne 214:29** [TS1005] ',' expected.
- **Ligne 214:38** [TS1005] ';' expected.
- **Ligne 214:84** [TS1005] ';' expected.
- **Ligne 244:3** [TS1128] Declaration or statement expected.
- **Ligne 244:29** [TS1005] ',' expected.
- ... et 276 autre(s) erreur(s)

### server/services/ContextualOCREngine.ts

**288 erreur(s)**

- **Ligne 184:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 185:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 186:5** [TS1128] Declaration or statement expected.
- **Ligne 187:3** [TS1128] Declaration or statement expected.
- **Ligne 192:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 193:20** [TS1005] ',' expected.
- **Ligne 194:17** [TS1005] ',' expected.
- **Ligne 195:4** [TS1005] ';' expected.
- **Ligne 196:9** [TS1003] Identifier expected.
- **Ligne 196:14** [TS1005] ',' expected.
- ... et 278 autre(s) erreur(s)

### server/services/DateAlertDetectionService.ts

**411 erreur(s)**

- **Ligne 256:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 257:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 259:3** [TS1128] Declaration or statement expected.
- **Ligne 265:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 265:42** [TS1005] ',' expected.
- **Ligne 265:54** [TS1005] ';' expected.
- **Ligne 265:80** [TS1011] An element access expression should take an argument.
- **Ligne 266:11** [TS1005] ':' expected.
- **Ligne 266:17** [TS1005] ',' expected.
- **Ligne 266:34** [TS1005] ',' expected.
- ... et 401 autre(s) erreur(s)

### server/services/DateIntelligenceService.ts

**142 erreur(s)**

- **Ligne 240:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 242:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 243:5** [TS1128] Declaration or statement expected.
- **Ligne 244:3** [TS1128] Declaration or statement expected.
- **Ligne 247:3** [TS1128] Declaration or statement expected.
- **Ligne 248:10** [TS1005] ',' expected.
- **Ligne 249:12** [TS1005] ',' expected.
- **Ligne 250:10** [TS1005] ',' expected.
- **Ligne 250:33** [TS1011] An element access expression should take an argument.
- **Ligne 251:4** [TS1005] ';' expected.
- ... et 132 autre(s) erreur(s)

### server/services/DocumentSyncService.ts

**31 erreur(s)**

- **Ligne 137:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 140:8** [TS1005] ';' expected.
- **Ligne 140:32** [TS1109] Expression expected.
- **Ligne 143:3** [TS1128] Declaration or statement expected.
- **Ligne 149:7** [TS1005] ',' expected.
- **Ligne 155:9** [TS1005] ')' expected.
- **Ligne 290:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 295:3** [TS1128] Declaration or statement expected.
- **Ligne 300:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 300:21** [TS1005] ';' expected.
- ... et 21 autre(s) erreur(s)

### server/services/emailService.ts

**93 erreur(s)**

- **Ligne 392:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 393:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 393:13** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 393:20** [TS1003] Identifier expected.
- **Ligne 393:46** [TS1138] Parameter declaration expected.
- **Ligne 395:20** [TS1003] Identifier expected.
- **Ligne 395:34** [TS1005] ':' expected.
- **Ligne 396:22** [TS1003] Identifier expected.
- **Ligne 396:38** [TS1005] ':' expected.
- **Ligne 397:43** [TS1005] ',' expected.
- ... et 83 autre(s) erreur(s)

### server/services/MicrosoftOAuthService.ts

**8 erreur(s)**

- **Ligne 154:13** [TS1005] ')' expected.
- **Ligne 158:5** [TS1128] Declaration or statement expected.
- **Ligne 158:6** [TS1128] Declaration or statement expected.
- **Ligne 163:3** [TS1128] Declaration or statement expected.
- **Ligne 164:1** [TS1128] Declaration or statement expected.
- **Ligne 230:6** [TS1128] Declaration or statement expected.
- **Ligne 232:3** [TS1128] Declaration or statement expected.
- **Ligne 233:1** [TS1128] Declaration or statement expected.

### server/services/MondayDataSplitter.ts

**5 erreur(s)**

- **Ligne 368:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 371:8** [TS1005] ';' expected.
- **Ligne 371:31** [TS1109] Expression expected.
- **Ligne 374:3** [TS1128] Declaration or statement expected.
- **Ligne 384:1** [TS1160] Unterminated template literal.

### server/services/MondayImportService.ts

**43 erreur(s)**

- **Ligne 234:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 237:8** [TS1005] ';' expected.
- **Ligne 237:32** [TS1109] Expression expected.
- **Ligne 240:3** [TS1128] Declaration or statement expected.
- **Ligne 240:5** [TS1128] Declaration or statement expected.
- **Ligne 240:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 322:62** [TS1005] ';' expected.
- **Ligne 322:81** [TS1128] Declaration or statement expected.
- **Ligne 322:83** [TS1434] Unexpected keyword or identifier.
- **Ligne 333:33** [TS1005] ';' expected.
- ... et 33 autre(s) erreur(s)

### server/services/MondayMigrationService.ts

**106 erreur(s)**

- **Ligne 172:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 173:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 174:5** [TS1128] Declaration or statement expected.
- **Ligne 175:3** [TS1128] Declaration or statement expected.
- **Ligne 181:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 181:47** [TS1005] ';' expected.
- **Ligne 182:21** [TS1005] ',' expected.
- **Ligne 183:23** [TS1005] ',' expected.
- **Ligne 184:23** [TS1005] ',' expected.
- **Ligne 185:23** [TS1005] ',' expected.
- ... et 96 autre(s) erreur(s)

### server/services/MondayMigrationServiceEnhanced.ts

**139 erreur(s)**

- **Ligne 161:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 164:8** [TS1005] ';' expected.
- **Ligne 164:43** [TS1109] Expression expected.
- **Ligne 167:3** [TS1128] Declaration or statement expected.
- **Ligne 168:14** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 170:9** [TS1128] Declaration or statement expected.
- **Ligne 171:7** [TS1128] Declaration or statement expected.
- **Ligne 222:5** [TS1128] Declaration or statement expected.
- **Ligne 222:7** [TS1005] 'try' expected.
- **Ligne 237:3** [TS1128] Declaration or statement expected.
- ... et 129 autre(s) erreur(s)

### server/services/MondayProductionFinalService.ts

**244 erreur(s)**

- **Ligne 218:8** [TS1128] Declaration or statement expected.
- **Ligne 220:5** [TS1128] Declaration or statement expected.
- **Ligne 221:3** [TS1128] Declaration or statement expected.
- **Ligne 227:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 227:34** [TS1005] ';' expected.
- **Ligne 228:11** [TS1005] ',' expected.
- **Ligne 234:7** [TS1005] ',' expected.
- **Ligne 236:11** [TS1005] ':' expected.
- **Ligne 236:77** [TS1005] ',' expected.
- **Ligne 237:11** [TS1005] ':' expected.
- ... et 234 autre(s) erreur(s)

### server/services/MondayProductionMigrationService.ts

**178 erreur(s)**

- **Ligne 263:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 264:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 265:5** [TS1128] Declaration or statement expected.
- **Ligne 266:3** [TS1128] Declaration or statement expected.
- **Ligne 272:24** [TS1005] ';' expected.
- **Ligne 272:46** [TS1011] An element access expression should take an argument.
- **Ligne 272:57** [TS1005] ';' expected.
- **Ligne 272:77** [TS1011] An element access expression should take an argument.
- **Ligne 289:3** [TS1128] Declaration or statement expected.
- **Ligne 289:40** [TS1005] ',' expected.
- ... et 168 autre(s) erreur(s)

### server/services/MondaySchemaAnalyzer.ts

**74 erreur(s)**

- **Ligne 99:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 100:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 101:5** [TS1128] Declaration or statement expected.
- **Ligne 102:3** [TS1128] Declaration or statement expected.
- **Ligne 110:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 110:38** [TS1005] ',' expected.
- **Ligne 110:58** [TS1109] Expression expected.
- **Ligne 110:67** [TS1005] ';' expected.
- **Ligne 112:11** [TS1005] ':' expected.
- **Ligne 112:90** [TS1005] ',' expected.
- ... et 64 autre(s) erreur(s)

### server/services/MondayWebhookService.ts

**5 erreur(s)**

- **Ligne 131:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 132:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 133:5** [TS1128] Declaration or statement expected.
- **Ligne 134:3** [TS1128] Declaration or statement expected.
- **Ligne 135:1** [TS1128] Declaration or statement expected.

### server/services/OneDriveService.ts

**76 erreur(s)**

- **Ligne 394:57** [TS1005] ';' expected.
- **Ligne 394:58** [TS1161] Unterminated regular expression literal.
- **Ligne 394:84** [TS1005] ';' expected.
- **Ligne 394:85** [TS1128] Declaration or statement expected.
- **Ligne 397:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 398:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 400:8** [TS1005] ';' expected.
- **Ligne 400:28** [TS1109] Expression expected.
- **Ligne 403:3** [TS1128] Declaration or statement expected.
- **Ligne 418:32** [TS1005] ';' expected.
- ... et 66 autre(s) erreur(s)

### server/services/OneDriveSyncService.ts

**49 erreur(s)**

- **Ligne 82:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 85:8** [TS1005] ';' expected.
- **Ligne 85:32** [TS1109] Expression expected.
- **Ligne 88:3** [TS1128] Declaration or statement expected.
- **Ligne 88:5** [TS1128] Declaration or statement expected.
- **Ligne 88:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 140:37** [TS1005] ';' expected.
- **Ligne 140:44** [TS1161] Unterminated regular expression literal.
- **Ligne 144:11** [TS1128] Declaration or statement expected.
- **Ligne 148:7** [TS1128] Declaration or statement expected.
- ... et 39 autre(s) erreur(s)

### server/services/pdfGeneratorService.ts

**162 erreur(s)**

- **Ligne 103:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 104:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 105:5** [TS1128] Declaration or statement expected.
- **Ligne 106:3** [TS1128] Declaration or statement expected.
- **Ligne 111:3** [TS1128] Declaration or statement expected.
- **Ligne 111:10** [TS1434] Unexpected keyword or identifier.
- **Ligne 112:9** [TS1005] ',' expected.
- **Ligne 113:12** [TS1005] ',' expected.
- **Ligne 114:4** [TS1005] ';' expected.
- **Ligne 115:11** [TS1005] ',' expected.
- ... et 152 autre(s) erreur(s)

### server/services/PeriodicDetectionScheduler.ts

**330 erreur(s)**

- **Ligne 192:2** [TS1128] Declaration or statement expected.
- **Ligne 192:18** [TS1005] ';' expected.
- **Ligne 195:3** [TS1128] Declaration or statement expected.
- **Ligne 197:3** [TS1128] Declaration or statement expected.
- **Ligne 197:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 197:48** [TS1005] ';' expected.
- **Ligne 198:11** [TS1005] ':' expected.
- **Ligne 198:41** [TS1005] ',' expected.
- **Ligne 199:11** [TS1005] ':' expected.
- **Ligne 199:33** [TS1005] ',' expected.
- ... et 320 autre(s) erreur(s)

### server/services/PredictiveEngineService.ts

**700 erreur(s)**

- **Ligne 183:39** [TS1005] '{' expected.
- **Ligne 190:30** [TS1011] An element access expression should take an argument.
- **Ligne 191:25** [TS1011] An element access expression should take an argument.
- **Ligne 196:1** [TS1005] ',' expected.
- **Ligne 428:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 431:8** [TS1005] ';' expected.
- **Ligne 431:36** [TS1109] Expression expected.
- **Ligne 434:3** [TS1128] Declaration or statement expected.
- **Ligne 435:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 436:7** [TS1434] Unexpected keyword or identifier.
- ... et 690 autre(s) erreur(s)

### server/services/RBACService.ts

**136 erreur(s)**

- **Ligne 115:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 116:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 117:5** [TS1128] Declaration or statement expected.
- **Ligne 118:3** [TS1128] Declaration or statement expected.
- **Ligne 125:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 125:36** [TS1005] ',' expected.
- **Ligne 125:62** [TS1005] ';' expected.
- **Ligne 126:12** [TS1005] ':' expected.
- **Ligne 211:4** [TS1005] ',' expected.
- **Ligne 212:8** [TS1005] ';' expected.
- ... et 126 autre(s) erreur(s)

### server/services/RedisCacheAdapter.ts

**58 erreur(s)**

- **Ligne 124:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 125:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 126:5** [TS1128] Declaration or statement expected.
- **Ligne 127:3** [TS1128] Declaration or statement expected.
- **Ligne 129:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 129:19** [TS1005] ',' expected.
- **Ligne 129:34** [TS1005] ',' expected.
- **Ligne 129:49** [TS1005] ',' expected.
- **Ligne 129:58** [TS1005] ';' expected.
- **Ligne 129:72** [TS1109] Expression expected.
- ... et 48 autre(s) erreur(s)

### server/services/resilience.ts

**12 erreur(s)**

- **Ligne 183:6** [TS1128] Declaration or statement expected.
- **Ligne 185:3** [TS1128] Declaration or statement expected.
- **Ligne 186:1** [TS1128] Declaration or statement expected.
- **Ligne 215:6** [TS1128] Declaration or statement expected.
- **Ligne 217:3** [TS1128] Declaration or statement expected.
- **Ligne 218:1** [TS1128] Declaration or statement expected.
- **Ligne 243:6** [TS1128] Declaration or statement expected.
- **Ligne 245:3** [TS1128] Declaration or statement expected.
- **Ligne 246:1** [TS1128] Declaration or statement expected.
- **Ligne 271:6** [TS1128] Declaration or statement expected.
- ... et 2 autre(s) erreur(s)

### server/services/SafetyGuardsService.ts

**161 erreur(s)**

- **Ligne 308:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 310:3** [TS1128] Declaration or statement expected.
- **Ligne 315:3** [TS1128] Declaration or statement expected.
- **Ligne 315:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 315:37** [TS1005] ';' expected.
- **Ligne 315:51** [TS1109] Expression expected.
- **Ligne 316:12** [TS1005] ':' expected.
- **Ligne 350:4** [TS1005] ',' expected.
- **Ligne 351:8** [TS1005] ';' expected.
- **Ligne 352:5** [TS1128] Declaration or statement expected.
- ... et 151 autre(s) erreur(s)

### server/services/scoringService.ts

**24 erreur(s)**

- **Ligne 110:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 111:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 112:5** [TS1128] Declaration or statement expected.
- **Ligne 113:3** [TS1128] Declaration or statement expected.
- **Ligne 118:3** [TS1128] Declaration or statement expected.
- **Ligne 118:36** [TS1005] ',' expected.
- **Ligne 118:77** [TS1005] ';' expected.
- **Ligne 118:79** [TS1434] Unexpected keyword or identifier.
- **Ligne 130:3** [TS1128] Declaration or statement expected.
- **Ligne 130:39** [TS1005] ',' expected.
- ... et 14 autre(s) erreur(s)

### server/services/SQLEngineService.ts

**327 erreur(s)**

- **Ligne 527:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 529:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 537:5** [TS1128] Declaration or statement expected.
- **Ligne 538:3** [TS1128] Declaration or statement expected.
- **Ligne 547:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 547:28** [TS1005] ',' expected.
- **Ligne 547:51** [TS1005] ';' expected.
- **Ligne 548:12** [TS1005] ':' expected.
- **Ligne 581:4** [TS1005] ',' expected.
- **Ligne 582:8** [TS1005] ';' expected.
- ... et 317 autre(s) erreur(s)

### server/services/SyncAuditService.ts

**20 erreur(s)**

- **Ligne 85:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 87:3** [TS1128] Declaration or statement expected.
- **Ligne 89:3** [TS1128] Declaration or statement expected.
- **Ligne 89:33** [TS1005] ';' expected.
- **Ligne 163:5** [TS1128] Declaration or statement expected.
- **Ligne 163:6** [TS1128] Declaration or statement expected.
- **Ligne 207:7** [TS1128] Declaration or statement expected.
- **Ligne 244:5** [TS1128] Declaration or statement expected.
- **Ligne 244:6** [TS1128] Declaration or statement expected.
- **Ligne 287:7** [TS1128] Declaration or statement expected.
- ... et 10 autre(s) erreur(s)

### server/services/SyncScheduler.ts

**52 erreur(s)**

- **Ligne 72:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 73:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 74:5** [TS1128] Declaration or statement expected.
- **Ligne 75:3** [TS1128] Declaration or statement expected.
- **Ligne 77:9** [TS1005] ';' expected.
- **Ligne 78:13** [TS1005] ',' expected.
- **Ligne 78:21** [TS1005] ',' expected.
- **Ligne 78:23** [TS1136] Property assignment expected.
- **Ligne 85:3** [TS1128] Declaration or statement expected.
- **Ligne 87:3** [TS1434] Unexpected keyword or identifier.
- ... et 42 autre(s) erreur(s)

### server/storage-poc.ts

**2975 erreur(s)**

- **Ligne 1036:11** [TS1003] Identifier expected.
- **Ligne 1036:17** [TS1005] ',' expected.
- **Ligne 1036:25** [TS1005] ',' expected.
- **Ligne 1036:39** [TS1005] ';' expected.
- **Ligne 1132:15** [TS1005] ')' expected.
- **Ligne 1154:11** [TS1128] Declaration or statement expected.
- **Ligne 1155:9** [TS1128] Declaration or statement expected.
- **Ligne 1155:10** [TS1128] Declaration or statement expected.
- **Ligne 1156:7** [TS1128] Declaration or statement expected.
- **Ligne 1172:5** [TS1128] Declaration or statement expected.
- ... et 2965 autre(s) erreur(s)

### server/storage/analytics/KpiRepository.ts

**4 erreur(s)**

- **Ligne 479:8** [TS1128] Declaration or statement expected.
- **Ligne 481:5** [TS1128] Declaration or statement expected.
- **Ligne 482:3** [TS1128] Declaration or statement expected.
- **Ligne 483:1** [TS1128] Declaration or statement expected.

### server/storage/base/BaseRepository.ts

**214 erreur(s)**

- **Ligne 301:10** [TS1128] Declaration or statement expected.
- **Ligne 304:3** [TS1128] Declaration or statement expected.
- **Ligne 323:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 323:20** [TS1005] ',' expected.
- **Ligne 323:34** [TS1109] Expression expected.
- **Ligne 323:55** [TS1005] ';' expected.
- **Ligne 324:9** [TS1005] ':' expected.
- **Ligne 329:7** [TS1005] ',' expected.
- **Ligne 331:11** [TS1005] ':' expected.
- **Ligne 331:38** [TS1005] ',' expected.
- ... et 204 autre(s) erreur(s)

### server/test-business-context-enrichment.ts

**3 erreur(s)**

- **Ligne 198:6** [TS1128] Declaration or statement expected.
- **Ligne 200:3** [TS1128] Declaration or statement expected.
- **Ligne 201:1** [TS1128] Declaration or statement expected.

### server/utils/database-helpers.ts

**7 erreur(s)**

- **Ligne 249:10** [TS1128] Declaration or statement expected.
- **Ligne 270:5** [TS1128] Declaration or statement expected.
- **Ligne 271:3** [TS1128] Declaration or statement expected.
- **Ligne 276:1** [TS1128] Declaration or statement expected.
- **Ligne 331:6** [TS1128] Declaration or statement expected.
- **Ligne 334:3** [TS1128] Declaration or statement expected.
- **Ligne 335:1** [TS1128] Declaration or statement expected.

### server/utils/retry-service.ts

**1 erreur(s)**

- **Ligne 138:1** [TS1128] Declaration or statement expected.

### server/utils/safe-query.ts

**10 erreur(s)**

- **Ligne 129:1** [TS1128] Declaration or statement expected.
- **Ligne 249:6** [TS1128] Declaration or statement expected.
- **Ligne 251:3** [TS1128] Declaration or statement expected.
- **Ligne 252:1** [TS1128] Declaration or statement expected.
- **Ligne 278:6** [TS1128] Declaration or statement expected.
- **Ligne 280:3** [TS1128] Declaration or statement expected.
- **Ligne 281:1** [TS1128] Declaration or statement expected.
- **Ligne 311:6** [TS1128] Declaration or statement expected.
- **Ligne 313:3** [TS1128] Declaration or statement expected.
- **Ligne 314:1** [TS1128] Declaration or statement expected.

### server/utils/shared-utils.ts

**1 erreur(s)**

- **Ligne 325:1** [TS1128] Declaration or statement expected.



---

## 🔧 Corrections Appliquées

Aucune correction automatique appliquée.

---

## 📋 Erreurs Restantes

### > rest-express@1.0.0 check
> tsc

server/batigestService.ts

**1 erreur(s) restante(s)**

- **Ligne 541:3** [TS1434] Unexpected keyword or identifier.

### server/batigestService.ts

**45 erreur(s) restante(s)**

- **Ligne 541:34** [TS1109] Expression expected.
- **Ligne 541:53** [TS1005] ',' expected.
- **Ligne 541:71** [TS1005] ';' expected.
- **Ligne 542:11** [TS1005] ',' expected.
- **Ligne 542:15** [TS1005] ':' expected.
- ... et 40 autre(s) erreur(s)

### server/contactService.ts

**5 erreur(s) restante(s)**

- **Ligne 636:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 637:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 638:5** [TS1128] Declaration or statement expected.
- **Ligne 639:3** [TS1128] Declaration or statement expected.
- **Ligne 640:1** [TS1128] Declaration or statement expected.

### server/dateUtils.ts

**15 erreur(s) restante(s)**

- **Ligne 133:7** [TS1128] Declaration or statement expected.
- **Ligne 135:3** [TS1128] Declaration or statement expected.
- **Ligne 150:7** [TS1128] Declaration or statement expected.
- **Ligne 151:5** [TS1128] Declaration or statement expected.
- **Ligne 152:3** [TS1128] Declaration or statement expected.
- ... et 10 autre(s) erreur(s)

### server/db.ts

**1 erreur(s) restante(s)**

- **Ligne 25:5** [TS1135] Argument expression expected.

### server/db/config.ts

**87 erreur(s) restante(s)**

- **Ligne 103:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 106:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 140:3** [TS1128] Declaration or statement expected.
- **Ligne 145:3** [TS1128] Declaration or statement expected.
- **Ligne 145:32** [TS1005] ',' expected.
- ... et 82 autre(s) erreur(s)

### server/documentProcessor.ts

**164 erreur(s) restante(s)**

- **Ligne 402:1** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:4** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 402:10** [TS1435] Unknown keyword or identifier. Did you mean 'export'?
- **Ligne 402:17** [TS1434] Unexpected keyword or identifier.
- ... et 159 autre(s) erreur(s)

### server/eventBus.ts

**305 erreur(s) restante(s)**

- **Ligne 85:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 87:3** [TS1128] Declaration or statement expected.
- **Ligne 92:3** [TS1128] Declaration or statement expected.
- **Ligne 92:27** [TS1005] ',' expected.
- **Ligne 92:50** [TS1109] Expression expected.
- ... et 300 autre(s) erreur(s)

### server/index.ts

**18 erreur(s) restante(s)**

- **Ligne 264:5** [TS1005] ')' expected.
- **Ligne 264:6** [TS1128] Declaration or statement expected.
- **Ligne 265:3** [TS1128] Declaration or statement expected.
- **Ligne 377:5** [TS1128] Declaration or statement expected.
- **Ligne 378:3** [TS1128] Declaration or statement expected.
- ... et 13 autre(s) erreur(s)

### server/middleware/monday-webhook.ts

**3 erreur(s) restante(s)**

- **Ligne 89:6** [TS1128] Declaration or statement expected.
- **Ligne 91:3** [TS1128] Declaration or statement expected.
- **Ligne 92:1** [TS1128] Declaration or statement expected.

### server/modules/admin/routes.ts

**7 erreur(s) restante(s)**

- **Ligne 590:5** [TS1128] Declaration or statement expected.
- **Ligne 590:6** [TS1005] ')' expected.
- **Ligne 594:7** [TS1128] Declaration or statement expected.
- **Ligne 595:5** [TS1128] Declaration or statement expected.
- **Ligne 595:6** [TS1128] Declaration or statement expected.
- ... et 2 autre(s) erreur(s)

### server/modules/aftersales/routes.ts

**25 erreur(s) restante(s)**

- **Ligne 94:11** [TS1005] ')' expected.
- **Ligne 97:5** [TS1128] Declaration or statement expected.
- **Ligne 97:6** [TS1128] Declaration or statement expected.
- **Ligne 98:3** [TS1128] Declaration or statement expected.
- **Ligne 141:11** [TS1005] ')' expected.
- ... et 20 autre(s) erreur(s)

### server/modules/alerts/routes.ts

**56 erreur(s) restante(s)**

- **Ligne 213:11** [TS1005] ')' expected.
- **Ligne 216:5** [TS1128] Declaration or statement expected.
- **Ligne 216:6** [TS1128] Declaration or statement expected.
- **Ligne 217:3** [TS1128] Declaration or statement expected.
- **Ligne 244:11** [TS1005] ')' expected.
- ... et 51 autre(s) erreur(s)

### server/modules/analytics/routes.ts

**50 erreur(s) restante(s)**

- **Ligne 699:11** [TS1005] ')' expected.
- **Ligne 702:5** [TS1128] Declaration or statement expected.
- **Ligne 702:6** [TS1128] Declaration or statement expected.
- **Ligne 703:3** [TS1128] Declaration or statement expected.
- **Ligne 753:11** [TS1005] ')' expected.
- ... et 45 autre(s) erreur(s)

### server/modules/batigest/routes.ts

**9 erreur(s) restante(s)**

- **Ligne 285:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 288:8** [TS1005] ';' expected.
- **Ligne 288:19** [TS1109] Expression expected.
- **Ligne 291:3** [TS1128] Declaration or statement expected.
- **Ligne 378:11** [TS1005] ',' expected.
- ... et 4 autre(s) erreur(s)

### server/modules/chatbot/routes.ts

**20 erreur(s) restante(s)**

- **Ligne 180:11** [TS1005] ')' expected.
- **Ligne 189:5** [TS1128] Declaration or statement expected.
- **Ligne 189:6** [TS1128] Declaration or statement expected.
- **Ligne 190:3** [TS1128] Declaration or statement expected.
- **Ligne 454:11** [TS1005] ')' expected.
- ... et 15 autre(s) erreur(s)

### server/modules/commercial/routes.ts

**44 erreur(s) restante(s)**

- **Ligne 265:6** [TS1434] Unexpected keyword or identifier.
- **Ligne 265:96** [TS1002] Unterminated string literal.
- **Ligne 267:9** [TS1005] ',' expected.
- **Ligne 271:5** [TS1128] Declaration or statement expected.
- **Ligne 271:6** [TS1128] Declaration or statement expected.
- ... et 39 autre(s) erreur(s)

### server/modules/documents/pdf/ImageIntegrator.ts

**96 erreur(s) restante(s)**

- **Ligne 159:6** [TS1005] 'try' expected.
- **Ligne 162:11** [TS1128] Declaration or statement expected.
- **Ligne 174:3** [TS1128] Declaration or statement expected.
- **Ligne 179:3** [TS1128] Declaration or statement expected.
- **Ligne 179:11** [TS1434] Unexpected keyword or identifier.
- ... et 91 autre(s) erreur(s)

### server/modules/documents/pdf/LayoutOptimizer.ts

**44 erreur(s) restante(s)**

- **Ligne 192:47** [TS1005] ';' expected.
- **Ligne 192:53** [TS1110] Type expected.
- **Ligne 194:45** [TS1005] ';' expected.
- **Ligne 194:51** [TS1110] Type expected.
- **Ligne 194:64** [TS1005] ';' expected.
- ... et 39 autre(s) erreur(s)

### server/modules/documents/pdf/PDFTemplateEngine.ts

**34 erreur(s) restante(s)**

- **Ligne 357:5** [TS1128] Declaration or statement expected.
- **Ligne 360:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 369:5** [TS1128] Declaration or statement expected.
- **Ligne 370:3** [TS1128] Declaration or statement expected.
- **Ligne 375:3** [TS1128] Declaration or statement expected.
- ... et 29 autre(s) erreur(s)

### server/modules/documents/pdf/PlaceholderResolver.ts

**69 erreur(s) restante(s)**

- **Ligne 162:5** [TS1434] Unexpected keyword or identifier.
- **Ligne 162:11** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 162:17** [TS1003] Identifier expected.
- **Ligne 162:40** [TS1138] Parameter declaration expected.
- **Ligne 163:25** [TS1005] ',' expected.
- ... et 64 autre(s) erreur(s)

### server/modules/documents/pdf/TemplateValidator.ts

**140 erreur(s) restante(s)**

- **Ligne 152:11** [TS1005] ';' expected.
- **Ligne 152:20** [TS1434] Unexpected keyword or identifier.
- **Ligne 152:25** [TS1434] Unexpected keyword or identifier.
- **Ligne 152:43** [TS1005] ',' expected.
- **Ligne 152:48** [TS1005] ':' expected.
- ... et 135 autre(s) erreur(s)

### server/modules/hr/routes.ts

**15 erreur(s) restante(s)**

- **Ligne 78:11** [TS1005] ')' expected.
- **Ligne 81:5** [TS1128] Declaration or statement expected.
- **Ligne 81:6** [TS1128] Declaration or statement expected.
- **Ligne 82:3** [TS1128] Declaration or statement expected.
- **Ligne 131:11** [TS1005] ')' expected.
- ... et 10 autre(s) erreur(s)

### server/modules/monday/export-integration.ts

**6 erreur(s) restante(s)**

- **Ligne 80:3** [TS1128] Declaration or statement expected.
- **Ligne 80:4** [TS1128] Declaration or statement expected.
- **Ligne 137:5** [TS1128] Declaration or statement expected.
- **Ligne 138:3** [TS1128] Declaration or statement expected.
- **Ligne 138:4** [TS1128] Declaration or statement expected.
- ... et 1 autre(s) erreur(s)

### server/modules/monday/routes.ts

**20 erreur(s) restante(s)**

- **Ligne 1008:18** [TS1005] ';' expected.
- **Ligne 1008:41** [TS1434] Unexpected keyword or identifier.
- **Ligne 1008:45** [TS1434] Unexpected keyword or identifier.
- **Ligne 1008:59** [TS1443] Module declaration names may only use ' or " quoted strings.
- **Ligne 1043:23** [TS1434] Unexpected keyword or identifier.
- ... et 15 autre(s) erreur(s)

### server/modules/projects/routes.ts

**40 erreur(s) restante(s)**

- **Ligne 881:11** [TS1005] ')' expected.
- **Ligne 884:5** [TS1128] Declaration or statement expected.
- **Ligne 884:6** [TS1128] Declaration or statement expected.
- **Ligne 885:3** [TS1128] Declaration or statement expected.
- **Ligne 923:11** [TS1005] ')' expected.
- ... et 35 autre(s) erreur(s)

### server/modules/stakeholders/routes.ts

**30 erreur(s) restante(s)**

- **Ligne 258:11** [TS1005] ')' expected.
- **Ligne 261:5** [TS1128] Declaration or statement expected.
- **Ligne 261:6** [TS1128] Declaration or statement expected.
- **Ligne 262:3** [TS1128] Declaration or statement expected.
- **Ligne 285:11** [TS1005] ')' expected.
- ... et 25 autre(s) erreur(s)

### server/modules/suppliers/routes.ts

**25 erreur(s) restante(s)**

- **Ligne 355:11** [TS1005] ')' expected.
- **Ligne 358:5** [TS1128] Declaration or statement expected.
- **Ligne 358:6** [TS1128] Declaration or statement expected.
- **Ligne 359:3** [TS1128] Declaration or statement expected.
- **Ligne 391:11** [TS1005] ')' expected.
- ... et 20 autre(s) erreur(s)

### server/modules/testing/routes.ts

**21 erreur(s) restante(s)**

- **Ligne 48:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 51:8** [TS1005] ';' expected.
- **Ligne 51:19** [TS1109] Expression expected.
- **Ligne 54:3** [TS1128] Declaration or statement expected.
- **Ligne 55:6** [TS1128] Declaration or statement expected.
- ... et 16 autre(s) erreur(s)

### server/monitoring/notifier.ts

**133 erreur(s) restante(s)**

- **Ligne 98:5** [TS1128] Declaration or statement expected.
- **Ligne 102:5** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 103:3** [TS1128] Declaration or statement expected.
- **Ligne 108:3** [TS1128] Declaration or statement expected.
- **Ligne 108:34** [TS1005] ',' expected.
- ... et 128 autre(s) erreur(s)

### server/objectStorage.ts

**71 erreur(s) restante(s)**

- **Ligne 179:5** [TS1128] Declaration or statement expected.
- **Ligne 182:3** [TS1128] Declaration or statement expected.
- **Ligne 185:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 185:35** [TS1005] ';' expected.
- **Ligne 186:11** [TS1005] ':' expected.
- ... et 66 autre(s) erreur(s)

### server/ocrService.ts

**430 erreur(s) restante(s)**

- **Ligne 88:6** [TS1005] ',' expected.
- **Ligne 116:7** [TS1128] Declaration or statement expected.
- **Ligne 116:8** [TS1128] Declaration or statement expected.
- **Ligne 125:5** [TS1128] Declaration or statement expected.
- **Ligne 126:3** [TS1128] Declaration or statement expected.
- ... et 425 autre(s) erreur(s)

### server/replitAuth.ts

**12 erreur(s) restante(s)**

- **Ligne 279:8** [TS1005] ',' expected.
- **Ligne 282:3** [TS1128] Declaration or statement expected.
- **Ligne 400:5** [TS1128] Declaration or statement expected.
- **Ligne 401:3** [TS1128] Declaration or statement expected.
- **Ligne 401:4** [TS1128] Declaration or statement expected.
- ... et 7 autre(s) erreur(s)

### server/routes.ts

**5 erreur(s) restante(s)**

- **Ligne 205:10** [TS1005] ',' expected.
- **Ligne 207:5** [TS1128] Declaration or statement expected.
- **Ligne 208:3** [TS1128] Declaration or statement expected.
- **Ligne 208:4** [TS1128] Declaration or statement expected.
- **Ligne 221:1** [TS1128] Declaration or statement expected.

### server/routes/ai-service.ts

**6 erreur(s) restante(s)**

- **Ligne 516:5** [TS1128] Declaration or statement expected.
- **Ligne 524:3** [TS1005] ',' expected.
- **Ligne 524:5** [TS1005] ')' expected.
- **Ligne 550:1** [TS1128] Declaration or statement expected.
- **Ligne 550:2** [TS1128] Declaration or statement expected.
- ... et 1 autre(s) erreur(s)

### server/routes/monitoring.ts

**65 erreur(s) restante(s)**

- **Ligne 103:5** [TS1128] Declaration or statement expected.
- **Ligne 104:3** [TS1128] Declaration or statement expected.
- **Ligne 105:1** [TS1128] Declaration or statement expected.
- **Ligne 105:2** [TS1128] Declaration or statement expected.
- **Ligne 150:5** [TS1128] Declaration or statement expected.
- ... et 60 autre(s) erreur(s)

### server/scripts/migrate-from-monday.ts

**177 erreur(s) restante(s)**

- **Ligne 240:5** [TS1127] Invalid character.
- **Ligne 279:1** [TS1127] Invalid character.
- **Ligne 279:2** [TS1127] Invalid character.
- **Ligne 279:3** [TS1127] Invalid character.
- **Ligne 279:4** [TS1127] Invalid character.
- ... et 172 autre(s) erreur(s)

### server/seeders/dateIntelligenceRulesSeeder.ts

**88 erreur(s) restante(s)**

- **Ligne 60:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 63:8** [TS1005] ';' expected.
- **Ligne 63:40** [TS1109] Expression expected.
- **Ligne 66:3** [TS1128] Declaration or statement expected.
- **Ligne 69:7** [TS1434] Unexpected keyword or identifier.
- ... et 83 autre(s) erreur(s)

### server/seeders/mondaySeed-simple.ts

**102 erreur(s) restante(s)**

- **Ligne 187:3** [TS1128] Declaration or statement expected.
- **Ligne 189:3** [TS1128] Declaration or statement expected.
- **Ligne 189:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 189:32** [TS1005] ';' expected.
- **Ligne 215:3** [TS1128] Declaration or statement expected.
- ... et 97 autre(s) erreur(s)

### server/seeders/mondaySeed.ts

**156 erreur(s) restante(s)**

- **Ligne 198:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 201:8** [TS1005] ';' expected.
- **Ligne 201:23** [TS1109] Expression expected.
- **Ligne 204:3** [TS1128] Declaration or statement expected.
- **Ligne 208:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- ... et 151 autre(s) erreur(s)

### server/services/ActionExecutionService.ts

**236 erreur(s) restante(s)**

- **Ligne 241:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 242:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 243:5** [TS1128] Declaration or statement expected.
- **Ligne 244:3** [TS1128] Declaration or statement expected.
- **Ligne 249:3** [TS1434] Unexpected keyword or identifier.
- ... et 231 autre(s) erreur(s)

### server/services/AIService.ts

**285 erreur(s) restante(s)**

- **Ligne 619:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 622:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 642:5** [TS1128] Declaration or statement expected.
- **Ligne 643:3** [TS1128] Declaration or statement expected.
- **Ligne 652:3** [TS1128] Declaration or statement expected.
- ... et 280 autre(s) erreur(s)

### server/services/AuditService.ts

**196 erreur(s) restante(s)**

- **Ligne 205:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 206:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 207:5** [TS1128] Declaration or statement expected.
- **Ligne 208:3** [TS1128] Declaration or statement expected.
- **Ligne 213:3** [TS1434] Unexpected keyword or identifier.
- ... et 191 autre(s) erreur(s)

### server/services/BatigestExportService.ts

**21 erreur(s) restante(s)**

- **Ligne 295:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 297:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 307:5** [TS1128] Declaration or statement expected.
- **Ligne 308:3** [TS1128] Declaration or statement expected.
- **Ligne 313:3** [TS1434] Unexpected keyword or identifier.
- ... et 16 autre(s) erreur(s)

### server/services/BusinessContextService.ts

**451 erreur(s) restante(s)**

- **Ligne 200:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 202:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 218:5** [TS1128] Declaration or statement expected.
- **Ligne 219:3** [TS1128] Declaration or statement expected.
- **Ligne 228:3** [TS1434] Unexpected keyword or identifier.
- ... et 446 autre(s) erreur(s)

### server/services/CacheService.ts

**92 erreur(s) restante(s)**

- **Ligne 230:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 231:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 233:5** [TS1128] Declaration or statement expected.
- **Ligne 234:3** [TS1128] Declaration or statement expected.
- **Ligne 239:3** [TS1434] Unexpected keyword or identifier.
- ... et 87 autre(s) erreur(s)

### server/services/ChatbotOrchestrationService.ts

**471 erreur(s) restante(s)**

- **Ligne 787:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 790:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 811:5** [TS1128] Declaration or statement expected.
- **Ligne 812:3** [TS1128] Declaration or statement expected.
- **Ligne 821:3** [TS1128] Declaration or statement expected.
- ... et 466 autre(s) erreur(s)

### server/services/consolidated/BusinessAnalyticsService.ts

**94 erreur(s) restante(s)**

- **Ligne 238:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 239:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 245:5** [TS1128] Declaration or statement expected.
- **Ligne 246:3** [TS1128] Declaration or statement expected.
- **Ligne 248:3** [TS1434] Unexpected keyword or identifier.
- ... et 89 autre(s) erreur(s)

### server/services/consolidated/MondayDataService.ts

**170 erreur(s) restante(s)**

- **Ligne 182:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 185:8** [TS1005] ';' expected.
- **Ligne 185:30** [TS1109] Expression expected.
- **Ligne 188:3** [TS1128] Declaration or statement expected.
- **Ligne 447:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- ... et 165 autre(s) erreur(s)

### server/services/consolidated/MondayIntegrationService.ts

**90 erreur(s) restante(s)**

- **Ligne 753:7** [TS1005] ',' expected.
- **Ligne 870:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 873:8** [TS1005] ';' expected.
- **Ligne 873:37** [TS1109] Expression expected.
- **Ligne 876:3** [TS1128] Declaration or statement expected.
- ... et 85 autre(s) erreur(s)

### server/services/consolidated/MondayMigrationService.ts

**235 erreur(s) restante(s)**

- **Ligne 269:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 270:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 271:5** [TS1128] Declaration or statement expected.
- **Ligne 272:3** [TS1128] Declaration or statement expected.
- **Ligne 274:3** [TS1434] Unexpected keyword or identifier.
- ... et 230 autre(s) erreur(s)

### server/services/consolidated/TechnicalMetricsService.ts

**137 erreur(s) restante(s)**

- **Ligne 322:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 326:3** [TS1128] Declaration or statement expected.
- **Ligne 335:24** [TS1005] ';' expected.
- **Ligne 335:53** [TS1109] Expression expected.
- **Ligne 362:29** [TS1005] ';' expected.
- ... et 132 autre(s) erreur(s)

### server/services/ContextBuilderService.ts

**674 erreur(s) restante(s)**

- **Ligne 179:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 180:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 181:5** [TS1128] Declaration or statement expected.
- **Ligne 182:3** [TS1128] Declaration or statement expected.
- **Ligne 187:3** [TS1434] Unexpected keyword or identifier.
- ... et 669 autre(s) erreur(s)

### server/services/ContextCacheService.ts

**897 erreur(s) restante(s)**

- **Ligne 16:32** [TS1005] '{' expected.
- **Ligne 27:16** [TS1011] An element access expression should take an argument.
- **Ligne 30:1** [TS1005] ',' expected.
- **Ligne 115:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 118:8** [TS1005] ';' expected.
- ... et 892 autre(s) erreur(s)

### server/services/ContextTierService.ts

**286 erreur(s) restante(s)**

- **Ligne 186:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 190:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 204:5** [TS1128] Declaration or statement expected.
- **Ligne 205:3** [TS1128] Declaration or statement expected.
- **Ligne 214:3** [TS1128] Declaration or statement expected.
- ... et 281 autre(s) erreur(s)

### server/services/ContextualOCREngine.ts

**288 erreur(s) restante(s)**

- **Ligne 184:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 185:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 186:5** [TS1128] Declaration or statement expected.
- **Ligne 187:3** [TS1128] Declaration or statement expected.
- **Ligne 192:3** [TS1434] Unexpected keyword or identifier.
- ... et 283 autre(s) erreur(s)

### server/services/DateAlertDetectionService.ts

**411 erreur(s) restante(s)**

- **Ligne 256:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 257:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 259:3** [TS1128] Declaration or statement expected.
- **Ligne 265:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 265:42** [TS1005] ',' expected.
- ... et 406 autre(s) erreur(s)

### server/services/DateIntelligenceService.ts

**142 erreur(s) restante(s)**

- **Ligne 240:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 242:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 243:5** [TS1128] Declaration or statement expected.
- **Ligne 244:3** [TS1128] Declaration or statement expected.
- **Ligne 247:3** [TS1128] Declaration or statement expected.
- ... et 137 autre(s) erreur(s)

### server/services/DocumentSyncService.ts

**31 erreur(s) restante(s)**

- **Ligne 137:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 140:8** [TS1005] ';' expected.
- **Ligne 140:32** [TS1109] Expression expected.
- **Ligne 143:3** [TS1128] Declaration or statement expected.
- **Ligne 149:7** [TS1005] ',' expected.
- ... et 26 autre(s) erreur(s)

### server/services/emailService.ts

**93 erreur(s) restante(s)**

- **Ligne 392:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 393:7** [TS1434] Unexpected keyword or identifier.
- **Ligne 393:13** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 393:20** [TS1003] Identifier expected.
- **Ligne 393:46** [TS1138] Parameter declaration expected.
- ... et 88 autre(s) erreur(s)

### server/services/MicrosoftOAuthService.ts

**8 erreur(s) restante(s)**

- **Ligne 154:13** [TS1005] ')' expected.
- **Ligne 158:5** [TS1128] Declaration or statement expected.
- **Ligne 158:6** [TS1128] Declaration or statement expected.
- **Ligne 163:3** [TS1128] Declaration or statement expected.
- **Ligne 164:1** [TS1128] Declaration or statement expected.
- ... et 3 autre(s) erreur(s)

### server/services/MondayDataSplitter.ts

**5 erreur(s) restante(s)**

- **Ligne 368:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 371:8** [TS1005] ';' expected.
- **Ligne 371:31** [TS1109] Expression expected.
- **Ligne 374:3** [TS1128] Declaration or statement expected.
- **Ligne 384:1** [TS1160] Unterminated template literal.

### server/services/MondayImportService.ts

**43 erreur(s) restante(s)**

- **Ligne 234:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 237:8** [TS1005] ';' expected.
- **Ligne 237:32** [TS1109] Expression expected.
- **Ligne 240:3** [TS1128] Declaration or statement expected.
- **Ligne 240:5** [TS1128] Declaration or statement expected.
- ... et 38 autre(s) erreur(s)

### server/services/MondayMigrationService.ts

**106 erreur(s) restante(s)**

- **Ligne 172:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 173:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 174:5** [TS1128] Declaration or statement expected.
- **Ligne 175:3** [TS1128] Declaration or statement expected.
- **Ligne 181:3** [TS1434] Unexpected keyword or identifier.
- ... et 101 autre(s) erreur(s)

### server/services/MondayMigrationServiceEnhanced.ts

**139 erreur(s) restante(s)**

- **Ligne 161:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 164:8** [TS1005] ';' expected.
- **Ligne 164:43** [TS1109] Expression expected.
- **Ligne 167:3** [TS1128] Declaration or statement expected.
- **Ligne 168:14** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- ... et 134 autre(s) erreur(s)

### server/services/MondayProductionFinalService.ts

**244 erreur(s) restante(s)**

- **Ligne 218:8** [TS1128] Declaration or statement expected.
- **Ligne 220:5** [TS1128] Declaration or statement expected.
- **Ligne 221:3** [TS1128] Declaration or statement expected.
- **Ligne 227:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 227:34** [TS1005] ';' expected.
- ... et 239 autre(s) erreur(s)

### server/services/MondayProductionMigrationService.ts

**178 erreur(s) restante(s)**

- **Ligne 263:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 264:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 265:5** [TS1128] Declaration or statement expected.
- **Ligne 266:3** [TS1128] Declaration or statement expected.
- **Ligne 272:24** [TS1005] ';' expected.
- ... et 173 autre(s) erreur(s)

### server/services/MondaySchemaAnalyzer.ts

**74 erreur(s) restante(s)**

- **Ligne 99:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 100:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 101:5** [TS1128] Declaration or statement expected.
- **Ligne 102:3** [TS1128] Declaration or statement expected.
- **Ligne 110:3** [TS1434] Unexpected keyword or identifier.
- ... et 69 autre(s) erreur(s)

### server/services/MondayWebhookService.ts

**5 erreur(s) restante(s)**

- **Ligne 131:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 132:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 133:5** [TS1128] Declaration or statement expected.
- **Ligne 134:3** [TS1128] Declaration or statement expected.
- **Ligne 135:1** [TS1128] Declaration or statement expected.

### server/services/OneDriveService.ts

**76 erreur(s) restante(s)**

- **Ligne 394:57** [TS1005] ';' expected.
- **Ligne 394:58** [TS1161] Unterminated regular expression literal.
- **Ligne 394:84** [TS1005] ';' expected.
- **Ligne 394:85** [TS1128] Declaration or statement expected.
- **Ligne 397:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- ... et 71 autre(s) erreur(s)

### server/services/OneDriveSyncService.ts

**49 erreur(s) restante(s)**

- **Ligne 82:6** [TS1472] 'catch' or 'finally' expected.
- **Ligne 85:8** [TS1005] ';' expected.
- **Ligne 85:32** [TS1109] Expression expected.
- **Ligne 88:3** [TS1128] Declaration or statement expected.
- **Ligne 88:5** [TS1128] Declaration or statement expected.
- ... et 44 autre(s) erreur(s)

### server/services/pdfGeneratorService.ts

**162 erreur(s) restante(s)**

- **Ligne 103:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 104:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 105:5** [TS1128] Declaration or statement expected.
- **Ligne 106:3** [TS1128] Declaration or statement expected.
- **Ligne 111:3** [TS1128] Declaration or statement expected.
- ... et 157 autre(s) erreur(s)

### server/services/PeriodicDetectionScheduler.ts

**330 erreur(s) restante(s)**

- **Ligne 192:2** [TS1128] Declaration or statement expected.
- **Ligne 192:18** [TS1005] ';' expected.
- **Ligne 195:3** [TS1128] Declaration or statement expected.
- **Ligne 197:3** [TS1128] Declaration or statement expected.
- **Ligne 197:11** [TS1434] Unexpected keyword or identifier.
- ... et 325 autre(s) erreur(s)

### server/services/PredictiveEngineService.ts

**700 erreur(s) restante(s)**

- **Ligne 183:39** [TS1005] '{' expected.
- **Ligne 190:30** [TS1011] An element access expression should take an argument.
- **Ligne 191:25** [TS1011] An element access expression should take an argument.
- **Ligne 196:1** [TS1005] ',' expected.
- **Ligne 428:6** [TS1472] 'catch' or 'finally' expected.
- ... et 695 autre(s) erreur(s)

### server/services/RBACService.ts

**136 erreur(s) restante(s)**

- **Ligne 115:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 116:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 117:5** [TS1128] Declaration or statement expected.
- **Ligne 118:3** [TS1128] Declaration or statement expected.
- **Ligne 125:3** [TS1434] Unexpected keyword or identifier.
- ... et 131 autre(s) erreur(s)

### server/services/RedisCacheAdapter.ts

**58 erreur(s) restante(s)**

- **Ligne 124:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 125:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 126:5** [TS1128] Declaration or statement expected.
- **Ligne 127:3** [TS1128] Declaration or statement expected.
- **Ligne 129:3** [TS1434] Unexpected keyword or identifier.
- ... et 53 autre(s) erreur(s)

### server/services/resilience.ts

**12 erreur(s) restante(s)**

- **Ligne 183:6** [TS1128] Declaration or statement expected.
- **Ligne 185:3** [TS1128] Declaration or statement expected.
- **Ligne 186:1** [TS1128] Declaration or statement expected.
- **Ligne 215:6** [TS1128] Declaration or statement expected.
- **Ligne 217:3** [TS1128] Declaration or statement expected.
- ... et 7 autre(s) erreur(s)

### server/services/SafetyGuardsService.ts

**161 erreur(s) restante(s)**

- **Ligne 308:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 310:3** [TS1128] Declaration or statement expected.
- **Ligne 315:3** [TS1128] Declaration or statement expected.
- **Ligne 315:11** [TS1434] Unexpected keyword or identifier.
- **Ligne 315:37** [TS1005] ';' expected.
- ... et 156 autre(s) erreur(s)

### server/services/scoringService.ts

**24 erreur(s) restante(s)**

- **Ligne 110:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 111:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 112:5** [TS1128] Declaration or statement expected.
- **Ligne 113:3** [TS1128] Declaration or statement expected.
- **Ligne 118:3** [TS1128] Declaration or statement expected.
- ... et 19 autre(s) erreur(s)

### server/services/SQLEngineService.ts

**327 erreur(s) restante(s)**

- **Ligne 527:6** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 529:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 537:5** [TS1128] Declaration or statement expected.
- **Ligne 538:3** [TS1128] Declaration or statement expected.
- **Ligne 547:3** [TS1434] Unexpected keyword or identifier.
- ... et 322 autre(s) erreur(s)

### server/services/SyncAuditService.ts

**20 erreur(s) restante(s)**

- **Ligne 85:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 87:3** [TS1128] Declaration or statement expected.
- **Ligne 89:3** [TS1128] Declaration or statement expected.
- **Ligne 89:33** [TS1005] ';' expected.
- **Ligne 163:5** [TS1128] Declaration or statement expected.
- ... et 15 autre(s) erreur(s)

### server/services/SyncScheduler.ts

**52 erreur(s) restante(s)**

- **Ligne 72:8** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 73:7** [TS1068] Unexpected token. A constructor, method, accessor, or property was expected.
- **Ligne 74:5** [TS1128] Declaration or statement expected.
- **Ligne 75:3** [TS1128] Declaration or statement expected.
- **Ligne 77:9** [TS1005] ';' expected.
- ... et 47 autre(s) erreur(s)

### server/storage-poc.ts

**2975 erreur(s) restante(s)**

- **Ligne 1036:11** [TS1003] Identifier expected.
- **Ligne 1036:17** [TS1005] ',' expected.
- **Ligne 1036:25** [TS1005] ',' expected.
- **Ligne 1036:39** [TS1005] ';' expected.
- **Ligne 1132:15** [TS1005] ')' expected.
- ... et 2970 autre(s) erreur(s)

### server/storage/analytics/KpiRepository.ts

**4 erreur(s) restante(s)**

- **Ligne 479:8** [TS1128] Declaration or statement expected.
- **Ligne 481:5** [TS1128] Declaration or statement expected.
- **Ligne 482:3** [TS1128] Declaration or statement expected.
- **Ligne 483:1** [TS1128] Declaration or statement expected.

### server/storage/base/BaseRepository.ts

**214 erreur(s) restante(s)**

- **Ligne 301:10** [TS1128] Declaration or statement expected.
- **Ligne 304:3** [TS1128] Declaration or statement expected.
- **Ligne 323:3** [TS1434] Unexpected keyword or identifier.
- **Ligne 323:20** [TS1005] ',' expected.
- **Ligne 323:34** [TS1109] Expression expected.
- ... et 209 autre(s) erreur(s)

### server/test-business-context-enrichment.ts

**3 erreur(s) restante(s)**

- **Ligne 198:6** [TS1128] Declaration or statement expected.
- **Ligne 200:3** [TS1128] Declaration or statement expected.
- **Ligne 201:1** [TS1128] Declaration or statement expected.

### server/utils/database-helpers.ts

**7 erreur(s) restante(s)**

- **Ligne 249:10** [TS1128] Declaration or statement expected.
- **Ligne 270:5** [TS1128] Declaration or statement expected.
- **Ligne 271:3** [TS1128] Declaration or statement expected.
- **Ligne 276:1** [TS1128] Declaration or statement expected.
- **Ligne 331:6** [TS1128] Declaration or statement expected.
- ... et 2 autre(s) erreur(s)

### server/utils/retry-service.ts

**1 erreur(s) restante(s)**

- **Ligne 138:1** [TS1128] Declaration or statement expected.

### server/utils/safe-query.ts

**10 erreur(s) restante(s)**

- **Ligne 129:1** [TS1128] Declaration or statement expected.
- **Ligne 249:6** [TS1128] Declaration or statement expected.
- **Ligne 251:3** [TS1128] Declaration or statement expected.
- **Ligne 252:1** [TS1128] Declaration or statement expected.
- **Ligne 278:6** [TS1128] Declaration or statement expected.
- ... et 5 autre(s) erreur(s)

### server/utils/shared-utils.ts

**1 erreur(s) restante(s)**

- **Ligne 325:1** [TS1128] Declaration or statement expected.



---

## 🎯 Prochaines Étapes

1. **Corriger manuellement les erreurs restantes**
   - Erreurs de types complexes
   - Erreurs de logique métier
   - Erreurs nécessitant une analyse approfondie

2. **Vérifier les corrections automatiques**
   - Tester les fichiers corrigés
   - Vérifier que les corrections n'ont pas introduit de régressions

3. **Exécuter les tests**
   - `npm test` - Tests unitaires
   - `npm run test:e2e` - Tests E2E

---

**Note:** Ce rapport est généré automatiquement. Les corrections automatiques peuvent nécessiter une vérification manuelle.

