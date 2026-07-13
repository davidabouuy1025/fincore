export function detectCompanyName(text: string, fileName: string): string {
  // 1. Pre-clean the text: Split into lines, trim them, and filter out isolated page numbers/headers
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !/^\d+$/.test(line)); // Removes "147"

  // 2. Look specifically for the line containing the company suffix
  const suffixRegex = /\b(SDN\s*BHD|BHD|BERHAD|LIMITED|LTD|PLC)\b/i;
  
  for (const line of lines) {
    if (suffixRegex.test(line)) {
      // Clean up any trailing/leading punctuation on that specific line
      let potentialName = line.replace(/^[.\-\s]+|[.\-\s]+$/g, "");
      
      // Validate length
      if (potentialName.length > 2 && potentialName.length < 100) {
        return potentialName.toUpperCase(); // Should return "GAMUDA BERHAD"
      }
    }
  }

  // 3. Fallback to filename logic if no suffix line is found
  let baseName = fileName.replace(/\.[^/.]+$/, "");
  baseName = baseName.replace(/^\d+-/, "");
  baseName = baseName.replace(/_/, " ");
  
  if (/pasted-\d+/i.test(baseName)) {
    return "PASTED DOCUMENT";
  }

  return baseName.toUpperCase().trim() || "UNKNOWN COMPANY";
}

export function cleanCompanyName(text: string): string {
  // Regex captures the name in group 1, the suffix in group 2, and matches (but ignores) everything else after
  const pattern = /^([\s\w,&.\-\(\)]+?)\s+(BERHAD|BHD|SDN\s+BHD|LIMITED|LTD)\b.*/i;
  
  const match = text.match(pattern);
  
  if (match) {
    const entityName = match[1].trim();
    const suffix = match[2].trim();
    
    // Combine just the clean name and the suffix
    return `${entityName} ${suffix}`.toUpperCase();
  }
  
  return text; // Return original if no suffix match found
}

export function detectSector(text: string, defaultSector = "TECHNOLOGY"): string {
  const content = text.toLowerCase();

  const sectorKeywords: Record<string, string[]> = {
    TECHNOLOGY: ["software", "semiconductor", "technology", "hardware", "digital","it solutions", "cybersecurity", "telecommunication"],
    PLANTATION: ["plantation", "palm oil", "oil palm", "agriculture", "rubber", "harvest", "crop"],
    FINANCIAL_SERVICES: ["banking", "finance", "insurance", "investment", "takaful", "credit", "asset management"],
    CONSUMER_PRODUCTS: ["beverage", "food", "retail", "consumer", "merchandise", "household", "fmcg", "supermarket"],
    INDUSTRIAL_PRODUCTS: ["manufacturing", "chemical", "industrial", "steel", "cement", "engineering", "metal", "plastic"],
    REITS: ["reit", "real estate investment trust", "trust", "rental income", "shopping mall"],
    ENERGY: ["petroleum", "oil and gas", "fuel", "energy", "solar", "coal", "power", "utility"],
    HEALTHCARE: ["hospital", "pharma", "medical", "glove", "clinic", "healthcare", "therapy", "pharmaceutical"],
    CONSTRUCTION: ["construction", "builder", "infrastructure", "contractor", "civil", "bridge", "machinery"],
  };

  const scores: Record<string, number> = {};
  for (const [sector, kwList] of Object.entries(sectorKeywords)) {
    scores[sector] = 0;
    for (const kw of kwList) {
      const regex = new RegExp("\\b" + kw + "\\b", "g");
      const count = (content.match(regex) || []).length;
      scores[sector] += count;
    }
  }

  let leadingSector = defaultSector;
  let maxScore = 0;

  for (const [sector, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      leadingSector = sector;
    }
  }

  return maxScore > 2 ? leadingSector : defaultSector;
}

export function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(" ")
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export function detectYear(text: string, defaultYear: string = "2025"): string {
  const normalized = text.toLowerCase();
  
  // Look for patterns like "fy 2024" or "fy2024" or "financial year 2024"
  const fyMatches = normalized.match(/fy\s*(202[0-6])/);
  if (fyMatches && fyMatches[1]) {
    return fyMatches[1];
  }
  
  const finYearMatches = normalized.match(/financial\s+year\s+(?:ended\s+)?(202[0-6])/);
  if (finYearMatches && finYearMatches[1]) {
    return finYearMatches[1];
  }

  const reportsMatches = normalized.match(/annual\s+report\s+(202[0-6])/);
  if (reportsMatches && reportsMatches[1]) {
    return reportsMatches[1];
  }

  // Fallback to searching any year between 2020 and 2026
  const anyYearMatch = normalized.match(/\b(202[0-6])\b/);
  if (anyYearMatch && anyYearMatch[1]) {
    return anyYearMatch[1];
  }

  return defaultYear;
}