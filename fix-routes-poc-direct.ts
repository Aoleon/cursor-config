import * as fs from 'fs';

const filePath = 'server/routes-poc.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix logger.info call at line 105
content = content.replace(
  /logger\.info\('EventBus PredictiveEngineService Integration', \{ metadata: \{ location: 'server\/routes-poc\.ts', type: 'REAL_PredictiveEngine_instance'[\s\S]*?\}\);}/,
  `logger.info('EventBus PredictiveEngineService Integration', {
  metadata: {
    location: 'server/routes-poc.ts',
    type: 'REAL_PredictiveEngine_instance'
  }
});`
);

// Remove lines 214-217 (duplicate closing braces)
const lines = content.split('\n');
const newLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  const line = lines[i];
  
  // Skip lines 214-217 if they are just closing braces or empty
  if (lineNum >= 214 && lineNum <= 217) {
    const trimmed = line.trim();
    if (trimmed === '}' || trimmed === '});' || trimmed === '') {
      continue;
    }
  }
  
  newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Fixed routes-poc.ts - logger call and duplicate lines');

