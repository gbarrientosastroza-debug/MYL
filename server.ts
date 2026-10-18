import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_FILE = path.join(DATA_DIR, 'vault-images.json');
const CARDS_FILE = path.join(DATA_DIR, 'custom-cards.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStoredImages(): Record<string, string> {
  try {
    ensureDataDir();
    if (fs.existsSync(IMAGES_FILE)) {
      const content = fs.readFileSync(IMAGES_FILE, 'utf8');
      return JSON.parse(content) || {};
    }
  } catch (e) {
    console.warn('Error reading stored images:', e);
  }
  return {};
}

function saveStoredImages(images: Record<string, string>) {
  try {
    ensureDataDir();
    fs.writeFileSync(IMAGES_FILE, JSON.stringify(images), 'utf8');
  } catch (e) {
    console.warn('Error writing stored images:', e);
  }
}

function getStoredCards(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(CARDS_FILE)) {
      const content = fs.readFileSync(CARDS_FILE, 'utf8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn('Error reading stored cards:', e);
  }
  return [];
}

function saveStoredCards(cards: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(CARDS_FILE, JSON.stringify(cards), 'utf8');
  } catch (e) {
    console.warn('Error writing stored cards:', e);
  }
}

const ai = new GoogleGenAI();

// Endpoint to scan a card image and recognize full attributes (ability, strength, cost, race, type, etc.)
app.post('/api/scan-card', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', fileName = '' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 es requerido' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/png',
                data: cleanBase64,
              },
            },
            {
              text: `Eres un juez oficial y archivista experto del juego de cartas coleccionables Mitos y Leyendas (TCG de Salo / Fénix, formato Primer Bloque y Espada Sagrada).
Analiza esta imagen de carta de Mitos y Leyendas con máxima fidelidad.
Lee y extrae con total precisión:
1. Nombre exacto de la carta (en el costado izquierdo o cabecera).
2. Coste de Oro (número en la moneda dorada superior derecha).
3. Tipo de carta: Aliado, Talismán, Arma, Tótem u Oro.
4. Raza (si es Aliado, escrita bajo el escudo de fuerza; ej: Caballero, Dragón, Faerie, Olímpico, Héroe, Sombra, Eterno, Bestia, Sacerdote; si no tiene raza usa "Sin Raza").
5. Fuerza impresa (número dentro del escudo rojo en la esquina superior izquierda. Si no es un Aliado, es 0).
6. Caja de texto: Lee textualmente toda la habilidad de la carta sin omitir nada.
7. Texto épico (flavor text / cita histórica o mítica en cursiva dentro de la ilustración).
8. Ilustrador de la carta.
9. Edición (ej: "Espada Sagrada" o "Primera Edición").
10. Número de carta y total de edición (ej: si dice 001/236, el número es 1 y el total es 236). Si el archivo se llama "${fileName}", úsalo como pista numérica si aplica.
11. Rareza: Vasallo (común con ícono verde/azul), Cortesano (infrecuente con ícono rojo), Real (rara con ícono dorado), Ultra Real o Promocional.
12. uniqueCard: true si dice "Única" o "Solo puedes tener una copia en juego".`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: {
              type: Type.STRING,
              enum: ['Aliado', 'Talismán', 'Arma', 'Tótem', 'Oro'],
            },
            race: {
              type: Type.STRING,
              enum: [
                'Caballero',
                'Dragón',
                'Faerie',
                'Olímpico',
                'Héroe',
                'Sombra',
                'Eterno',
                'Bestia',
                'Sacerdote',
                'Sin Raza',
              ],
            },
            cost: { type: Type.INTEGER },
            strength: { type: Type.INTEGER },
            ability: { type: Type.STRING },
            flavorText: { type: Type.STRING },
            edition: { type: Type.STRING },
            number: { type: Type.INTEGER },
            totalInSet: { type: Type.INTEGER },
            illustrator: { type: Type.STRING },
            rarity: {
              type: Type.STRING,
              enum: ['Vasallo', 'Cortesano', 'Real', 'Ultra Real', 'Promocional'],
            },
            uniqueCard: { type: Type.BOOLEAN },
          },
          required: ['name', 'type', 'race', 'cost', 'strength', 'ability'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, card: parsed });
  } catch (err: any) {
    console.error('Error scanning card:', err);
    return res.status(500).json({ error: err.message || 'Error procesando la imagen de la carta' });
  }
});

// Endpoints to store and retrieve card background images & custom cards permanently on server disk
app.get('/api/card-images', (req, res) => {
  const images = getStoredImages();
  res.json({ success: true, images });
});

app.post('/api/card-images', (req, res) => {
  try {
    const { images } = req.body;
    if (!images || typeof images !== 'object') {
      return res.status(400).json({ error: 'images object es requerido' });
    }
    const current = getStoredImages();
    const updated = { ...current, ...images };
    saveStoredImages(updated);
    res.json({ success: true, count: Object.keys(updated).length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/card-images/:key', (req, res) => {
  try {
    const { key } = req.params;
    const current = getStoredImages();
    if (key === 'all') {
      saveStoredImages({});
    } else {
      delete current[key];
      saveStoredImages(current);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/custom-cards', (req, res) => {
  const cards = getStoredCards();
  res.json({ success: true, cards });
});

app.post('/api/custom-cards', (req, res) => {
  try {
    const { cards } = req.body;
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards array es requerido' });
    }
    saveStoredCards(cards);
    res.json({ success: true, count: cards.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Mitos & Leyendas server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
