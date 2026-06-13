export function detectCompanyName(text: string, fileName: string): string {
  // REGEX - Try pattern matching from text
  // () means Capture Group
  // '/i' means case-insensitive
  // '\s' means space bar

  const patterns = [
    // Local company
    /([A-Z0-9\s,&.\-\(\)]+)\s+(Sdn\s+Bhd|SDN\s+BHD|Sdn\.\s+Bhd\.|Bhd\.|BHD|BERHAD)/i
    
    // International company
    // , /([A-Z0-9\s,&.\-\(\)]+)\s+(LIMITED|LTD|CORP|INC|HOLDINGS|GROUP)/i,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match && match[1]) {
      const name = match[1].trim().toUpperCase();
      const suffix = match[2].trim().toUpperCase();
      if (name.length > 2 && name.length < 100 && !["FOR", "THE", "ANNUAL REPORT", "OF"].includes(name)) {
        return `${name} ${suffix}`;
      }
    }
  }

  // Fallback to cleaning the filename
  let baseName = fileName.replace(/\.[^/.]+$/, ""); // strip extension
  baseName = baseName.replace(/^\d+-/, ""); // strip timestamp prefix e.g. 171822...-
  baseName = baseName.replace(/_/g, " "); // strip underscore
  baseName = baseName.replace(/pasted-\d+/i, "PASTED DOCUMENT");
  baseName = baseName.toUpperCase().trim();
  
  return baseName || "UNKNOWN COMPANY";
}

export function detectSector(text: string, defaultSector = "TECHNOLOGY"): string {
  const content = text.toLowerCase();

  const sectorKeywords: Record<string, string[]> = {
    TECHNOLOGY: ["software", "semiconductor", "technology", "hardware", "digital", "data center", "it solutions", "cybersecurity", "telecommunication"],
    PLANTATION: ["plantation", "palm oil", "oil palm", "agriculture", "rubber", "harvest", "crop"],
    FINANCIAL_SERVICES: ["banking", "finance", "financial", "insurance", "investment", "takaful", "credit", "asset management"],
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