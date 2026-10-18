import React, { useState, useRef, useEffect } from 'react';
import { CardData } from '../types/card';
import { CardArt } from './CardArtPresets';

interface MythosCardProps {
  card: CardData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isFlipped?: boolean;
  onFlip?: () => void;
  onClick?: () => void;
  interactive?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  showActions?: boolean;
  displayMode?: 'full-art' | 'frame';
  onEdit?: (card: CardData) => void;
  onInspect?: (card: CardData) => void;
}

export const MythosCard: React.FC<MythosCardProps> = ({
  card,
  size = 'md',
  isFlipped = false,
  onFlip,
  onClick,
  interactive = true,
  selected = false,
  highlighted = false,
  showActions = false,
  displayMode = 'full-art',
  onEdit,
  onInspect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [card.imageUrl]);

  // Scalable dimensions maintaining authentic TCG 63x88mm ratio (1 : 1.4)
  const sizeMap = {
    xs: 'w-[96px] h-[136px] sm:w-[104px] sm:h-[148px] text-[7px]',
    sm: 'w-[120px] h-[170px] sm:w-[130px] sm:h-[184px] text-[8px]',
    md: 'w-[220px] h-[314px] text-[10px]',
    lg: 'w-[290px] h-[414px] text-[12px]',
    xl: 'w-[340px] h-[486px] text-[13px]',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current || isFlipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotateX(rX);
    setRotateY(rY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  // Check if we should render full original card image
  const hasValidImage = Boolean(card.imageUrl && !imageFailed);
  const isFullArtMode = displayMode === 'full-art' && hasValidImage;

  return (
    <div
      className={`relative inline-block select-none group perspective-1000 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{ willChange: 'transform' }}
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
            isFlipped ? 'rotateY(180deg)' : ''
          }`,
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
        }}
        className={`relative ${sizeMap[size]} preserve-3d transition-shadow duration-300 rounded-[10px] ${
          selected
            ? 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
            : highlighted
            ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
            : 'shadow-xl hover:shadow-2xl'
        }`}
      >
        {/* ================= FRONT FACE ================= */}
        <div
          className={`absolute inset-0 backface-hidden rounded-[10px] p-[5px] bg-[#fbf9f4] border border-[#d6cfbe] shadow-inner overflow-hidden flex flex-col justify-between`}
        >
          {isFullArtMode ? (
            /* --- FULL ORIGINAL CARD IMAGE MODE --- */
            <div className="relative w-full h-full rounded-[6px] overflow-hidden bg-black">
              <img
                src={card.imageUrl}
                alt={card.name}
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />

              {/* Holographic foil overlay on top of original image */}
              {card.foil !== 'none' && (
                <div
                  className={`absolute inset-0 pointer-events-none z-20 transition-opacity duration-300 ${
                    card.foil === 'rainbow' ? 'foil-rainbow' : 'foil-gold'
                  } ${isHovered ? 'opacity-85' : 'opacity-35'}`}
                  style={{
                    backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
                    filter: `brightness(${1 + Math.abs(rotateY) * 0.04})`,
                  }}
                />
              )}

              {/* Specular glare reflection */}
              {isHovered && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle 120px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.4) 0%, transparent 80%)`,
                    mixBlendMode: 'overlay',
                  }}
                />
              )}
            </div>
          ) : (
            /* --- DYNAMIC FRAME WITH BACKGROUND ARTWORK MODE --- */
            <div className="relative w-full h-full rounded-[6px] overflow-hidden bg-black flex flex-col justify-between border border-neutral-300/60">
              {/* Background Illustration */}
              <div className="absolute inset-0 z-0">
                {hasValidImage ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <CardArt
                    preset={card.imagePreset}
                    imageUrl={undefined}
                    name={card.name}
                    race={card.race}
                  />
                )}
                {/* Subtle vignette scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />
              </div>

              {/* --- TOP HEADER ROW: Red Shield (Fuerza) on Left, Gold Coin (Coste) on Right --- */}
              <div className="relative z-10 flex items-start justify-between p-1.5 pointer-events-none">
                {/* Red Shield (Fuerza / Combat Strength) */}
                <div className="flex flex-col items-center">
                  <div className="relative w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <svg viewBox="0 0 40 50" className="w-full h-full">
                      {/* Outer silver border */}
                      <path
                        d="M20,2 L38,10 L38,28 Q38,44 20,48 Q2,44 2,28 L2,10 Z"
                        fill="#b91c1c"
                        stroke="#f1f5f9"
                        strokeWidth="2.5"
                      />
                      {/* Inner crimson gradient */}
                      <path
                        d="M20,5 L35,12 L35,26 Q35,40 20,44 Q5,40 5,26 L5,12 Z"
                        fill="url(#shieldGrad)"
                      />
                      <defs>
                        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#dc2626" />
                          <stop offset="60%" stopColor="#991b1b" />
                          <stop offset="100%" stopColor="#450a0a" />
                        </linearGradient>
                      </defs>
                      <circle cx="20" cy="24" r="8" fill="none" stroke="#f87171" strokeWidth="0.8" opacity="0.6" />
                    </svg>
                    {/* Strength Number */}
                    <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black text-white text-lg md:text-2xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] pb-1">
                      {card.strength}
                    </span>
                  </div>
                  {/* Race title under shield */}
                  <span className="text-[9px] md:text-[11px] font-medieval italic font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wide mt-0.5">
                    {card.race}
                  </span>
                </div>

                {/* Gold Coin Medallion (Coste en Oro) */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                  <svg viewBox="0 0 40 40" className="w-full h-full">
                    <circle cx="20" cy="20" r="19" fill="#ca8a04" stroke="#fef08a" strokeWidth="2" />
                    <circle cx="20" cy="20" r="16" fill="url(#goldGrad)" stroke="#a16207" strokeWidth="1" />
                    <circle cx="20" cy="20" r="13" fill="none" stroke="#eab308" strokeWidth="1" strokeDasharray="2,2" />
                    <defs>
                      <radialGradient id="goldGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="40%" stopColor="#eab308" />
                        <stop offset="85%" stopColor="#a16207" />
                        <stop offset="100%" stopColor="#713f12" />
                      </radialGradient>
                    </defs>
                  </svg>
                  {/* Cost Number */}
                  <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black text-amber-950 text-lg md:text-2xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                    {card.cost}
                  </span>
                </div>
              </div>

              {/* --- VERTICAL TITLE (Along left side) --- */}
              <div className="absolute left-2 top-20 bottom-36 z-10 pointer-events-none flex items-center">
                <div
                  className="transform -rotate-90 origin-left text-neutral-100 font-cinzel font-extrabold uppercase tracking-widest whitespace-nowrap drop-shadow-[0_2px_3px_rgba(0,0,0,1)]"
                  style={{
                    fontSize: size === 'sm' ? '9px' : size === 'md' ? '13px' : '17px',
                    textShadow: '0 2px 4px #000, 0 0 8px rgba(0,0,0,0.9), 1px 1px 0 #fff',
                  }}
                >
                  {card.name}
                </div>
              </div>

              {/* --- FLAVOR TEXT (Mid-art quote) --- */}
              {card.flavorText && size !== 'sm' && (
                <div className="relative z-10 px-4 mb-2 max-w-[78%] ml-auto pointer-events-none">
                  <p className="font-cinzel text-[8px] md:text-[9.5px] leading-tight text-white uppercase drop-shadow-[0_1.5px_3px_rgba(0,0,0,1)] font-semibold text-right">
                    {card.flavorText}
                  </p>
                </div>
              )}

              {/* --- BOTTOM ABILITY BOX & PARCHMENT SCROLL --- */}
              <div className="relative z-10 mx-1 mb-1 p-2 rounded-[8px] bg-gradient-to-b from-[#fbf8ed] via-[#f7f2dc] to-[#ede3c2] border border-[#c5b58d] shadow-[0_2px_6px_rgba(0,0,0,0.4)] flex flex-col justify-between min-h-[75px] md:min-h-[92px]">
                {/* Ornate Gold Filigree Corners */}
                <div className="absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2 border-amber-600 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-0.5 right-0.5 w-3 h-3 border-t-2 border-r-2 border-amber-600 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-0.5 left-0.5 w-3 h-3 border-b-2 border-l-2 border-amber-600 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2 border-amber-600 rounded-br-sm pointer-events-none" />

                {/* Ability Text + Race Dragon Emblem */}
                <div className="flex items-center gap-1.5 my-auto">
                  <p className="font-medieval italic font-medium text-stone-900 text-[8.5px] md:text-[10.5px] leading-snug flex-1">
                    {card.ability}
                  </p>

                  {/* Purple Oval Emblem with Silver Dragon */}
                  <div className="shrink-0 w-6 h-9 md:w-8 md:h-11 rounded-full bg-gradient-to-b from-purple-900 via-fuchsia-950 to-purple-950 border border-purple-400/60 shadow flex items-center justify-center p-0.5">
                    <svg viewBox="0 0 24 32" className="w-full h-full text-slate-100 fill-current filter drop-shadow">
                      <path d="M12,2 Q16,4 18,8 Q15,10 13,8 Q12,12 16,14 Q19,16 18,20 Q16,24 12,28 Q10,26 9,23 Q12,22 13,19 Q11,18 9,15 Q7,12 8,7 Q10,3 12,2 Z" />
                      <circle cx="14" cy="6" r="1" fill="#fff" />
                    </svg>
                  </div>
                </div>

                {/* Bottom Card Info: Illustrator & Collector Number */}
                <div className="flex items-center justify-between text-[7px] md:text-[8px] font-sans font-bold text-stone-800 tracking-wider pt-1 border-t border-[#e2d5b6] mt-0.5 uppercase">
                  <span className="truncate max-w-[55%]">ILUSTRADOR: {card.illustrator}</span>
                  <span className="shrink-0">
                    {card.number} - {card.totalInSet} / {card.edition}
                  </span>
                </div>
              </div>

              {/* --- HOLOGRAPHIC FOIL SHINE OVERLAY --- */}
              {card.foil !== 'none' && (
                <div
                  className={`absolute inset-0 pointer-events-none z-20 transition-opacity duration-300 ${
                    card.foil === 'rainbow' ? 'foil-rainbow' : 'foil-gold'
                  } ${isHovered ? 'opacity-85' : 'opacity-40'}`}
                  style={{
                    backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
                    filter: `brightness(${1 + Math.abs(rotateY) * 0.04})`,
                  }}
                />
              )}

              {/* Specular glare reflection */}
              {isHovered && (
                <div
                  className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle 120px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, transparent 80%)`,
                    mixBlendMode: 'overlay',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* ================= BACK FACE ================= */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[10px] p-[5px] bg-[#fbf9f4] border border-[#d6cfbe] shadow-inner overflow-hidden`}
        >
          <div className="w-full h-full rounded-[6px] overflow-hidden relative bg-[#2a1708] border border-amber-900/60 flex items-center justify-center">
            {/* Authentic Mitos y Leyendas Card Back */}
            <img
              src="/card-back.png"
              alt="Reverso Oficial Mitos y Leyendas"
              className="w-full h-full object-cover select-none"
              loading="lazy"
              onError={(e) => {
                // Fallback to local asset if needed
                e.currentTarget.src = '/cards/back.png';
              }}
            />
          </div>
        </div>
      </div>

      {/* Optional action buttons on hover / trigger */}
      {showActions && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs">
          {onFlip && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded text-[11px] font-medium transition-colors"
              title="Voltear carta"
            >
              🔄 Reverso
            </button>
          )}
          {onInspect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspect(card);
              }}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium transition-colors"
              title="Ver en 3D"
            >
              🔍 Detalle
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card);
              }}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] font-medium transition-colors"
              title="Editar en Generador"
            >
              ✏️ Modificar
            </button>
          )}
        </div>
      )}
    </div>
  );
};
