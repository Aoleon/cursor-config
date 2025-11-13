import * as fs from 'fs';

const filePath = 'server/routes-poc.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove duplicate lines between line 212 and 217
const lines = content.split('\n');
const newLines: string[] = [];
let skipNext = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Skip lines 214-217 (the duplicate closing braces)
  if (lineNum >= 214 && lineNum <= 217) {
    if (line.trim() === '}' || line.trim() === '});' || line.trim() === '') {
      continue;
    }
  }
  
  newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Cleaned up duplicate lines in routes-poc.ts');

