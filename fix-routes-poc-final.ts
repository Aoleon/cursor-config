import * as fs from 'fs';

const filePath = 'server/routes-poc.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix first logger.info call (lines 105-110)
content = content.replace(
  /logger\.info\('EventBus PredictiveEngineService Integration', \{ metadata: \{ location: 'server\/routes-poc\.ts', type: 'REAL_PredictiveEngine_instance'[\s\S]*?\}\);}/,
  `logger.info('EventBus PredictiveEngineService Integration', {
  metadata: {
    location: 'server/routes-poc.ts',
    type: 'REAL_PredictiveEngine_instance'
  }
});`
);

// Remove duplicate lines 214-217
const lines = content.split('\n');
const newLines: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  
  // Skip lines 214-217 (the duplicate closing braces)
  if (lineNum >= 214 && lineNum <= 217) {
    if (line.trim() === '}' || line.trim() === '});' || line.trim() === '') {
      continue;
    }
  }
  
  newLines.push(lines[i]);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('Fixed routes-poc.ts');

