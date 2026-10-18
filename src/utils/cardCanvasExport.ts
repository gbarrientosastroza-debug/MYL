import { CardData } from '../types/card';

/**
 * High-resolution HTML5 Canvas renderer to export cards to 750x1050 print-quality PNG
 */
export async function exportCardAsPng(card: CardData, mode: 'full-art' | 'frame' = 'full-art'): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1050;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background card paper
  ctx.fillStyle = '#fbf9f4';
  ctx.fillRect(0, 0, 750, 1050);

  // Outer border line
  ctx.strokeStyle = '#d6cfbe';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 730, 1030);

  // Main art inner rectangle
  const artX = 18;
  const artY = 18;
  const artW = 714;
  const artH = 1014;

  // Clip to inner card area
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, 12);
  ctx.clip();

  // If in full-art mode with an image available, render the full pristine card
  if (mode === 'full-art' && card.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = card.imageUrl!;
      });
      ctx.drawImage(img, artX, artY, artW, artH);
      ctx.restore(); // restore clipping

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${card.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_primera_edicion.png`;
      link.href = dataUrl;
      link.click();
      return;
    } catch {
      // Fallback to frame mode if image load fails
    }
  }

  // Otherwise, render dynamic interactive frame
  if (card.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = card.imageUrl!;
      });
      ctx.drawImage(img, artX, artY, artW, artH);
    } catch {
      drawFallbackArt(ctx, artX, artY, artW, artH, card);
    }
  } else {
    drawFallbackArt(ctx, artX, artY, artW, artH, card);
  }

  // Draw Dark Vignette gradient
  const vignette = ctx.createLinearGradient(0, artY, 0, artY + artH);
  vignette.addColorStop(0, 'rgba(0,0,0,0.3)');
  vignette.addColorStop(0.3, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.7, 'rgba(0,0,0,0.2)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = vignette;
  ctx.fillRect(artX, artY, artW, artH);

  // ================= 1. RED SHIELD (Top Left) =================
  ctx.save();
  const shieldX = artX + 22;
  const shieldY = artY + 16;
  const shieldW = 95;
  const shieldH = 115;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.moveTo(shieldX + shieldW / 2, shieldY);
  ctx.lineTo(shieldX + shieldW, shieldY + 22);
  ctx.lineTo(shieldX + shieldW, shieldY + 70);
  ctx.quadraticCurveTo(shieldX + shieldW, shieldY + shieldH, shieldX + shieldW / 2, shieldY + shieldH);
  ctx.quadraticCurveTo(shieldX, shieldY + shieldH, shieldX, shieldY + 70);
  ctx.lineTo(shieldX, shieldY + 22);
  ctx.closePath();

  const shieldGrad = ctx.createLinearGradient(shieldX, shieldY, shieldX + shieldW, shieldY + shieldH);
  shieldGrad.addColorStop(0, '#ef4444');
  shieldGrad.addColorStop(0.5, '#b91c1c');
  shieldGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = shieldGrad;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Strength Number inside shield
  ctx.save();
  ctx.font = 'bold 54px Cinzel, serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillText(card.strength.toString(), shieldX + shieldW / 2, shieldY + shieldH / 2 - 4);
  ctx.restore();

  // Race under shield
  ctx.save();
  ctx.font = 'italic bold 26px MedievalSharp, serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(card.race, shieldX + shieldW / 2, shieldY + shieldH + 28);
  ctx.restore();

  // ================= 2. GOLD COIN (Top Right) =================
  ctx.save();
  const coinR = 50;
  const coinX = artX + artW - coinR - 22;
  const coinY = artY + coinR + 18;

  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.arc(coinX, coinY, coinR, 0, Math.PI * 2);
  const coinGrad = ctx.createRadialGradient(coinX - 15, coinY - 15, 5, coinX, coinY, coinR);
  coinGrad.addColorStop(0, '#fef08a');
  coinGrad.addColorStop(0.4, '#eab308');
  coinGrad.addColorStop(0.85, '#a16207');
  coinGrad.addColorStop(1, '#713f12');
  ctx.fillStyle = coinGrad;
  ctx.fill();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(coinX, coinY, coinR - 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cost Number
  ctx.font = 'bold 58px Cinzel, serif';
  ctx.fillStyle = '#451a03';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillText(card.cost.toString(), coinX, coinY + 2);
  ctx.restore();

  // ================= 3. VERTICAL TITLE (Left) =================
  ctx.save();
  ctx.translate(artX + 44, artY + 540);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '900 36px Cinzel, serif';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText(card.name.toUpperCase(), 0, 0);
  ctx.restore();

  // ================= 4. FLAVOR TEXT (Center-Right Quote) =================
  if (card.flavorText) {
    ctx.save();
    ctx.font = 'bold 20px Cinzel, serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const maxWidth = 480;
    const words = card.flavorText.split(' ');
    let line = '';
    let textY = artY + 520;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, artX + artW - 35, textY);
        line = words[i] + ' ';
        textY += 26;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, artX + artW - 35, textY);
    ctx.restore();
  }

  // ================= 5. ABILITY SCROLL (Bottom Box) =================
  const boxX = artX + 16;
  const boxY = artY + artH - 240;
  const boxW = artW - 32;
  const boxH = 224;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 12);
  const scrollGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  scrollGrad.addColorStop(0, '#fbf8ed');
  scrollGrad.addColorStop(0.5, '#f5efd8');
  scrollGrad.addColorStop(1, '#ede2c2');
  ctx.fillStyle = scrollGrad;
  ctx.fill();

  ctx.strokeStyle = '#c5b58d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Gold Corners
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(boxX + 6, boxY + 6, 20, 20);
  ctx.strokeRect(boxX + boxW - 26, boxY + 6, 20, 20);
  ctx.strokeRect(boxX + 6, boxY + boxH - 26, 20, 20);
  ctx.strokeRect(boxX + boxW - 26, boxY + boxH - 26, 20, 20);

  // Purple Dragon Emblem on Right
  const emblemX = boxX + boxW - 75;
  const emblemY = boxY + boxH / 2 - 12;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(emblemX, emblemY, 32, 46, 0, 0, Math.PI * 2);
  const embGrad = ctx.createLinearGradient(emblemX - 30, emblemY - 45, emblemX + 30, emblemY + 45);
  embGrad.addColorStop(0, '#581c87');
  embGrad.addColorStop(0.5, '#7e22ce');
  embGrad.addColorStop(1, '#3b0764');
  ctx.fillStyle = embGrad;
  ctx.fill();
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Dragon silhouette glyph inside emblem
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐉', emblemX, emblemY);
  ctx.restore();

  // Ability Rules Text
  ctx.save();
  ctx.font = 'italic 500 23px MedievalSharp, serif';
  ctx.fillStyle = '#1c1917';
  const abilityMaxW = boxW - 130;
  const abilityWords = card.ability.split(' ');
  let abilityLine = '';
  let abilityY = boxY + 42;
  for (let n = 0; n < abilityWords.length; n++) {
    const testLine = abilityLine + abilityWords[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > abilityMaxW && n > 0) {
      ctx.fillText(abilityLine, boxX + 24, abilityY);
      abilityLine = abilityWords[n] + ' ';
      abilityY += 32;
    } else {
      abilityLine = testLine;
    }
  }
  ctx.fillText(abilityLine, boxX + 24, abilityY);
  ctx.restore();

  // Footer credits
  ctx.save();
  ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
  ctx.fillStyle = '#44403c';
  ctx.fillText(`ILUSTRADOR: ${card.illustrator.toUpperCase()}`, boxX + 24, boxY + boxH - 16);
  ctx.textAlign = 'right';
  ctx.fillText(`${card.number} - ${card.totalInSet} / ${card.edition}`, boxX + boxW - 24, boxY + boxH - 16);
  ctx.restore();

  ctx.restore(); // restore art clipping

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${card.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_primera_edicion.png`;
  link.href = dataUrl;
  link.click();
}

function drawFallbackArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  card: CardData
) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (card.race === 'Dragón') {
    grad.addColorStop(0, '#450a0a');
    grad.addColorStop(0.5, '#78350f');
    grad.addColorStop(1, '#1c1917');
  } else {
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#0f172a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Mythic crest in center
  ctx.font = '100px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.race === 'Dragón' ? '🐉' : '⚔️', x + w / 2, y + h / 2 - 80);
}

/**
 * Export official card back as 750x1050 print-quality PNG
 */
export async function exportCardBackAsPng(): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1050;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background card paper
  ctx.fillStyle = '#fbf9f4';
  ctx.fillRect(0, 0, 750, 1050);

  // Outer border line
  ctx.strokeStyle = '#d6cfbe';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 730, 1030);

  const artX = 18;
  const artY = 18;
  const artW = 714;
  const artH = 1014;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(artX, artY, artW, artH, 12);
  ctx.clip();

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = '/card-back.png';
    });
    ctx.drawImage(img, artX, artY, artW, artH);
  } catch (e) {
    console.error('Failed to load card-back image', e);
  }
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'mitos_y_leyendas_reverso_oficial.png';
  link.href = dataUrl;
  link.click();
}

