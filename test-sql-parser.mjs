// Test file to validate SQL INTERVAL preprocessing

import sqlParserModule from 'node-sql-parser';
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

// Test case 2: SQL with comparisons
console.log('\n===========================================');
console.log('Test case 2: SQL with comparisons and CASE');
const testSQL2 = `SELECT p.id, p.date_livraison_prevue, 
  CASE WHEN p.date_livraison_prevue < NOW() - INTERVAL '15 days' THEN 'critique' 
       WHEN p.date_livraison_prevue < NOW() - INTERVAL '7 days' THEN 'majeur' 
       ELSE 'mineur' END as niveau_gravite 
FROM projects p;`;

console.log('Original SQL2:');
console.log(testSQL2);

let sqlForParsing2 = testSQL2;
placeholderIndex = 0;

// Remove semicolon
if (sqlForParsing2.trim().endsWith(';')) {
  sqlForParsing2 = sqlForParsing2.trim().slice(0, -1).trim();
}

// Replace comparisons with dates and INTERVAL
sqlForParsing2 = sqlForParsing2.replace(/\w+\s*[<>=]+\s*NOW\(\)\s*[-+]\s*INTERVAL\s+'[^']+'/gi, (match) => {
  const placeholder = `__DATE_COMPARE_${placeholderIndex++}__`;
  console.log(`Replaced comparison: "${match}" with simple check`);
  return `created_at > '2024-01-01'`;
});

console.log('\nPreprocessed SQL2:');
console.log(sqlForParsing2);

console.log('\nParsing preprocessed SQL2:');
try {
  const ast2 = sqlParser.astify(sqlForParsing2, { database: 'postgresql' });
  console.log('Success! AST generated');
} catch (error) {
  console.log('Failed with error:', error.message);
}