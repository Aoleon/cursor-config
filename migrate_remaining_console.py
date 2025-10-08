#!/usr/bin/env python3
"""
Script pour migrer les console.* restants après le premier pass
"""

import re

def migrate_remaining_email():
    """Migre les 21 console.* restants dans emailService"""
    with open('server/services/emailService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Patterns restants pour emailService
    content = re.sub(
        r"console\.log\('=== FIN INVITATION FOURNISSEUR ===\\n'\);",
        """logger.info('Fin invitation fournisseur', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\\n=== \[MockEmailService\] RAPPEL EXPIRATION \(Handlebars\) ==='\);",
        """logger.info('Rappel expiration', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        templateEngine: 'Handlebars'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 Destinataire:', contactEmail, `\(\$\{contactName\}\)`\);",
        """logger.info('Destinataire', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        recipient: contactEmail,
        contactName
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 AO:', aoReference\);",
        """logger.info('AO référence', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        aoReference
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 Temps restant:', timeRemaining\);",
        """logger.info('Temps restant', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        timeRemaining
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 URL d\\'accès:', accessUrl\);",
        """logger.info('URL accès', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder',
        accessUrl
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('=== FIN RAPPEL EXPIRATION ===\\n'\);",
        """logger.info('Fin rappel expiration', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSessionReminder'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\\n=== \[MockEmailService\] CONFIRMATION DOCUMENT \(Handlebars\) ==='\);",
        """logger.info('Confirmation document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        templateEngine: 'Handlebars'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 Document:', documentName\);",
        """logger.info('Document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        documentName
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('📧 Date upload:', uploadDate\);",
        """logger.info('Date upload', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived',
        uploadDate
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('=== FIN CONFIRMATION DOCUMENT ===\\n'\);",
        """logger.info('Fin confirmation document', {
      metadata: {
        service: 'EmailService',
        operation: 'sendDocumentReceived'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.warn\('\[SendGridEmailService\] SendGrid API key non configurée - utiliser MockEmailService pour le développement'\);",
        """logger.warn('SendGrid API key non configurée', {
      metadata: {
        service: 'EmailService',
        operation: 'constructor',
        provider: 'SendGrid'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SendGridEmailService\] Service email SendGrid configuré avec succès'\);",
        """logger.info('Service email SendGrid configuré', {
      metadata: {
        service: 'EmailService',
        operation: 'constructor',
        provider: 'SendGrid'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SendGridEmailService\] SIMULATION - Email qui serait envoyé via SendGrid \(Handlebars\):', \{",
        """logger.info('SIMULATION Email SendGrid', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid',
        simulationData: {""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SendGridEmailService\] ✅ Instructions détectées - rendu conditionnel activé'\);",
        """logger.info('Instructions détectées - rendu conditionnel activé', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SendGridEmailService\] ❌ Pas d\\'instructions - bloc conditionnel masqué'\);",
        """logger.info('Pas d\\'instructions - bloc conditionnel masqué', {
      metadata: {
        service: 'EmailService',
        operation: 'sendSupplierInvitation',
        provider: 'SendGrid'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[SendGridEmailService\] Erreur envoi email:', error\);",
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
        r"console\.log\(`\[EmailServiceFactory\] Initialisation du service email: \$\{provider\}`\);",
        """logger.info('Initialisation du service email', {
      metadata: {
        service: 'EmailService',
        operation: 'createEmailService',
        provider
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[EmailService\] Service actif: \$\{emailService\.constructor\.name\}`\);",
        """logger.info('Service actif', {
      metadata: {
        service: 'EmailService',
        operation: 'init',
        serviceName: emailService.constructor.name
      }
    });""",
        content
    )
    
    with open('server/services/emailService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ emailService.ts - console.* restants migrés")

def migrate_remaining_predictive():
    """Migre les 13 console.* restants dans PredictiveEngineService"""
    with open('server/services/PredictiveEngineService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur récupération historique revenues:', error\);",
        """logger.error('Erreur récupération historique revenues', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getMonthlyRevenueHistory',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur récupération historique délais:', error\);",
        """logger.error('Erreur récupération historique délais', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'getProjectDelayHistory',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur prédiction heat-map:', error\);",
        """logger.error('Erreur prédiction heat-map', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'predictFromHeatMap',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\(`\[PredictiveEngine\] Erreur tâche preloading \$\{task\.id\}:`, error\);",
        """logger.error('Erreur tâche preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executeHighPriorityTasks',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] Exécution preloading \$\{task\.entityType\}:\$\{task\.entityId\}`\);",
        """logger.info('Exécution preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        entityType: task.entityType,
        entityId: task.entityId
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] Preloading complété: \$\{task\.entityType\}:\$\{task\.entityId\}`\);",
        """logger.info('Preloading complété', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        entityType: task.entityType,
        entityId: task.entityId
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\(`\[PredictiveEngine\] Erreur preloading \$\{task\.id\}:`, error\);",
        """logger.error('Erreur preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'executePreloadTask',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\(`\[PredictiveEngine\] Erreur tâche différée \$\{task\.id\}:`, error\);",
        """logger.error('Erreur tâche différée', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'scheduleDelayedTasks',
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] Cleanup accès entités: \$\{deletedCount\} entrées supprimées`\);",
        """logger.info('Cleanup accès entités', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'cleanupStaleEntityAccess',
        deletedCount
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Mise à jour patterns BTP\.\.\.'\);",
        """logger.info('Mise à jour patterns BTP', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[PredictiveEngine\] Patterns BTP mis à jour'\);",
        """logger.info('Patterns BTP mis à jour', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[PredictiveEngine\] Erreur mise à jour patterns BTP:', error\);",
        """logger.error('Erreur mise à jour patterns BTP', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'updateBTPPatterns',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[PredictiveEngine\] Preloading \$\{enabled \? 'ACTIVÉ' : 'DÉSACTIVÉ'\}`\);",
        """logger.info('État preloading', {
      metadata: {
        service: 'PredictiveEngineService',
        operation: 'togglePredictivePreloading',
        enabled: enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'
      }
    });""",
        content
    )
    
    with open('server/services/PredictiveEngineService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ PredictiveEngineService.ts - console.* restants migrés")

def migrate_remaining_sql():
    """Migre les 22 console.* restants dans SQLEngineService"""
    with open('server/services/SQLEngineService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Duplicates from earlier that didn't get migrated
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] SQL à valider: \$\{sql\.substring\(0, 200\)\}\$\{sql\.length > 200 \? '\.\.\.': ''\}`\);",
        """logger.info('SQL à valider', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        sqlPreview: sql.substring(0, 200) + (sql.length > 200 ? '...' : '')
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✓ SQL nettoyé \(\$\{cleanedSQL\.length\} chars\): \$\{cleanedSQL\.substring\(0, 150\)\}\$\{cleanedSQL\.length > 150 \? '\.\.\.': ''\}`\);",
        """logger.info('SQL nettoyé', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        cleanedSQLLength: cleanedSQL.length,
        cleanedSQLPreview: cleanedSQL.substring(0, 150) + (cleanedSQL.length > 150 ? '...' : '')
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Étape 4: Validation des colonnes\.\.\.`\);",
        """logger.info('Validation des colonnes', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 4
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Colonnes extraites: \$\{columnsInQuery\.length\} colonne\(s\)`\);",
        """logger.info('Colonnes extraites', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        columnsCount: columnsInQuery.length
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Étape 5: Détection patterns d'injection\.\.\.`\);",
        """logger.info('Détection patterns d\\'injection', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 5
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✗ Patterns d'injection détectés: \$\{violations\.slice\(injectionViolationsBefore\)\.join\(', '\)\}`\);",
        """logger.warn('Patterns d\\'injection détectés', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        patterns: violations.slice(injectionViolationsBefore).join(', ')
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✓ Aucun pattern d'injection détecté`\);",
        """logger.info('Aucun pattern d\\'injection détecté', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Étape 6: Validation contraintes métier\.\.\.`\);",
        """logger.info('Validation contraintes métier', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 6
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✗ Contraintes métier violées: \$\{violations\.slice\(businessViolationsBefore\)\.join\(', '\)\}`\);",
        """logger.warn('Contraintes métier violées', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violations: violations.slice(businessViolationsBefore).join(', ')
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✓ Contraintes métier respectées`\);",
        """logger.info('Contraintes métier respectées', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ✗ ERREUR PARSING: \$\{violation\}`\);",
        """logger.error('Erreur parsing SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violation
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] SQL problématique: \$\{sql\}`\);",
        """logger.error('SQL problématique', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        sql
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] ═══════════════════════════════════════════`\);",
        "",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Résultat final: \$\{isSecure \? '✓ SÉCURISÉ' : '✗ REJETÉ'\}`\);",
        """logger.info('Résultat validation SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        result: isSecure ? 'SÉCURISÉ' : 'REJETÉ'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Violations: \$\{violations\.length\}`\);",
        """logger.info('Violations count', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violationsCount: violations.length
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLSecurity\] Détail violations:`\);",
        """logger.info('Détail violations', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"violations\.forEach\(\(v, i\) => console\.log\(`\[SQLSecurity\]   \$\{i \+ 1\}\. \$\{v\}`\)\);",
        """violations.forEach((v, i) => logger.info('Violation', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'validateSQL',
          index: i + 1,
          violation: v
        }
      }));""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SQLEngine\] Note: Filtre user_id manquant, sera ajouté par RBAC'\);",
        """logger.info('Filtre user_id manquant, sera ajouté par RBAC', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'generateIntelligentContext'
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\('\[SQLEngine\] Query échouée après timeout \(ignorée\):', err\.message\);",
        """logger.warn('Query échouée après timeout', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        error: err.message
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.log\(`\[SQLEngine\] Query \$\{queryId\} executed in \$\{Date\.now\(\) - startTime\}ms, \$\{resultCount\} results`\);",
        """logger.info('Query executed', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        durationMs: Date.now() - startTime,
        resultsCount: resultCount
      }
    });""",
        content
    )
    
    content = re.sub(
        r"console\.error\('\[SQLEngine\] Erreur logging:', error\);",
        """logger.error('Erreur logging', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'logQueryToAudit',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });""",
        content
    )
    
    # Remove empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open('server/services/SQLEngineService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ SQLEngineService.ts - console.* restants migrés")

def verify():
    """Vérifie que tous les console.* ont été migrés"""
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
    print("🚀 Migration des console.* restants...")
    
    migrate_remaining_email()
    migrate_remaining_predictive()
    migrate_remaining_sql()
    
    print("\n🔍 Vérification finale...")
    if verify():
        print("\n🎉 Tous les console.* ont été migrés avec succès!")
    else:
        print("\n⚠️  Certains console.* restent encore")
