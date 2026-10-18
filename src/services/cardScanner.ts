import { CardData, CardType, CardRace, CardRarity } from '../types/card';
import { CANONICAL_CARDS } from '../data/canonicalCards';
import { optimizeCardImage } from '../utils/cardImageStorage';

export interface ScannedCardResult {
  card: CardData;
  confidence: 'high' | 'medium';
  method: 'gemini-vision' | 'catalog-match';
}

// Convert File to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Robust number extractor from filename (e.g. "001.png", "085.jpg", "card_15.png", "236.webp")
export function extractNumberFromFilename(fileName: string): number | null {
  // First test clean base name without extension
  const baseName = fileName.replace(/\.[a-z0-9]+$/i, '').trim();

  // Pure number filenames like "001", "15", "085", "236"
  if (/^\d{1,3}$/.test(baseName)) {
    const n = parseInt(baseName, 10);
    if (n >= 1 && n <= 999) return n;
  }

  // Prefix patterns like "carta_001", "card-15", "001_arturo"
  const match = baseName.match(/(?:^|[^0-9])0*([1-9][0-9]{0,2})(?:[^0-9]|$)/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 999) return n;
  }

  // Any digits sequence
  const anyDigits = baseName.match(/(\d{1,3})/);
  if (anyDigits) {
    const n = parseInt(anyDigits[1], 10);
    if (n >= 1 && n <= 999) return n;
  }

  return null;
}

// Try local matching from filename or number (supports 1 to 999 or any name, across canonical and custom cards)
export function matchCardFromFilename(fileName: string, extraCards: CardData[] = []): CardData | null {
  const pool = [...extraCards, ...CANONICAL_CARDS];
  const num = extractNumberFromFilename(fileName);
  if (num) {
    const found = pool.find((c) => c.number === num);
    if (found) return found;
  }

  // Try matching by name
  const cleanName = fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ')
    .trim();

  const foundByName = pool.find((c) => {
    const norm = c.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    return cleanName.includes(norm) || norm.includes(cleanName);
  });

  return foundByName || null;
}

export function resolveCardInfoFromFilename(
  fileName: string,
  extraCards: CardData[] = []
): {
  cardNumber: number;
  cardName: string;
  matchedCard: CardData | null;
} {
  const matched = matchCardFromFilename(fileName, extraCards);
  if (matched) {
    return {
      cardNumber: matched.number,
      cardName: matched.name,
      matchedCard: matched,
    };
  }

  const num = extractNumberFromFilename(fileName) || Math.floor(Math.random() * 800) + 100;
  const cleanName = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]/g, ' ')
    .trim()
    .toUpperCase();

  return {
    cardNumber: num,
    cardName: cleanName,
    matchedCard: null,
  };
}

// Scan card image using server-side Gemini 3.8 Flash Vision
export async function scanCardWithAi(file: File): Promise<ScannedCardResult> {
  const rawBase64 = await fileToBase64(file);
  const base64Data = await optimizeCardImage(rawBase64, 1400);

  try {
    const response = await fetch('/api/scan-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: file.type || 'image/png',
        fileName: file.name,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.card) {
      const raw = data.card;

      const recognizedCard: CardData = {
        id: `scanned-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        number: Number(raw.number) || 1,
        totalInSet: Number(raw.totalInSet) || 236,
        edition: raw.edition || 'Espada Sagrada',
        name: (raw.name || 'CARTA ESCANEADA').toUpperCase().trim(),
        type: (raw.type as CardType) || 'Aliado',
        race: (raw.race as CardRace) || 'Sin Raza',
        strength: Number(raw.strength) || 0,
        cost: Number(raw.cost) || 0,
        flavorText: raw.flavorText || '',
        ability: raw.ability || '',
        illustrator: raw.illustrator || 'Desconocido',
        rarity: (raw.rarity as CardRarity) || 'Vasallo',
        foil: 'none',
        imageUrl: base64Data, // Uses the scanned card image directly!
        isCustom: true,
        uniqueCard: !!raw.uniqueCard,
      };

      return {
        card: recognizedCard,
        confidence: 'high',
        method: 'gemini-vision',
      };
    }
  } catch (error) {
    console.warn('AI Vision scan failed, falling back to catalog matching:', error);
  }

  // Fallback: match by filename or create custom card
  const matched = matchCardFromFilename(file.name);
  if (matched) {
    return {
      card: {
        ...matched,
        imageUrl: base64Data,
      },
      confidence: 'medium',
      method: 'catalog-match',
    };
  }

  // Generic custom card from image
  const fallbackNum = parseInt(file.name.match(/\d+/)?.[0] || '1', 10);
  const cleanTitle = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]/g, ' ')
    .toUpperCase();

  return {
    card: {
      id: `custom-scan-${Date.now()}`,
      number: fallbackNum,
      totalInSet: 236,
      edition: 'Espada Sagrada',
      name: cleanTitle,
      type: 'Aliado',
      race: 'Sin Raza',
      strength: 2,
      cost: 2,
      flavorText: 'Carta importada al archivo de Mitos y Leyendas.',
      ability: 'Habilidad por definir.',
      illustrator: 'Desconocido',
      rarity: 'Cortesano',
      foil: 'none',
      imageUrl: base64Data,
      isCustom: true,
    },
    confidence: 'medium',
    method: 'catalog-match',
  };
}
