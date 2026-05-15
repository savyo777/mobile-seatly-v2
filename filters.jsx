5// filters.jsx — Cenaiva filter data + overlay renderer
// 12 filters: 6 beauty, 6 funny. Each filter is a pure data object that
// describes how to render its preview thumbnail AND its full-screen overlay.
// The actual face-tracking engine is out of scope — these are visual mockups
// designed to plug into a real engine later via the same data shape.

const FILTERS = [
  // ─────────────────────────────── BEAUTY ───────────────────────────────
  {
    id: 'lux-gem',
    name: 'Lux Gem',
    category: 'beauty',
    description: 'Luxury glam. Smooth skin, glossy lips, rich gem lighting.',
    preview: {
      // skin base, light direction, accent
      base: 'linear-gradient(160deg, #f7d9c4 0%, #d9a78a 55%, #8b5a4a 100%)',
      cast: 'radial-gradient(120% 80% at 30% 25%, rgba(180,140,255,0.28), transparent 55%), radial-gradient(80% 70% at 75% 70%, rgba(255,210,180,0.35), transparent 60%)',
      ring: 'linear-gradient(135deg, #d4af6a, #f4e3a3 50%, #b08a3e)',
    },
    overlay: {
      cssFilter: 'contrast(1.06) saturate(1.08) brightness(1.04)',
      light: 'radial-gradient(60% 45% at 30% 22%, rgba(190,160,255,0.18), transparent 70%), radial-gradient(45% 38% at 72% 68%, rgba(255,220,190,0.22), transparent 70%)',
      vignette: 'radial-gradient(110% 80% at 50% 50%, transparent 55%, rgba(20,10,30,0.35) 100%)',
      accents: [
        { kind: 'gloss', x: 50, y: 50, w: 18, h: 3, color: 'rgba(255,255,255,0.55)', blur: 5 },
        { kind: 'shimmer', x: 30, y: 22, size: 10 },
        { kind: 'shimmer', x: 70, y: 26, size: 8 },
      ],
    },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour Glow',
    category: 'beauty',
    description: 'Warm sunset light, bronzed glow, natural makeup.',
    preview: {
      base: 'linear-gradient(170deg, #ffd2a3 0%, #e0986a 55%, #6a3a25 100%)',
      cast: 'radial-gradient(90% 70% at 80% 15%, rgba(255,190,120,0.5), transparent 60%), radial-gradient(70% 60% at 25% 80%, rgba(180,90,40,0.25), transparent 60%)',
      ring: 'linear-gradient(135deg, #f3b876, #ffe1b0 50%, #b87a3a)',
    },
    overlay: {
      cssFilter: 'contrast(1.04) saturate(1.15) brightness(1.05) sepia(0.08)',
      light: 'radial-gradient(70% 50% at 80% 12%, rgba(255,190,120,0.35), transparent 65%), radial-gradient(50% 45% at 22% 78%, rgba(140,70,30,0.18), transparent 65%)',
      vignette: 'radial-gradient(120% 90% at 50% 50%, transparent 50%, rgba(60,25,10,0.4) 100%)',
      accents: [
        { kind: 'flare', x: 82, y: 14, size: 50, color: 'rgba(255,210,150,0.55)' },
        { kind: 'flare', x: 18, y: 50, size: 30, color: 'rgba(255,170,90,0.35)' },
      ],
    },
  },
  {
    id: 'dewy-glass',
    name: 'Dewy Glass',
    category: 'beauty',
    description: 'Fresh clean look. Dewy skin, soft shine, hydrated lips.',
    preview: {
      base: 'linear-gradient(170deg, #fff0e4 0%, #e6c2ad 55%, #8d6b58 100%)',
      cast: 'radial-gradient(120% 80% at 50% 18%, rgba(255,255,255,0.45), transparent 60%), radial-gradient(60% 50% at 50% 90%, rgba(200,230,255,0.3), transparent 60%)',
      ring: 'linear-gradient(135deg, #cfe8ee, #f6fbfd 50%, #9fb8c2)',
    },
    overlay: {
      cssFilter: 'contrast(1.02) saturate(1.05) brightness(1.1)',
      light: 'radial-gradient(90% 60% at 50% 15%, rgba(255,255,255,0.28), transparent 70%)',
      vignette: 'radial-gradient(110% 90% at 50% 50%, transparent 60%, rgba(180,200,220,0.18) 100%)',
      accents: [
        { kind: 'dew', x: 28, y: 30, size: 6 },
        { kind: 'dew', x: 72, y: 26, size: 8 },
        { kind: 'dew', x: 55, y: 42, size: 5 },
        { kind: 'dew', x: 38, y: 48, size: 7 },
        { kind: 'gloss', x: 50, y: 52, w: 16, h: 2.5, color: 'rgba(255,255,255,0.7)', blur: 4 },
      ],
    },
  },
  {
    id: 'soft-baddie',
    name: 'Soft Baddie',
    category: 'beauty',
    description: 'Lifted lashes, glossy lips, confident glam.',
    preview: {
      base: 'linear-gradient(165deg, #f3c8b3 0%, #b87764 55%, #4a2218 100%)',
      cast: 'radial-gradient(90% 70% at 30% 80%, rgba(180,40,70,0.25), transparent 60%), radial-gradient(70% 50% at 75% 25%, rgba(255,200,170,0.3), transparent 65%)',
      ring: 'linear-gradient(135deg, #8a3a4a, #d97a8a 50%, #5a1f2c)',
    },
    overlay: {
      cssFilter: 'contrast(1.12) saturate(1.18) brightness(1.0)',
      light: 'radial-gradient(60% 45% at 72% 22%, rgba(255,200,170,0.22), transparent 70%)',
      vignette: 'radial-gradient(110% 80% at 50% 55%, transparent 50%, rgba(30,8,15,0.5) 100%)',
      accents: [
        { kind: 'liner', x: 32, y: 36, w: 14, h: 1.5 },
        { kind: 'liner', x: 68, y: 36, w: 14, h: 1.5 },
        { kind: 'gloss', x: 50, y: 52, w: 18, h: 3, color: 'rgba(220,80,100,0.55)', blur: 4 },
      ],
    },
  },
  {
    id: 'angel-light',
    name: 'Angel Light',
    category: 'beauty',
    description: 'Soft dreamy halo, smooth skin, gentle blush.',
    preview: {
      base: 'linear-gradient(175deg, #ffe8df 0%, #e0baad 55%, #826259 100%)',
      cast: 'radial-gradient(110% 70% at 50% 0%, rgba(255,255,255,0.55), transparent 55%), radial-gradient(60% 50% at 50% 100%, rgba(255,210,220,0.25), transparent 60%)',
      ring: 'linear-gradient(135deg, #f7e6d6, #ffffff 50%, #d9c6b6)',
    },
    overlay: {
      cssFilter: 'contrast(0.98) saturate(0.95) brightness(1.12)',
      light: 'radial-gradient(120% 60% at 50% -10%, rgba(255,255,255,0.55), transparent 60%)',
      vignette: 'radial-gradient(110% 90% at 50% 60%, transparent 55%, rgba(240,220,230,0.3) 100%)',
      accents: [
        { kind: 'halo', x: 50, y: 6, size: 70 },
        { kind: 'blush', x: 30, y: 44, size: 14 },
        { kind: 'blush', x: 70, y: 44, size: 14 },
      ],
    },
  },
  {
    id: 'night-out',
    name: 'Night Out Glam',
    category: 'beauty',
    description: 'Flash lighting, defined eyes, glossy nightlife glam.',
    preview: {
      base: 'linear-gradient(175deg, #f0c8b3 0%, #8a5040 55%, #1a0608 100%)',
      cast: 'radial-gradient(80% 60% at 50% 30%, rgba(255,235,210,0.55), transparent 55%), radial-gradient(120% 100% at 50% 110%, rgba(0,0,0,0.7), transparent 60%)',
      ring: 'linear-gradient(135deg, #d8367a, #ffb0c8 50%, #6a0a2a)',
    },
    overlay: {
      cssFilter: 'contrast(1.18) saturate(1.12) brightness(1.02)',
      light: 'radial-gradient(70% 45% at 50% 28%, rgba(255,240,220,0.4), transparent 60%)',
      vignette: 'radial-gradient(80% 70% at 50% 50%, transparent 35%, rgba(0,0,0,0.7) 100%)',
      accents: [
        { kind: 'gloss', x: 50, y: 52, w: 18, h: 3.5, color: 'rgba(220,60,90,0.65)', blur: 4 },
        { kind: 'shimmer', x: 28, y: 36, size: 7 },
        { kind: 'shimmer', x: 72, y: 36, size: 7 },
        { kind: 'liner', x: 32, y: 36, w: 12, h: 1.5 },
        { kind: 'liner', x: 68, y: 36, w: 12, h: 1.5 },
      ],
    },
  },

  // ─────────────────────────────── FUNNY ───────────────────────────────
  {
    id: 'tiny-face-ceo',
    name: 'Tiny Face CEO',
    category: 'funny',
    description: 'Oversized forehead, miniature face, executive energy.',
    preview: {
      base: 'linear-gradient(170deg, #f3d4b8 0%, #c89878 55%, #6d4836 100%)',
      cast: 'linear-gradient(180deg, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.25) 100%)',
      ring: 'linear-gradient(135deg, #1a1a1a, #444 50%, #0a0a0a)',
      badge: 'CEO',
    },
    overlay: {
      cssFilter: 'contrast(1.05) saturate(1.0)',
      light: 'none',
      vignette: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)',
      accents: [
        { kind: 'tinyFace', x: 50, y: 50, size: 18 },
        { kind: 'tag', x: 50, y: 60, text: 'CEO MODE ACTIVATED', style: 'corp' },
        { kind: 'emoji', x: 18, y: 30, char: '💼', size: 30, tilt: -10 },
        { kind: 'emoji', x: 82, y: 30, char: '📈', size: 30, tilt: 10 },
      ],
    },
  },
  {
    id: 'food-coma',
    name: 'Food Coma',
    category: 'funny',
    description: 'Puffy cheeks, sleepy eyes, "I ate too much" energy.',
    preview: {
      base: 'linear-gradient(170deg, #ffd7bd 0%, #d39a7a 55%, #6e3d2a 100%)',
      cast: 'radial-gradient(40% 30% at 28% 55%, rgba(255,150,120,0.35), transparent 70%), radial-gradient(40% 30% at 72% 55%, rgba(255,150,120,0.35), transparent 70%)',
      ring: 'linear-gradient(135deg, #f4a85c, #ffd49a 50%, #b56a2a)',
      badge: '😴',
    },
    overlay: {
      cssFilter: 'contrast(1.0) saturate(1.05) brightness(1.02)',
      light: 'none',
      vignette: 'radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(40,20,10,0.3) 100%)',
      accents: [
        { kind: 'puffyCheek', x: 26, y: 44, size: 20 },
        { kind: 'puffyCheek', x: 74, y: 44, size: 20 },
        { kind: 'sleepyEye', x: 35, y: 32 },
        { kind: 'sleepyEye', x: 65, y: 32 },
        { kind: 'emoji', x: 14, y: 18, char: '🍕', size: 30, tilt: -14 },
        { kind: 'emoji', x: 86, y: 22, char: '🍔', size: 30, tilt: 18 },
        { kind: 'emoji', x: 90, y: 50, char: '🍰', size: 26, tilt: -6 },
        { kind: 'emoji', x: 10, y: 52, char: '🥟', size: 26, tilt: 10 },
        { kind: 'emoji', x: 70, y: 12, char: '💤', size: 22, tilt: 0 },
        { kind: 'tag', x: 50, y: 60, text: 'i ate too much', style: 'soft' },
      ],
    },
  },
  {
    id: 'drama-queen',
    name: 'Drama Queen',
    category: 'funny',
    description: 'Sparkle tears, dramatic lashes, over-the-top energy.',
    preview: {
      base: 'linear-gradient(170deg, #f7d2cf 0%, #c98a8a 55%, #5a2a36 100%)',
      cast: 'radial-gradient(60% 40% at 50% 70%, rgba(80,140,220,0.25), transparent 70%)',
      ring: 'linear-gradient(135deg, #6aa8ff, #b9d4ff 50%, #2c5ea8)',
      badge: '💧',
    },
    overlay: {
      cssFilter: 'contrast(1.08) saturate(1.1)',
      light: 'none',
      vignette: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(20,10,30,0.4) 100%)',
      accents: [
        { kind: 'lashes', x: 35, y: 32 },
        { kind: 'lashes', x: 65, y: 32 },
        { kind: 'tear', x: 33, y: 42 },
        { kind: 'tear', x: 67, y: 42 },
        { kind: 'sparkle', x: 18, y: 18, size: 14 },
        { kind: 'sparkle', x: 82, y: 14, size: 18 },
        { kind: 'sparkle', x: 88, y: 44, size: 12 },
        { kind: 'sparkle', x: 12, y: 48, size: 16 },
        { kind: 'bubble', x: 50, y: 10, text: 'WHY ME?!', style: 'shout' },
        { kind: 'tag', x: 50, y: 58, text: 'i can\u2019t even', style: 'soft' },
      ],
    },
  },
  {
    id: 'uncle-bbq',
    name: 'Uncle at the BBQ',
    category: 'funny',
    description: 'Aviators, thick mustache, smoky grillmaster energy.',
    preview: {
      base: 'linear-gradient(170deg, #f1c9a7 0%, #b8835f 55%, #5a3220 100%)',
      cast: 'radial-gradient(80% 50% at 50% 80%, rgba(180,100,30,0.35), transparent 70%)',
      ring: 'linear-gradient(135deg, #5a3a1f, #b07a3a 50%, #2a1808)',
      badge: '🔥',
    },
    overlay: {
      cssFilter: 'contrast(1.06) saturate(1.05) brightness(1.0)',
      light: 'none',
      vignette: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(40,20,5,0.45) 100%)',
      accents: [
        { kind: 'aviators', x: 50, y: 32 },
        { kind: 'mustache', x: 50, y: 48 },
        { kind: 'smoke', x: 80, y: 56, size: 60 },
        { kind: 'smoke', x: 20, y: 60, size: 50 },
        { kind: 'emoji', x: 14, y: 18, char: '🌭', size: 28, tilt: -12 },
        { kind: 'emoji', x: 86, y: 18, char: '🍖', size: 28, tilt: 12 },
        { kind: 'tag', x: 50, y: 60, text: 'GRILLMASTER \u00b7 EST. \u201879', style: 'stamp' },
      ],
    },
  },
  {
    id: 'main-character',
    name: 'Main Character Meltdown',
    category: 'funny',
    description: 'Chaotic sparkles, panic icons, dramatic overthinking.',
    preview: {
      base: 'linear-gradient(170deg, #f5cdd6 0%, #b974a0 55%, #44143a 100%)',
      cast: 'radial-gradient(70% 50% at 30% 30%, rgba(255,180,210,0.35), transparent 65%), radial-gradient(80% 60% at 75% 75%, rgba(120,80,220,0.3), transparent 60%)',
      ring: 'linear-gradient(135deg, #ff5d8f, #ffd6e4 50%, #6a1f4a)',
      badge: '✨',
    },
    overlay: {
      cssFilter: 'contrast(1.1) saturate(1.2) brightness(1.02) hue-rotate(-5deg)',
      light: 'radial-gradient(70% 50% at 30% 28%, rgba(255,200,220,0.18), transparent 70%)',
      vignette: 'radial-gradient(110% 80% at 50% 50%, transparent 50%, rgba(30,5,30,0.5) 100%)',
      accents: [
        { kind: 'sparkle', x: 14, y: 18, size: 18 },
        { kind: 'sparkle', x: 86, y: 14, size: 22 },
        { kind: 'sparkle', x: 92, y: 46, size: 14 },
        { kind: 'sparkle', x: 8, y: 52, size: 16 },
        { kind: 'sparkle', x: 62, y: 10, size: 12 },
        { kind: 'emoji', x: 88, y: 32, char: '\u2049\ufe0f', size: 24, tilt: 14 },
        { kind: 'emoji', x: 12, y: 36, char: '\ud83d\udca5', size: 24, tilt: -10 },
        { kind: 'messyHair', x: 50, y: 8 },
        { kind: 'bubble', x: 50, y: 18, text: 'currently overthinking', style: 'thought' },
        { kind: 'tag', x: 50, y: 60, text: 'MAIN CHARACTER \u00b7 MELTDOWN', style: 'chaos' },
      ],
    },
  },
  {
    id: 'alien-rizz',
    name: 'Alien Rizz',
    category: 'funny',
    description: 'Green glow, big eyes, antennas — rizz from another planet.',
    preview: {
      base: 'linear-gradient(170deg, #c8efb8 0%, #6fbf6a 55%, #143820 100%)',
      cast: 'radial-gradient(80% 60% at 50% 40%, rgba(120,255,140,0.4), transparent 60%)',
      ring: 'linear-gradient(135deg, #2dd66a, #b6ffc4 50%, #084a1c)',
      badge: '👽',
    },
    overlay: {
      cssFilter: 'contrast(1.05) saturate(1.4) brightness(1.0) hue-rotate(60deg)',
      light: 'radial-gradient(80% 60% at 50% 45%, rgba(120,255,140,0.22), transparent 65%)',
      vignette: 'radial-gradient(110% 90% at 50% 50%, transparent 50%, rgba(0,30,10,0.55) 100%)',
      accents: [
        { kind: 'antenna', x: 38, y: 6 },
        { kind: 'antenna', x: 62, y: 6, mirror: true },
        { kind: 'bigEye', x: 35, y: 32 },
        { kind: 'bigEye', x: 65, y: 32 },
        { kind: 'sparkle', x: 14, y: 50, size: 14, color: '#a8ffb8' },
        { kind: 'sparkle', x: 86, y: 52, size: 16, color: '#a8ffb8' },
        { kind: 'tag', x: 50, y: 60, text: 'rizz from another planet', style: 'alien' },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Accent renderer — each accent kind maps to an absolutely-positioned node.
// Coordinates are percentages of the viewfinder box.
// ─────────────────────────────────────────────────────────────────────────
function Accent({ a, scale = 1 }) {
  const pos = { position: 'absolute', left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -50%)' };
  switch (a.kind) {
    case 'gloss':
      return <div style={{ ...pos, width: `${a.w * scale}%`, height: `${a.h * scale}%`, background: a.color, borderRadius: 9999, filter: `blur(${a.blur}px)` }} />;
    case 'shimmer':
      return <div style={{ ...pos, width: a.size * scale, height: a.size * scale, background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />;
    case 'flare':
      return <div style={{ ...pos, width: a.size * scale, height: a.size * scale, background: a.color, borderRadius: '50%', filter: 'blur(14px)' }} />;
    case 'dew':
      return (
        <div style={{ ...pos, width: a.size * scale, height: a.size * scale, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15) 60%, rgba(255,255,255,0) 75%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
      );
    case 'liner':
      return <div style={{ ...pos, width: `${a.w * scale}%`, height: a.h * scale, background: 'rgba(20,8,15,0.85)', borderRadius: 2 }} />;
    case 'halo':
      return (
        <div style={{ ...pos, width: a.size * scale * 3, height: a.size * scale * 1.6, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.65), rgba(255,255,255,0) 65%)', filter: 'blur(8px)' }} />
      );
    case 'blush':
      return <div style={{ ...pos, width: a.size * scale, height: a.size * scale * 0.7, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,150,170,0.45), rgba(255,150,170,0) 70%)', filter: 'blur(4px)' }} />;
    case 'tinyFace':
      return (
        <div style={{ ...pos, width: `${a.size * scale}%`, aspectRatio: '1/1.15', borderRadius: '46% 46% 50% 50%',
          background: 'radial-gradient(circle at 50% 35%, #f3d4b8, #8b5a3a 90%)',
          boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.35), 0 4px 18px rgba(0,0,0,0.4)' }}>
          <div style={{ position: 'absolute', left: '30%', top: '40%', width: 6, height: 6, background: '#1a0a05', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', right: '30%', top: '40%', width: 6, height: 6, background: '#1a0a05', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '50%', top: '62%', transform: 'translateX(-50%)', width: 14, height: 2, background: '#3a1810', borderRadius: 2 }} />
        </div>
      );
    case 'puffyCheek':
      return <div style={{ ...pos, width: `${a.size * scale}%`, aspectRatio: '1/1', borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, rgba(255,170,140,0.85), rgba(220,110,90,0.5) 65%, rgba(180,70,50,0) 80%)',
        filter: 'blur(2px)' }} />;
    case 'sleepyEye':
      return (
        <div style={{ ...pos, width: 26, height: 8 }}>
          <div style={{ position: 'absolute', inset: 0, borderTop: '2px solid #1a0a05', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        </div>
      );
    case 'lashes':
      return (
        <div style={{ ...pos, width: 36, height: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 2, height: 8 + (i === 2 || i === 3 ? 4 : 0), background: '#0a0407', transform: `rotate(${(i - 2.5) * 12}deg)`, transformOrigin: 'bottom', borderRadius: 2 }} />
          ))}
        </div>
      );
    case 'tear':
      return (
        <div style={{ ...pos, width: 16, height: 26 }}>
          <div style={{ width: 16, height: 22, background: 'linear-gradient(180deg, rgba(140,200,255,0.95), rgba(80,140,220,0.95))',
            borderRadius: '50% 50% 50% 50% / 30% 30% 80% 80%',
            boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.6), 0 2px 6px rgba(40,80,150,0.5)' }} />
        </div>
      );
    case 'sparkle': {
      const c = a.color || '#fff8c2';
      return (
        <div style={{ ...pos, width: a.size * scale, height: a.size * scale }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: c, transform: 'translateX(-50%)', borderRadius: 2, boxShadow: `0 0 8px ${c}` }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: c, transform: 'translateY(-50%)', borderRadius: 2, boxShadow: `0 0 8px ${c}` }} />
          <div style={{ position: 'absolute', inset: '35%', background: c, borderRadius: '50%', boxShadow: `0 0 6px ${c}` }} />
        </div>
      );
    }
    case 'bubble': {
      const styles = {
        shout: { bg: 'linear-gradient(180deg,#fff,#ffe9ec)', color: '#c4243f', border: '3px solid #c4243f', font: '900 14px/1 system-ui', letter: '0.04em' },
        thought: { bg: 'rgba(255,255,255,0.95)', color: '#3a1640', border: '2px solid rgba(80,40,100,0.4)', font: '700 12px/1.1 system-ui', letter: '0.02em' },
      };
      const s = styles[a.style] || styles.shout;
      return (
        <div style={{ ...pos, padding: '8px 14px', background: s.bg, color: s.color, border: s.border,
          borderRadius: 18, font: s.font, letterSpacing: s.letter, whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)', textTransform: a.style === 'shout' ? 'uppercase' : 'none' }}>
          {a.text}
        </div>
      );
    }
    case 'tag': {
      const styles = {
        corp: { bg: '#0a0a0a', color: '#d4af6a', border: '1px solid #d4af6a', font: '700 11px/1 \"SF Mono\", ui-monospace, monospace', letter: '0.18em', pad: '10px 16px', radius: 4 },
        soft: { bg: 'rgba(255,255,255,0.92)', color: '#5a3a2a', border: 'none', font: '600 13px/1 system-ui', letter: '0', pad: '10px 18px', radius: 999 },
        stamp: { bg: '#3a1f0a', color: '#f7d18a', border: '2px dashed #f7d18a', font: '800 11px/1 \"SF Mono\", ui-monospace, monospace', letter: '0.16em', pad: '8px 14px', radius: 4 },
        chaos: { bg: 'linear-gradient(90deg,#ff3d7f,#ffb43d,#ff3d7f)', color: '#fff', border: 'none', font: '900 11px/1 system-ui', letter: '0.14em', pad: '9px 16px', radius: 4 },
        alien: { bg: '#0a2a14', color: '#7aff9c', border: '1px solid #2dd66a', font: '700 12px/1 \"SF Mono\", ui-monospace, monospace', letter: '0.08em', pad: '9px 16px', radius: 999 },
      };
      const s = styles[a.style] || styles.soft;
      return (
        <div style={{ ...pos, background: s.bg, color: s.color, border: s.border, padding: s.pad,
          borderRadius: s.radius, font: s.font, letterSpacing: s.letter, whiteSpace: 'nowrap',
          textTransform: a.style === 'corp' || a.style === 'stamp' || a.style === 'chaos' ? 'uppercase' : 'none',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35)' }}>
          {a.text}
        </div>
      );
    }
    case 'emoji':
      return <div style={{ ...pos, fontSize: a.size * scale, transform: `translate(-50%,-50%) rotate(${a.tilt || 0}deg)`, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}>{a.char}</div>;
    case 'smoke':
      return <div style={{ ...pos, width: a.size * scale, height: a.size * scale, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,220,220,0.55), rgba(220,220,220,0) 70%)', filter: 'blur(8px)' }} />;
    case 'aviators':
      return (
        <div style={{ ...pos, width: '70%', height: 38, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: '42%', height: '100%', background: 'linear-gradient(160deg,#1a1a1a 0%, #3a3a3a 50%, #0a0a0a 100%)',
            borderRadius: '40% 40% 60% 50% / 60% 60% 80% 80%', border: '2px solid #c9a13a',
            boxShadow: 'inset 0 4px 10px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.5)' }} />
          <div style={{ width: 12, height: 3, background: '#c9a13a' }} />
          <div style={{ width: '42%', height: '100%', background: 'linear-gradient(160deg,#1a1a1a 0%, #3a3a3a 50%, #0a0a0a 100%)',
            borderRadius: '40% 40% 50% 60% / 60% 60% 80% 80%', border: '2px solid #c9a13a',
            boxShadow: 'inset 0 4px 10px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.5)' }} />
        </div>
      );
    case 'mustache':
      return (
        <div style={{ ...pos, width: '46%', height: 22, display: 'flex' }}>
          <div style={{ flex: 1, background: '#1a0a05', borderRadius: '0 0 60% 30% / 0 0 100% 60%', transform: 'rotate(-3deg)',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.5)' }} />
          <div style={{ flex: 1, background: '#1a0a05', borderRadius: '0 0 30% 60% / 0 0 60% 100%', transform: 'rotate(3deg)',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.5)' }} />
        </div>
      );
    case 'antenna':
      return (
        <div style={{ ...pos, width: 8, height: 60, transform: `translate(-50%,-50%) rotate(${a.mirror ? 18 : -18}deg)` }}>
          <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 3, height: '80%', background: '#1d6a30', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 16, height: 16, background: 'radial-gradient(circle at 35% 30%, #b6ffc4, #2dd66a 70%)',
            borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 14px #2dd66a' }} />
        </div>
      );
    case 'bigEye':
      return (
        <div style={{ ...pos, width: 36, height: 44, background: 'radial-gradient(ellipse at 50% 40%, #fff, #0a0a0a 80%)', borderRadius: '50%',
          border: '2px solid #1d6a30', boxShadow: '0 0 10px rgba(120,255,140,0.55), inset 0 -4px 8px rgba(0,0,0,0.45)' }}>
          <div style={{ position: 'absolute', left: '40%', top: '20%', width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
        </div>
      );
    case 'messyHair':
      return (
        <div style={{ ...pos, width: '70%', height: 40, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
          {[12, 26, 18, 32, 14, 22, 10].map((h, i) => (
            <div key={i} style={{ width: 5, height: h, background: '#2a1018', borderRadius: '60% 60% 20% 20%', transform: `rotate(${(i - 3) * 8}deg)` }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

window.FILTERS = FILTERS;
window.Accent = Accent;
