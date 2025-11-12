// Parser d'adresse française → département + ville
export function parseAddress(addressText: string): { 
  department?: string; 
  departmentCode?: string;
  city?: string; 
  fullAddress: string;
} | null {
  if (!addressText) return null;
  
  // Mapping département nom → code
  const departmentMap: Record<string, string> = {
    'paris': '75',
    'ile-de-france': '75',
    'marseille': '13',
    'lyon': '69',
    'toulouse': '31',
    'nice': '06',
    // Ajouter plus de mappings selon besoin
  };
  
  const lowerText = addressText.toLowerCase();
  let departmentCode: string | undefined;
  let department: string | undefined;
  
  // Chercher département dans le texte
  for (const [name, code] of Object.entries(departmentMap)) {
    if (lowerText.includes(name)) {
      department = name;
      departmentCode = code;
      break;
    }
  
  // Extraire ville (simplistic: dernière ligne avant code postal)
  const lines = addressText.split(/[\n,]/);
  const city = lines[lines.length - 1]?.trim();
  
  return {
    department,
    departmentCode,
    city,
    fullAddress: addressText
  };
}

// Parser SIRET (14 chiffres)
export function extractSIRET(text: string): string | null {
  if (!text) return null;
  
  const siretRegex = /\b\d{14}\b/;
  const match = text.match(siretRegex);
  return match ? match[0] : null;
}

// Parser nom de lot depuis texte CCTP
export function extractLotsFromText(cctp: string): Array<{ name: string; description?: string }> {
  if (!cctp) return [];
  
  const lots: Array<{ name: string; description?: string }> = [];
  
  // Détecter patterns comme "Lot 1:", "LOT N°2", "Lot menuiserie", etc.
  const lotPatterns = [
    /lot\s*(\d+)\s*[:–-]\s*([^\n]+)/gi,
    /lot\s*n°?\s*(\d+)\s*[:–-]\s*([^\n]+)/gi,
    /lot\s+([a-z]+)\s*[:–-]\s*([^\n]+)/gi,
  ];
  
  for (const pattern of lotPatterns) {
    let match;
    while ((match = pattern.exec(cctp)) !== null) {
      lots.push({
        name: `Lot ${match[1]}: ${match[2]?.trim() || ''}`,
        description: match[2]?.trim()
      });
    }
  
  return lots;
}

// Détecter rôle de contact depuis nom de colonne
export function detectContactRole(columnTitle: string): 'architecte' | 'moe' | 'moa' | 'client' | 'other' {
  const lower = columnTitle.toLowerCase();
  
  if (lower.includes('architecte') || lower.includes('architect')) return 'architecte';
  if (lower.includes('moe') || lower.includes('maître d\'œuvre') || lower.includes('maitre d\'oeuvre')) return 'moe';
  if (lower.includes('moa') || lower.includes('maître d\'ouvrage') || lower.includes('maitre d\'ouvrage')) return 'moa';
  if (lower.includes('client')) return 'client';
  
  return 'other';
}
