#!/usr/bin/env python3
import re

file_path = 'server/storage/facade/StorageFacade.ts'

with open(file_path, 'r') as f:
    lines = f.readlines()

fixed = 0
new_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Détecter les lignes avec indentation excessive après metadata
    if 'metadata: {' in line and i + 3 < len(lines):
        # Vérifier si les lignes suivantes ont le pattern problématique
        if (lines[i+1].strip() == '}' and 
            lines[i+2].strip() == ');' and
            (lines[i+1].startswith('        ') or lines[i+1].startswith('              '))):
            
            # Trouver l'indentation de base (celle de la ligne logger)
            base_indent = ''
            j = i - 1
            while j >= 0:
                if 'facadeLogger.' in lines[j] or 'logger.' in lines[j]:
                    base_indent = re.match(r'^(\s*)', lines[j]).group(1)
                    break
                j -= 1
            
            if not base_indent:
                base_indent = '      '
            
            # Reconstruire avec la bonne indentation
            # Extraire le contenu de la ligne metadata
            metadata_match = re.search(r"metadata:\s*\{([^}]+?)\}", line)
            if metadata_match:
                metadata_content = metadata_match.group(1).strip()
                # Parser les propriétés
                props = [p.strip() for p in metadata_content.split(',') if p.strip()]
                # Formater
                formatted_props = ',\n'.join([f'{base_indent}          {prop}' for prop in props])
                
                # Reconstruire la ligne logger
                logger_match = re.search(r"(this\.facadeLogger|logger)\.(info|warn|error|debug)\('([^']+)'", line)
                if logger_match:
                    logger_var = logger_match.group(1)
                    level = logger_match.group(2)
                    message = logger_match.group(3)
                    
                    new_lines.append(f'{base_indent}{logger_var}.{level}(\'{message}\', {{\n')
                    new_lines.append(f'{base_indent}        metadata: {{\n')
                    if formatted_props:
                        new_lines.append(f'{formatted_props}\n')
                    new_lines.append(f'{base_indent}        }}\n')
                    new_lines.append(f'{base_indent}      }});\n')
                    fixed += 1
                    i += 3
                    continue
    
    # Corriger les indentations excessives simples
    if re.match(r'^\s{12,}(module|operation|error|id|count|projectId|weekNumber|year|category|userId|labelId|email):', line):
        # Trouver l'indentation de base
        base_indent = '      '
        j = i - 1
        while j >= 0:
            if 'metadata: {' in lines[j]:
                base_indent = re.match(r'^(\s*)', lines[j]).group(1)
                break
            j -= 1
        prop = line.strip()
        new_lines.append(f'{base_indent}          {prop}\n')
        fixed += 1
        i += 1
        continue
    
    # Corriger les } avec trop d'indentation
    if line.strip() == '}' and (line.startswith('              ') or line.startswith('        }')):
        # Trouver l'indentation de base
        base_indent = '      '
        j = i - 1
        while j >= 0:
            if 'metadata: {' in lines[j]:
                base_indent = re.match(r'^(\s*)', lines[j]).group(1)
                break
            j -= 1
        new_lines.append(f'{base_indent}        }}\n')
        fixed += 1
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

if fixed > 0:
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print(f"✅ {fixed} corrections d'indentation appliquées")
else:
    print("ℹ️  Aucune correction")

