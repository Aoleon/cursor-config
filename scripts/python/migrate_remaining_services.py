#!/usr/bin/env python3
"""
Script de migration complet pour emailService, PredictiveEngineService, SQLEngineService
Migre tous les console.* vers logger structuré avec metadata
"""

import re
import sys

def migrate_email_service():
    """Migre emailService.ts - 48 console.*"""
    print("🔄 Migration emailService.ts...")
    
    with open('server/services/emailService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Vérifier import logger
    if 'import { logger }' not in content:
        print("❌ ERREUR: Logger non importé dans emailService!")
        return False
    
    # emailService replacements
    replacements = [
        # console.error - Template rendering errors
        (r"console\.error\('\[HandlebarsTemplateService\] Erreur lors du rendu du template:', error\);",
         """logger.error('Erreur rendu template', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });"""),
        
        (r"console\.error\('Template content:', templateContent\.substring\(0, 200\) \+ '\.\.\.'\);",
         """logger.error('Template content preview', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          templatePreview: templateContent.substring(0, 200) + '...'
        }
      });"""),
        
        (r"console\.error\('Data provided:', JSON\.stringify\(data, null, 2\)\);",
         """logger.error('Template data provided', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate',
          data: JSON.stringify(data, null, 2)
        }
      });"""),
        
        # console.warn
        (r"console\.warn\('\[HandlebarsTemplateService\] Utilisation du fallback naïf'\);",
         """logger.warn('Utilisation du fallback naïf', {
        metadata: {
          service: 'EmailService',
          operation: 'renderTemplate'
        }
      });"""),
        
        # console.log - MockEmailService initialization and operations
        (r"console\.log\('\[MockEmailService\] Service email MOCK initialisé pour le développement'\);",
         """logger.info('Service email MOCK initialisé', {
        metadata: {
          service: 'EmailService',
          operation: 'constructor'
        }
      });"""),
        
        (r"console\.log\('\\n=== \[MockEmailService\] INVITATION FOURNISSEUR \(Handlebars\) ==='\);",
         """logger.info('Envoi invitation fournisseur', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          templateEngine: 'Handlebars'
        }
      });"""),
        
        (r"console\.log\('📧 Destinataire:', data\.contactEmail, `\(\$\{data\.contactName\}\)`\);",
         """logger.info('Destinataire', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          recipient: data.contactEmail,
          contactName: data.contactName
        }
      });"""),
        
        (r"console\.log\('📧 Sujet:', subject\);",
         """logger.info('Sujet email', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          subject
        }
      });"""),
        
        (r"console\.log\('📧 Fournisseur:', data\.supplierName\);",
         """logger.info('Fournisseur', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          supplierName: data.supplierName
        }
      });"""),
        
        (r"console\.log\('📧 AO:', data\.aoReference\);",
         """logger.info('AO référence', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          aoReference: data.aoReference
        }
      });"""),
        
        (r"console\.log\('📧 Lot:', data\.lotDescription\);",
         """logger.info('Lot description', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          lotDescription: data.lotDescription
        }
      });"""),
        
        (r"console\.log\('📧 URL d\\'accès:', data\.accessUrl\);",
         """logger.info('URL accès', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          accessUrl: data.accessUrl
        }
      });"""),
        
        (r"console\.log\('📧 Expiration:', data\.expirationDate\);",
         """logger.info('Date expiration', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          expirationDate: data.expirationDate
        }
      });"""),
        
        (r"console\.log\('📧 Instructions:', data\.instructions\);",
         """logger.info('Instructions incluses', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          instructions: data.instructions
        }
      });"""),
        
        (r"console\.log\('📧 ✅ Instructions incluses dans le rendu conditionnel'\);",
         """logger.info('Instructions incluses dans rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          conditionalRender: true
        }
      });"""),
        
        (r"console\.log\('📧 ❌ Pas d\\'instructions - bloc conditionnel masqué'\);",
         """logger.info('Pas d\\'instructions - bloc masqué', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          conditionalRender: false
        }
      });"""),
        
        (r"console\.log\('📧 Template HTML rendu avec Handlebars \(', htmlContent\.length, 'caractères\)'\);",
         """logger.info('Template HTML rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlLength: htmlContent.length,
          templateEngine: 'Handlebars'
        }
      });"""),
        
        (r"console\.log\('📧 Template TEXT rendu avec Handlebars \(', textContent\.length, 'caractères\)'\);",
         """logger.info('Template TEXT rendu', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          textLength: textContent.length,
          templateEngine: 'Handlebars'
        }
      });"""),
        
        (r"console\.log\('📧 APERÇU RENDU HTML:'\);",
         """logger.info('Aperçu rendu HTML', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation'
        }
      });"""),
        
        (r"console\.log\(htmlPreview\.substring\(0, 500\) \+ '\.\.\.'\);",
         """logger.info('HTML preview', {
        metadata: {
          service: 'EmailService',
          operation: 'sendSupplierInvitation',
          htmlPreview: htmlPreview.substring(0, 500) + '...'
        }
      });"""),
    ]
    
    # Apply all replacements
    for old, new in replacements:
        content = re.sub(old, new, content, flags=re.MULTILINE)
    
    # Generic patterns for remaining console.log
    content = re.sub(
        r"console\.log\('=== FIN INVITATION FOURNISSEUR ==='\);",
        """logger.info('Fin invitation fournisseur', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[MockEmailService\] 📩 SESSION REMINDER FOURNISSEUR`\);",
        """logger.info('Session reminder fournisseur', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[MockEmailService\] 📄 DOCUMENT RECEIVED CONFIRMATION`\);",
        """logger.info('Document received confirmation', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SendGridEmailService\] Email envoyé avec succès`\);",
        """logger.info('Email envoyé avec succès', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SendGridEmailService\] Message ID: \$\{messageId\}`\);",
        """logger.info('Message ID', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid',
        messageId
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\(`\[SendGridEmailService\] Erreur lors de l'envoi:`, error\);",
        """logger.error('Erreur envoi email', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[EmailService\] Rappels programmés pour session \$\{session\.id\}`\);",
        """logger.info('Rappels programmés', {
      metadata: {
        service: 'EmailService',
        operation: 'scheduleSessionReminders',
        sessionId: session.id
      }
    });""",
        content
    )
    
    with open('server/services/emailService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ emailService.ts migré")
    return True

def migrate_predictive_engine():
    """Migre PredictiveEngineService.ts - 45 console.*"""
    print("🔄 Migration PredictiveEngineService.ts...")
    
    with open('server/services/PredictiveEngineService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'import { logger }' not in content:
        print("❌ ERREUR: Logger non importé dans PredictiveEngineService!")
        return False
    
    replacements = [
        (r"console\.log\('\[PredictiveEngine\] Service initialisé avec preloading prédictif activé'\);",
         """logger.info('Service initialisé avec preloading prédictif', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'constructor'
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Cache hit pour forecast revenue'\);",
         """logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        cacheHit: true
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Calcul forecast revenue:', params\);",
         """logger.info('Calcul forecast revenue', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        params
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Aucune donnée historique trouvée'\);",
         """logger.info('Aucune donnée historique trouvée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue'
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Forecast calculé:', results\.length, 'prévisions'\);",
         """logger.info('Forecast calculé', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        forecastCount: results.length
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur calcul forecast revenue:', error\);",
         """logger.error('Erreur calcul forecast revenue', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'forecastRevenue',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Cache hit pour project risks'\);",
         """logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        cacheHit: true
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Détection risques projets:', params\);",
         """logger.info('Détection risques projets', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        params
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Risques détectés:', results\.length, 'projets à risque'\);",
         """logger.info('Risques détectés', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        risksCount: results.length
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur détection risques:', error\);",
         """logger.error('Erreur détection risques', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'detectProjectRisks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Cache hit pour recommendations'\);",
         """logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        cacheHit: true
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Génération recommandations business:', context\);",
         """logger.info('Génération recommandations business', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        context
      }
    });"""),
        
        (r"console\.log\('\[PredictiveEngine\] Recommandations générées:', filteredRecs\.length, 'actions'\);",
         """logger.info('Recommandations générées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        recommendationsCount: filteredRecs.length
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur génération recommandations:', error\);",
         """logger.error('Erreur génération recommandations', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateBusinessRecommendations',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur récupération KPIs:', error\);",
         """logger.error('Erreur récupération KPIs', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getCurrentKPIs',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur récupération benchmarks:', error\);",
         """logger.error('Erreur récupération benchmarks', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getIndustryBenchmarks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.error\('\[PredictiveEngine\] Erreur recommandations planning:', error\);",
         """logger.error('Erreur recommandations planning', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generatePlanningRecommendations',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[PredictiveEngine\] Cache hit pour \$\{key\} \(\$\{entry\.hit_count\} hits\)`\);",
         """logger.info('Cache hit', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getCachedEntry',
        cacheKey: key,
        hitCount: entry.hit_count
      }
    });"""),
        
        (r"console\.log\(`\[PredictiveEngine\] Cache set pour \$\{key\} \(TTL: \$\{ttlMinutes\}min\)`\);",
         """logger.info('Cache set', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'setCacheEntry',
        cacheKey: key,
        ttlMinutes
      }
    });"""),
        
        (r"console\.log\(`\[PredictiveEngine\] Cache cleanup: \$\{deletedCount\} entrées supprimées`\);",
         """logger.info('Cache cleanup', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'cleanupCache',
        deletedCount
      }
    });"""),
    ]
    
    for old, new in replacements:
        content = re.sub(old, new, content, flags=re.MULTILINE)
    
    # Remaining generic patterns
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Génération heat-map entités\.\.\.'\);",
        """logger.info('Génération heat-map entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Cache hit pour entity heatmap'\);",
        """logger.info('Cache hit pour entity heatmap', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        cacheHit: true
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] Heat-map générée: \$\{hotEntities\.length\} entités chaudes, \$\{coldEntities\.length\} froides`\);",
        """logger.info('Heat-map générée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        hotEntitiesCount: hotEntities.length,
        coldEntitiesCount: coldEntities.length
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur génération heat-map:', error\);",
        """logger.error('Erreur génération heat-map', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'generateEntityHeatMap',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Prédiction accès entités pour utilisateur:', userId\);",
        """logger.info('Prédiction accès entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        userId
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] \$\{filteredPredictions\.length\} prédictions générées \(confiance ≥\$\{this\.PRELOADING_CONFIDENCE_THRESHOLD\}%\)`\);",
        """logger.info('Prédictions générées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        predictionsCount: filteredPredictions.length,
        confidenceThreshold: this.PRELOADING_CONFIDENCE_THRESHOLD
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur prédiction accès:', error\);",
        """logger.error('Erreur prédiction accès', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictNextEntityAccess',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Preloading désactivé ou ContextCache non disponible'\);",
        """logger.info('Preloading désactivé ou ContextCache non disponible', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Programmation tâches preloading pour', predictions\.length, 'prédictions'\);",
        """logger.info('Programmation tâches preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        predictionsCount: predictions.length
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] \$\{newTasks\.length\} nouvelles tâches programmées`\);",
        """logger.info('Nouvelles tâches programmées', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        newTasksCount: newTasks.length
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur programmation tâches preloading:', error\);",
        """logger.error('Erreur programmation tâches preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'schedulePreloadTasks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Intégration ContextCacheService activée pour preloading'\);",
        """logger.info('Intégration ContextCacheService activée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'integrateWithContextCache'
      }
    });""",
        content
    )
    
    with open('server/services/PredictiveEngineService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ PredictiveEngineService.ts migré")
    return True

def migrate_sql_engine():
    """Migre SQLEngineService.ts - 42 console.*"""
    print("🔄 Migration SQLEngineService.ts...")
    
    with open('server/services/SQLEngineService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'import { logger }' not in content:
        print("❌ ERREUR: Logger non importé dans SQLEngineService!")
        return False
    
    replacements = [
        (r"console\.log\(`\[SQLEngine\] Démarrage requête \$\{queryId\} pour utilisateur \$\{request\.userId\}`\);",
         """logger.info('Démarrage requête', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        userId: request.userId
      }
    });"""),
        
        (r"console\.log\(`\[SQLEngine\] ========================================`\);",
         ""),
        
        (r"console\.log\(`\[SQLEngine\] SQL GÉNÉRÉ PAR L'IA \(longueur: \$\{generatedSQL\.length\} chars\):`\);",
         """logger.info('SQL généré par l\\'IA', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        sqlLength: generatedSQL.length,
        queryId
      }
    });"""),
        
        (r"console\.log\(`\[SQLEngine\] \$\{generatedSQL\}`\);",
         """logger.info('SQL query', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        sql: generatedSQL,
        queryId
      }
    });"""),
        
        (r"console\.error\(`\[SQLEngine\] Erreur requête \$\{queryId\}:`, error\);",
         """logger.error('Erreur requête', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[SQLEngine\] Génération contexte intelligent pour \$\{request\.userId\} \(\$\{request\.userRole\}\)`\);",
         """logger.info('Génération contexte intelligent', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'generateIntelligentContext',
        userId: request.userId,
        userRole: request.userRole
      }
    });"""),
        
        (r"console\.error\(`\[SQLEngine\] Erreur génération contexte intelligent:`, error\);",
         """logger.error('Erreur génération contexte intelligent', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'generateIntelligentContext',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] Validation SQL pour \$\{userId\} \(\$\{userRole\}\)`\);",
         """logger.info('Validation SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        userId,
        userRole
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] SQL à valider: \$\{sql\.substring\(0, 200\)\}\$\{sql\.length > 200 \? '\.\.\.': ''\}`\);",
         """logger.info('SQL à valider', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        sqlPreview: sql.substring(0, 200) + (sql.length > 200 ? '...' : '')
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] ✓ SQL nettoyé \(\$\{cleanedSQL\.length\} chars\): \$\{cleanedSQL\.substring\(0, 150\)\}\$\{cleanedSQL\.length > 150 \? '\.\.\.': ''\}`\);",
         """logger.info('SQL nettoyé', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        cleanedSQLLength: cleanedSQL.length,
        cleanedSQLPreview: cleanedSQL.substring(0, 150) + (cleanedSQL.length > 150 ? '...' : '')
      }
    });"""),
        
        (r"console\.warn\(`\[SQLSecurity\] Erreur nettoyage SQL, utilisation SQL brut: \$\{cleanError\}`\);",
         """logger.warn('Erreur nettoyage SQL, utilisation SQL brut', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        cleanError
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] Étape 1: Parsing AST avec node-sql-parser\.\.\.`\);",
         """logger.info('Parsing AST', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 1
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] ✓ Parsing AST réussi`\);",
         """logger.info('Parsing AST réussi', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] Étape 2: Vérification READ-ONLY \(\$\{astArray\.length\} statement\(s\)\)\.\.\.`\);",
         """logger.info('Vérification READ-ONLY', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 2,
        statementsCount: astArray.length
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] ✗ \$\{violation\}`\);",
         """logger.warn('Violation sécurité SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violation
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] ✓ Statement type: SELECT`\);",
         """logger.info('Statement type: SELECT', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] Étape 3: Validation des tables\.\.\.`\);",
         """logger.info('Validation des tables', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 3
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] Tables extraites: \[\$\{tablesInQuery\.join\(', '\)\}\]`\);",
         """logger.info('Tables extraites', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        tables: tablesInQuery.join(', ')
      }
    });"""),
        
        (r"console\.log\(`\[SQLSecurity\] ✓ Table autorisée: \$\{tableName\}`\);",
         """logger.info('Table autorisée', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        tableName
      }
    });"""),
    ]
    
    for old, new in replacements:
        content = re.sub(old, new, content, flags=re.MULTILINE)
    
    # Remove empty lines created by removing separator logs
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open('server/services/SQLEngineService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ SQLEngineService.ts migré")
    return True

def verify_migrations():
    """Vérifie que tous les console.* ont été migrés"""
    print("\n🔍 Vérification des migrations...")
    
    services = [
        'server/services/emailService.ts',
        'server/services/PredictiveEngineService.ts',
        'server/services/SQLEngineService.ts'
    ]
    
    all_success = True
    for service in services:
        with open(service, 'r', encoding='utf-8') as f:
            content = f.read()
            console_count = len(re.findall(r'console\.', content))
            
            if console_count == 0:
                print(f"✅ {service}: 0 console.* restants")
            else:
                print(f"❌ {service}: {console_count} console.* restants")
                all_success = False
    
    return all_success

if __name__ == "__main__":
    print("🚀 Démarrage migration complète...")
    
    success = True
    success &= migrate_email_service()
    success &= migrate_predictive_engine()
    success &= migrate_sql_engine()
    
    if success:
        if verify_migrations():
            print("\n🎉 Migration complète terminée avec succès!")
            sys.exit(0)
        else:
            print("\n⚠️  Migration terminée mais certains console.* restent")
            sys.exit(1)
    else:
        print("\n❌ Erreur lors de la migration")
        sys.exit(1)
