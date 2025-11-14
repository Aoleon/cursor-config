# Rapport de Détection - Try-Catch et Retry Manuels

**Date:** 2025-11-13
**Fichiers analysés:** 23
**Total try-catch manuels:** 179
**Total retry manuels:** 5
**Try-catch remplaçables:** 31
**Retry remplaçables:** 1

---

## 📊 Résumé

| Type | Total | Remplaçables | Non remplaçables |
|------|-------|--------------|------------------|
| Try-catch manuels | 179 | 31 | 148 |
| Retry manuels | 5 | 1 | 4 |

---

## 📁 Détails par Fichier

### server/middleware/db-error-handler.ts

**Try-catch manuels:** 1

- Ligne 308: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       await handler(req, res, next);     } catch (error) {       // Check if it's a database-related error       const errorInfo = extractErrorInfo(error);              if (errorInfo.code || err...
  ```

---

### server/middleware/validation.ts

**Try-catch manuels:** 4

- Ligne 65: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const dataToValidate = req[source];              // Configuration par défaut       const opts = {         strict: false,         stripUnknown: true,         ...options       };        // A...
  ```

- Ligne 210: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         // Express 5 SOLUTION DÉFINITIVE: Deep mutation pour nested objects         const validatedBody = validations.body.parse(req.body);         deepMutate(req.body as Record<string, unknown>...
  ```

- Ligne 229: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         // Express 5 SOLUTION DÉFINITIVE: Deep mutation pour nested objects         const validatedParams = validations.params.parse(req.params);         deepMutate(req.params as Record<string, ...
  ```

- Ligne 248: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         // Express 5 SOLUTION DÉFINITIVE: Deep mutation pour nested objects         const validatedQuery = validations.query.parse(req.query);         deepMutate(req.query as Record<string, unkn...
  ```

---

### server/modules/documents/coreRoutes.ts

**Try-catch manuels:** 1

- Ligne 193: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         const regex = new RegExp(pattern, 'i');         ocrService.addCustomPattern(field, regex);                  eventBus.emit('ocr:pattern:added', {           field,           userId: req.us...
  ```

---

### server/modules/system/routes.ts

**Try-catch manuels:** 4

- Ligne 41: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     const start = Date.now();     await db.execute(sql`SELECT 1`);     return {       status: 'healthy',       responseTime: Date.now() - start     };   } catch (error) {     return {       stat...
  ```

- Ligne 70: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     const start = Date.now();     const mondayBreaker = circuitBreakerManager.getOrCreate('monday');          await mondayBreaker.execute(async () => {       return true;     });          return...
  ```

- Ligne 97: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     const start = Date.now();     const openaiBreaker = circuitBreakerManager.getOrCreate('openai');          await openaiBreaker.execute(async () => {       return true;     });          return...
  ```

- Ligne 124: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     const start = Date.now();     const sendgridBreaker = circuitBreakerManager.getOrCreate('sendgrid');          await sendgridBreaker.execute(async () => {       return true;     });          ...
  ```

---

### server/scripts/test-kpi-optimization.ts

**Try-catch manuels:** 1

- Ligne 26: ✅ Remplaçable (avec logger)
  ```typescript
  try {     logger.info('📊 Fetching consolidated KPIs...');     logger.info(`   Period: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);     logger.info(`   Granulari...
  ```

---

### server/seeders/mondaySeed.ts

**Retry manuels:** 1

- Ligne 348: ⚠️ Non remplaçable
  ```typescript
  for (let i = 0; i < 5; i++) {         const company = this.generator.selectFromArray(CLIENT_COMPANIES, `company-${i}`);         const city = this.generator.selectFromArray(NORD_CITIES, `city-${i}`);  ...
  ```

---

### server/services/CacheService.ts

**Try-catch manuels:** 7

- Ligne 195: ✅ Remplaçable (avec logger)
  ```typescript
  try {       const value = await this.adapter.get<T>(key);              if (value !== null) {         this.hits++;         logger.debug('[CacheService] Cache hit', { metadata: {             service: 'C...
  ```

- Ligne 242: ✅ Remplaçable (avec logger)
  ```typescript
  try {       await this.adapter.set(key, value, ttlSeconds);              logger.debug('[CacheService] Valeur mise en cache', { metadata: {           service: 'CacheService',           operation: 'set'...
  ```

- Ligne 268: ✅ Remplaçable (avec logger)
  ```typescript
  try {       await this.adapter.del(key);              logger.info('[CacheService] Clé invalidée', { metadata: {           service: 'CacheService',           operation: 'invalidate',           key     ...
  ```

- Ligne 293: ✅ Remplaçable (avec logger)
  ```typescript
  try {       const keys = await this.adapter.keys();       const regex = new RegExp(pattern.replace(/\*/g, '.*'));              const matchingKeys = keys.filter(key => regex.test(key));              fo...
  ```

- Ligne 326: ✅ Remplaçable (avec logger)
  ```typescript
  try {       await this.adapter.flush();       this.hits = 0;       this.misses = 0;              logger.info('[CacheService] Cache complètement vidé', { metadata: {           service: 'CacheService', ...
  ```

*... et 2 autres*

---

### server/services/MondayProductionMigrationService.ts

**Retry manuels:** 1

- Ligne 287: ⚠️ Non remplaçable
  ```typescript
  for (let i = 0; i < count; i++) {       // Distribution clients selon patterns analysés       const clientName = this.weightedRandomChoice(JLM_PRODUCTION_CLIENTS, [0.3, 0.25, 0.2, 0.1, 0.08, 0.04, 0.0...
  ```

---

### server/services/agent/AgentMetricsService.ts

**Try-catch manuels:** 5

- Ligne 82: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       if (!existsSync(this.metricsDir)) {         await mkdir(this.metricsDir, { recursive: true });       }        // Initialiser fichiers si n'existent pas       if (!existsSync(this.metricsFi...
  ```

- Ligne 113: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       await this.initialize();        const existing = await this.loadMetrics();       existing.push(metrics);        await writeFile(this.metricsFile, JSON.stringify(existing, null, 2));     } ...
  ```

- Ligne 129: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       if (!existsSync(this.metricsFile)) {         return [];       }        const content = await readFile(this.metricsFile, 'utf-8');       return JSON.parse(content) as TaskMetrics[];     } c...
  ```

- Ligne 150: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       await this.initialize();        const usage = await this.loadRuleUsage();        if (!usage.rules[ruleName]) {         usage.rules[ruleName] = {           priority,           totalLoads: 0...
  ```

- Ligne 197: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       if (!existsSync(this.ruleUsageFile)) {         return {           rules: {},           summary: {             totalRules: 0,             rulesWithHighUsage: 0,             rulesWithLowUsag...
  ```

---

### server/services/monday/extractors/AOBaseExtractor.ts

**Try-catch manuels:** 1

- Ligne 29: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         let value: unknown;         const fieldName = mapping.saxiumField as keyof InsertAo;                  // Cas spécial : 'name' est un champ direct de l'item, pas dans column_values       ...
  ```

---

### server/services/pdfGeneratorService.ts

**Try-catch manuels:** 10

- Ligne 48: ✅ Remplaçable (avec logger)
  ```typescript
  try {       // Démarrage de Puppeteer avec configuration optimisée       if (!this.browser) {         this.browser = await puppeteer.launch({           headless: true,           args: [             '-...
  ```

- Ligne 123: ✅ Remplaçable (avec logger)
  ```typescript
  try {       // Création d'une nouvelle page       page = await this.browser.newPage();              // Configuration de la page       await page.setViewport({         width: 1200,         height: 1600...
  ```

- Ligne 203: ✅ Remplaçable (avec logger)
  ```typescript
  try {           await page.close();         } catch (error) {           logger.warn('[PDFGeneratorService] Erreur lors de la fermeture de la page', { metadata: {               service: 'PDFGeneratorSe...
  ```

- Ligne 227: ✅ Remplaçable (avec logger)
  ```typescript
  try {       const html = this.template(data);       logger.info('DPGF preview HTML generated successfully', { metadata: {           service: 'PDFGeneratorService',           operation: 'generateDpgfPr...
  ```

- Ligne 256: ✅ Remplaçable (avec logger)
  ```typescript
  try {         await this.browser.close();         this.browser = null;         logger.info('Puppeteer browser closed', { metadata: {             service: 'PDFGeneratorService',                   opera...
  ```

*... et 5 autres*

---

### server/storage/analytics/KpiRepository.ts

**Try-catch manuels:** 1

- Ligne 169: ✅ Remplaçable (avec logger)
  ```typescript
  try {       // Single optimized query with CTEs       // Note: Using literal SQL for INTERVAL to avoid type inference issues       const intervalValue = granularity === 'week' ? "'1 week'" : "'1 day'"...
  ```

---

### server/storage/facade/StorageFacade.ts

**Try-catch manuels:** 121

- Ligne 176: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const users = await this.userRepository.getUsers();       this.facadeLogger.info('Utilisateurs récupérés via UserRepository', {               metadata: {           count: users.length,    ...
  ```

- Ligne 203: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const user = await this.userRepository.getUser(id);       if (user) {         this.facadeLogger.info('Utilisateur récupéré via UserRepository', {                 metadata: {           id, ...
  ```

- Ligne 235: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const resources = await this.userRepository.getTeamResources(projectId);       this.facadeLogger.info('Ressources d\'équipe récupérées via UserRepository', {         metadata: {           ...
  ```

- Ligne 264: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const created = await this.userRepository.createTeamResource(resource);       this.facadeLogger.info('Ressource d\'équipe créée via UserRepository', {               metadata: {           i...
  ```

- Ligne 292: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const updated = await this.userRepository.updateTeamResource(id, resource);       this.facadeLogger.info('Ressource d\'équipe mise à jour via UserRepository', {               metadata: {  ...
  ```

*... et 116 autres*

---

### server/storage-poc.ts

**Retry manuels:** 1

- Ligne 2783: ✅ Remplaçable
  ```typescript
  for (let i = 0; i < 32; i++) {       token += chars.charAt(Math.floor(Math.random() * chars.length));     }     return token;   }    // ========================================   // AO LOT SUPPLIERS O...
  ```

---

### server/test-analytics-authenticated.ts

**Try-catch manuels:** 2

- Ligne 13: ✅ Remplaçable (avec logger)
  ```typescript
  try {     logger.info('🔐 Connexion avec auth basique...');          const response = await fetch(`${BASE_URL}/api/login/basic`, {       method: 'POST',       headers: {         'Content-Type': 'appli...
  ```

- Ligne 49: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     const controller = new AbortController();     setTimeout(() => controller.abort(), 5000);          const response = await fetch(`${BASE_URL}${endpoint}`, {       headers: {         'Cookie':...
  ```

---

### server/test-analytics-runtime.ts

**Try-catch manuels:** 2

- Ligne 36: ✅ Remplaçable (avec logger)
  ```typescript
  try {     logger.info(`Testing ${endpoint}...`);          // Test basic auth pour simplicité     const controller = new AbortController();     setTimeout(() => controller.abort(), 10000);          con...
  ```

- Ligne 192: ✅ Remplaçable (avec logger)
  ```typescript
  try {     logger.info('Attente démarrage serveur...');     await new Promise(resolve => setTimeout(resolve, 2000));          const results = await runAllTests();     await generateReport(results);    ...
  ```

---

### server/test-ocr-ao.ts

**Try-catch manuels:** 1

- Ligne 26: ✅ Remplaçable (avec logger)
  ```typescript
  try {       // Lire le fichier PDF       const pdfBuffer = fs.readFileSync(pdfFile);              // Analyser avec OCR       logger.info('⏳ Extraction OCR en cours...');       const extractedData = aw...
  ```

---

### server/utils/database-helpers.ts

**Retry manuels:** 1

- Ligne 191: ⚠️ Non remplaçable
  ```typescript
  for (let attempt = 0; attempt < retries; attempt++) {     try {       // Log transaction start       logger.debug('Starting database transaction', { metadata: {           module: 'DatabaseHelpers',   ...
  ```

---

### server/utils/error-handler.ts

**Try-catch manuels:** 1

- Ligne 93: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       return await fn(...args);     } catch (error) {       throw normalizeError(error);     }
  ```

---

### server/utils/mondayValidator.ts

**Try-catch manuels:** 4

- Ligne 415: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     // ÉTAPE 1: Normalisation des enums case-insensitive     const preprocessedData = normalizeEnums(data);          // ÉTAPE 2: Validation schema de base     let validatedData = mondayAoSchema....
  ```

- Ligne 446: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {     // ÉTAPE 1: Normalisation des enums case-insensitive     const preprocessedData = normalizeEnums(data);          // ÉTAPE 2: Validation schema de base     let validatedData = mondayProjectSc...
  ```

- Ligne 686: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const validatedData = validateMondayAoData(aoData);       results.valid.push(validatedData);       results.summary.valid++;     } catch (error) {       results.invalid.push({         data:...
  ```

- Ligne 728: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const validatedData = validateMondayProjectData(projectData);       results.valid.push(validatedData);       results.summary.valid++;     } catch (error) {       results.invalid.push({    ...
  ```

---

### server/utils/safe-query.ts

**Try-catch manuels:** 8

- Ligne 49: ✅ Remplaçable (avec logger)
  ```typescript
  try {       // Log query start if requested       if (logQuery) {         logger.debug('Executing database query', {           service,           metadata: {             operation,             attempt...
  ```

- Ligne 176: ✅ Remplaçable (avec logger)
  ```typescript
  try {     logger.debug('Executing batch queries', {       service,       metadata: {         operation,         queryCount: queries.length       }     });          // Execute all queries in parallel w...
  ```

- Ligne 237: ✅ Remplaçable (avec logger)
  ```typescript
  try {     return await safeQuery(queryFn, {       service: context.service,       operation: context.operation,       logQuery: true     });   } catch (error) {     logger.error('Query execution faile...
  ```

- Ligne 270: ✅ Remplaçable (avec logger)
  ```typescript
  try {     const result = await safeQuery(queryFn, options);     return result ?? null;   } catch (error) {     logger.error(`Error getting ${entityName}
  ```

- Ligne 297: ✅ Remplaçable (avec logger)
  ```typescript
  try {     return await safeQuery(queryFn, options);   } catch (error) {     logger.error('Error counting records', { metadata: {         service: 'SafeQuery',         operation: 'safeCount',         e...
  ```

*... et 3 autres*

**Retry manuels:** 1

- Ligne 48: ⚠️ Non remplaçable
  ```typescript
  for (let attempt = 0; attempt < retries; attempt++) {     try {       // Log query start if requested       if (logQuery) {         logger.debug('Executing database query', {           service,       ...
  ```

---

### server/vite.ts

**Try-catch manuels:** 1

- Ligne 24: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const clientPath = path.resolve(import.meta.dirname, "..", "client");         const template = fs.readFileSync(           path.resolve(clientPath, "index.html"),           "utf-8"  // ✅ Le...
  ```

---

### server/websocket.ts

**Try-catch manuels:** 4

- Ligne 86: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {           const data = JSON.parse(rawData.toString());           const message = wsMessageSchema.parse(data);           await this.handleMessage(ws, message);         } catch (error) {          ...
  ```

- Ligne 120: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {       const cookies = request.headers.cookie;       if (!cookies) {         log('WebSocket: No cookies found in request');         this.sendMessage(ws, {           type: 'auth_error',           ...
  ```

- Ligne 242: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {           ws.eventFilter = message.filter ? eventFilterSchema.parse(message.filter) : undefined;           log(`Client subscribed with filter: ${JSON.stringify(ws.eventFilter)}`);         } catc...
  ```

- Ligne 275: ⚠️ Non remplaçable (sans logger)
  ```typescript
  try {         ws.send(JSON.stringify(message));       } catch (error) {         log(`Error sending WebSocket message: ${error}
  ```

---

## 🎯 Actions Recommandées

1. **Remplacer automatiquement** les 31 try-catch remplaçables
2. **Remplacer automatiquement** les 1 retry remplaçables
3. **Réviser manuellement** les 152 cas non remplaçables

---

**Généré automatiquement le 2025-11-13T14:09:20.986Z**
