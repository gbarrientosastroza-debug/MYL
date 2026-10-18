import React from 'react';

interface CardArtProps {
  preset?: string;
  imageUrl?: string;
  name: string;
  race: string;
}

export const CardArt: React.FC<CardArtProps> = ({ preset, imageUrl, name, race }) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover select-none"
        referrerPolicy="no-referrer"
      />
    );
  }

  // Pre-configured rich thematic vector atmospheres
  switch (preset) {
    case 'arturo':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-sky-400 via-amber-200 to-amber-700 overflow-hidden">
          {/* Castle silhouette */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Sun & sky */}
            <circle cx="210" cy="90" r="45" fill="#fef08a" opacity="0.6" />
            <polygon points="120,60 140,40 160,60 160,180 120,180" fill="#78716c" opacity="0.8" />
            <polygon points="50,90 80,70 110,90 110,210 50,210" fill="#57534e" opacity="0.9" />
            <rect x="70" y="110" width="80" height="110" fill="#a8a29e" opacity="0.75" />
            {/* River */}
            <path d="M0,230 Q150,220 300,260 L300,400 L0,400 Z" fill="#0284c7" opacity="0.45" />
            {/* King silhouette figure */}
            <circle cx="215" cy="110" r="18" fill="#fcd34d" />
            {/* Crown */}
            <polygon points="205,98 210,92 215,96 220,92 225,98" fill="#eab308" />
            {/* Red cape */}
            <path d="M195,120 Q160,190 140,290 L245,290 Q240,190 230,120 Z" fill="#b91c1c" />
            {/* Golden plate */}
            <rect x="200" y="125" width="30" height="55" rx="6" fill="#f59e0b" />
            {/* Sword */}
            <line x1="165" y1="170" x2="175" y2="330" stroke="#f1f5f9" strokeWidth="4" />
            <line x1="155" y1="185" x2="185" y2="185" stroke="#fbbf24" strokeWidth="4" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'guinivere':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-amber-100 via-rose-300 to-purple-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            <circle cx="150" cy="140" r="75" fill="#fde047" opacity="0.4" filter="blur(8px)" />
            {/* Flowing golden hair */}
            <path d="M80,100 Q150,50 220,100 Q260,170 230,260 Q150,240 70,240 Q40,170 80,100 Z" fill="#f59e0b" />
            {/* Purple Royal Dress */}
            <path d="M90,170 Q150,150 210,170 L250,380 L50,380 Z" fill="#7e22ce" />
            <path d="M110,190 Q150,180 190,190 L210,320 L90,320 Z" fill="#a855f7" opacity="0.8" />
            {/* Golden necklace */}
            <path d="M125,180 Q150,205 175,180" stroke="#fbbf24" strokeWidth="4" fill="none" />
            <circle cx="150" cy="205" r="4" fill="#fbbf24" />
            {/* Face/silhouette */}
            <ellipse cx="150" cy="135" rx="28" ry="36" fill="#fef08a" opacity="0.9" />
            <polygon points="135,105 142,95 150,102 158,95 165,105" fill="#eab308" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      );

    case 'lancelot':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-emerald-800 via-emerald-600 to-slate-900 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Rolling hills */}
            <path d="M0,180 Q120,140 300,190 L300,400 L0,400 Z" fill="#15803d" />
            {/* Black warhorse silhouette */}
            <ellipse cx="85" cy="180" rx="45" ry="60" fill="#1e293b" />
            <circle cx="65" cy="130" r="30" fill="#0f172a" />
            {/* Knight in gleaming silver armor */}
            <rect x="170" y="130" width="60" height="90" rx="10" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="3" />
            {/* Helmet / hair */}
            <circle cx="200" cy="105" r="22" fill="#fef08a" />
            {/* Silver pauldrons */}
            <ellipse cx="165" cy="140" rx="15" ry="20" fill="#e2e8f0" />
            <ellipse cx="235" cy="140" rx="15" ry="20" fill="#e2e8f0" />
            {/* Greaves */}
            <rect x="175" y="220" width="22" height="110" fill="#94a3b8" />
            <rect x="205" y="220" width="22" height="110" fill="#64748b" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'gawein':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-amber-600 via-orange-600 to-red-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Flaming sky */}
            <circle cx="150" cy="90" r="70" fill="#fb923c" opacity="0.6" filter="blur(10px)" />
            {/* Giant battle axe held overhead */}
            <line x1="80" y1="160" x2="210" y2="70" stroke="#78350f" strokeWidth="8" strokeLinecap="round" />
            <path d="M190,40 Q240,60 210,110 Q180,85 190,40 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            {/* Armored warrior */}
            <rect x="120" y="140" width="65" height="85" rx="8" fill="#94a3b8" />
            <circle cx="152" cy="115" r="22" fill="#71717a" />
            {/* Cape */}
            <path d="M110,150 Q80,240 70,330 L190,330 Q185,240 180,150 Z" fill="#6b21a8" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'wyrm':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-blue-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Mystical cave stones */}
            <polygon points="0,400 40,250 100,400" fill="#1e293b" />
            <polygon points="200,400 260,240 300,400" fill="#1e293b" />
            {/* Giant Wyrm head */}
            <path d="M70,220 Q120,90 220,110 Q250,150 210,190 Q150,240 110,290 Z" fill="#1e40af" stroke="#38bdf8" strokeWidth="2" />
            {/* Horns */}
            <polygon points="190,110 240,60 210,120" fill="#cbd5e1" />
            <polygon points="160,100 200,40 180,110" fill="#94a3b8" />
            {/* Eye glowing cyan */}
            <circle cx="195" cy="145" r="7" fill="#38bdf8" filter="blur(1px)" />
            <circle cx="195" cy="145" r="3" fill="#ffffff" />
            {/* Spine scales */}
            <polygon points="120,160 110,140 130,160" fill="#60a5fa" />
            <polygon points="100,200 90,180 110,200" fill="#60a5fa" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      );

    case 'magma':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-amber-700 via-red-800 to-stone-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Volcano peaks */}
            <polygon points="0,320 120,190 240,320" fill="#292524" />
            <polygon points="160,340 250,210 300,340" fill="#1c1917" />
            {/* Red Dragon body */}
            <ellipse cx="160" cy="170" rx="60" ry="40" fill="#991b1b" />
            {/* Dragon wings */}
            <path d="M140,160 Q180,70 270,80 Q220,140 180,170 Z" fill="#7f1d1d" stroke="#f97316" strokeWidth="2" />
            {/* Fire breath beam */}
            <polygon points="120,185 280,310 270,335 110,195" fill="#facc15" opacity="0.8" />
            <line x1="120" y1="190" x2="275" y2="320" stroke="#ffffff" strokeWidth="4" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'eter':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-sky-900 to-indigo-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Storm lightning bolts */}
            <path d="M120,20 L110,90 L140,100 L100,180" stroke="#7dd3fc" strokeWidth="3" fill="none" opacity="0.9" />
            <path d="M220,10 L200,80 L230,95 L180,190" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.9" />
            <path d="M60,40 L80,110 L65,130 L90,200" stroke="#bae6fd" strokeWidth="2" fill="none" opacity="0.8" />
            {/* Blue-silver ethereal dragon */}
            <path d="M90,240 Q150,110 220,160 Q200,230 140,270 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="190" cy="155" r="5" fill="#ef4444" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'demonio':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-red-950 via-rose-950 to-stone-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Spiked abyss */}
            <circle cx="150" cy="150" r="90" fill="#450a0a" opacity="0.7" />
            {/* Coiled demonic dragon */}
            <path d="M80,260 Q130,80 230,130 Q250,210 180,260 Q120,280 80,260 Z" fill="#991b1b" stroke="#f87171" strokeWidth="3" />
            {/* Razor fangs */}
            <polygon points="190,145 200,160 205,145" fill="#ffffff" />
            <polygon points="205,145 215,160 220,145" fill="#ffffff" />
            {/* Bloody claws */}
            <path d="M220,240 L240,270 M235,240 L255,265" stroke="#ef4444" strokeWidth="4" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
      );

    case 'luz':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-amber-100 via-amber-200 to-amber-700 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Divine sunbeams */}
            <polygon points="150,0 90,400 130,400" fill="#ffffff" opacity="0.3" />
            <polygon points="150,0 170,400 210,400" fill="#ffffff" opacity="0.35" />
            <polygon points="150,0 230,400 270,400" fill="#fef08a" opacity="0.25" />
            {/* White noble dragon */}
            <path d="M120,280 Q140,110 200,120 Q220,180 180,260 Z" fill="#f8fafc" stroke="#fef08a" strokeWidth="3" />
            <ellipse cx="170" cy="140" rx="20" ry="12" fill="#e2e8f0" />
            {/* Translucent wings */}
            <path d="M140,170 Q70,90 40,130 Q90,200 140,200 Z" fill="#ffffff" opacity="0.5" stroke="#fde047" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    case 'aire':
      return (
        <div className="relative w-full h-full bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-950 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 400" preserveAspectRatio="none">
            {/* Soaring dragon with spread wings */}
            <path d="M150,180 Q80,70 10,120 Q70,200 140,210 Z" fill="#bae6fd" stroke="#ffffff" strokeWidth="2" />
            <path d="M150,180 Q220,70 290,120 Q230,200 160,210 Z" fill="#bae6fd" stroke="#ffffff" strokeWidth="2" />
            {/* Sleek icy blue body */}
            <ellipse cx="150" cy="200" rx="35" ry="60" fill="#38bdf8" />
            <circle cx="150" cy="140" r="18" fill="#e0f2fe" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );

    default:
      // Generic thematic fallback by race
      return (
        <div className={`relative w-full h-full overflow-hidden ${
          race === 'Dragón' 
            ? 'bg-gradient-to-b from-red-950 via-amber-900 to-stone-900' 
            : 'bg-gradient-to-b from-slate-800 via-amber-900/60 to-neutral-900'
        }`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full border-2 border-amber-400/40 flex items-center justify-center mb-3 bg-amber-950/40 backdrop-blur-xs">
              <span className="text-3xl text-amber-200">⚔️</span>
            </div>
            <div className="text-xs uppercase tracking-widest text-amber-300 font-cinzel font-bold">{race}</div>
            <div className="text-sm font-cinzel font-bold text-neutral-200 mt-1 max-w-[180px] truncate">{name}</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>
      );
  }
};
