#!/usr/bin/env python3
import re

file_path = 'server/storage/facade/StorageFacade.ts'

with open(file_path, 'r') as f:
    content = f.read()
    original = content
    
    # Pattern exact: { metadata: { ... \n        }\n      );
    pattern = r"(\{\s*metadata:\s*\{)([^}]+?)(\}\s*\n\s+\}\s*\n\s+\);)"
    
    fixed_count = [0]  # Utiliser une liste pour pouvoir modifier dans la fonction
    
    def replace_func(match):
        fixed_count[0] += 1
        prefix = match.group(1)
        metadata_content = match.group(2)
        suffix = match.group(3)
        
        # Nettoyer metadata
        clean = metadata_content.replace('\n', ' ').strip()
        props = [p.strip() for p in clean.split(',') if p.strip()]
        formatted = ',\n          '.join(props)
        
        return f"{{\n        metadata: {{\n          {formatted}\n        }}\n      }});"
    
    content = re.sub(pattern, replace_func, content, flags=re.MULTILINE)
    
    if content != original:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ {fixed_count[0]} corrections appliquées")
    else:
        print("ℹ️  Aucune correction")

