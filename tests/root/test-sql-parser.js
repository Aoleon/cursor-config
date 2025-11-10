// Test file to validate SQL INTERVAL preprocessing

const sqlParserModule = require('node-sql-parser');
const sqlParser = new sqlParserModule.Parser();

// Test SQL with INTERVAL
const testSQL = "SELECT COUNT(*) as nb_projets_crees FROM projects WHERE created_at >= NOW() - INTERVAL '15 days';";

console.log('Original SQL:');
console.log(testSQL);
console.log('');

// Try to parse directly (should fail)
console.log('Direct parsing (expected to fail):');
try {
  const ast = sqlParser.astify(testSQL, { database: 'postgresql' });
  console.log('Success! AST generated');
} catch (error) {
  console.log('Failed with error:', error.message);
}

console.log('');
console.log('With preprocessing:');

// Preprocess SQL (as in SQLEngineService)
let sqlForParsing = testSQL;
const intervalReplacements = new Map();
let placeholderIndex = 0;

// Remove trailing semicolon first
const hasSemicolon = sqlForParsing.trim().endsWith(';');
if (hasSemicolon) {
  sqlForParsing = sqlForParsing.trim().slice(0, -1).trim();
  console.log('Removed semicolon');
}

// Replace NOW() - INTERVAL expressions
sqlForParsing = sqlForParsing.replace(/NOW\(\)\s*[-+]\s*INTERVAL\s+'[^']+'/gi, (match) => {
  const placeholder = `__INTERVAL_EXPR_${placeholderIndex++}__`;
  intervalReplacements.set(placeholder, match);
  console.log(`Replaced "${match}" with placeholder "${placeholder}"`);
  return `'${placeholder}'`;
});

// Replace standalone INTERVAL
sqlForParsing = sqlForParsing.replace(/INTERVAL\s+'[^']+'/gi, (match) => {
  const placeholder = `__INTERVAL_PLACEHOLDER_${placeholderIndex++}__`;
  intervalReplacements.set(placeholder, match);
  console.log(`Replaced "${match}" with placeholder "${placeholder}"`);
  return `'${placeholder}'`;
});

console.log('');
console.log('Preprocessed SQL:');
console.log(sqlForParsing);
console.log('');

// Try to parse preprocessed SQL
console.log('Parsing preprocessed SQL:');
try {
  const ast = sqlParser.astify(sqlForParsing, { database: 'postgresql' });
  console.log('Success! AST generated');
  console.log('AST type:', ast.type);
} catch (error) {
  console.log('Failed with error:', error.message);
}