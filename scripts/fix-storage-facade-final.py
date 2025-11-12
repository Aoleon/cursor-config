#!/usr/bin/env python3
import re

file_path = 'server/storage/facade/StorageFacade.ts'

with open(file_path, 'r') as f:
    content = f.read()
    original = content
    
    fixed_count = [0]
    
    # Pattern: this.facadeLogger.info('...', { metadata: { ... }\n        }\n      );
    # Le metadata se termine par un retour à la ligne avant }
    pattern1 = r"(this\.facadeLogger\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{)([^}]+?)(\}\s*\n\s+\}\s*\n\s+\);)"
    
    # Pattern alternatif: { metadata: { ... \n        }\n      );
    pattern2 = r"(\{\s*metadata:\s*\{)([^}]+?)(\n\s+\}\s*\n\s+\}\);)"
    
    def replace_func1(match):
        fixed_count[0] += 1
        logger_var = match.group(1)
        level = match.group(2)
        message = match.group(3)
        metadata_content = match.group(4)
        suffix = match.group(5)
        
        # Nettoyer metadata (enlever retours à la ligne et espaces)
        clean = metadata_content.replace('\n', ' ').strip()
        props = [p.strip() for p in clean.split(',') if p.strip()]
        formatted = ',\n          '.join(props)
        
        return f"{logger_var}'{message}', {{\n        metadata: {{\n          {formatted}\n        }}\n      }});"
    
    def replace_func2(match):
        fixed_count[0] += 1
        prefix = match.group(1)
        metadata_content = match.group(2)
        suffix = match.group(3)
        
        # Nettoyer metadata (enlever retours à la ligne et espaces)
        clean = metadata_content.replace('\n', ' ').strip()
        props = [p.strip() for p in clean.split(',') if p.strip()]
        formatted = ',\n          '.join(props)
        
        return f"{{\n        metadata: {{\n          {formatted}\n        }}\n      }});"
    
    content = re.sub(pattern1, replace_func1, content, flags=re.MULTILINE | re.DOTALL)
    content = re.sub(pattern2, replace_func2, content, flags=re.MULTILINE | re.DOTALL)
    
    if content != original:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ {fixed_count[0]} corrections appliquées dans StorageFacade.ts")
    else:
        print("ℹ️  Aucune correction trouvée")

