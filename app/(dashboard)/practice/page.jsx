'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const BPM_PRESETS = [
  { bpm: 40, name: 'Grave' },
  { bpm: 55, name: 'Largo' },
  { bpm: 66, name: 'Larghetto' },
  { bpm: 72, name: 'Adagio' },
  { bpm: 84, name: 'Andante' },
  { bpm: 100, name: 'Moderato' },
  { bpm: 116, name: 'Allegretto' },
  { bpm: 132, name: 'Allegro' },
  { bpm: 160, name: 'Vivace' },
  { bpm: 184, name: 'Presto' },
  { bpm: 208, name: 'Prestissimo' },
];

const DENOMINATORS = [1, 2, 4, 8, 16, 32];
const DENOMINATOR_FIGURES = { 1: '𝅝', 2: '𝅗𝅥', 4: '♩', 8: '♪', 16: '𝅘𝅥𝅯', 32: '𝅘𝅥𝅰' };
const DENOMINATOR_NAMES = { 1: 'Redonda', 2: 'Blanca', 4: 'Negra', 8: 'Corchea', 16: 'Semicorchea', 32: 'Fusa' };

const SUBDIVISIONS = [
  { id: 'quarter', label: '♩', name: 'Negra', pattern: [1], sizes: [12] },
  { id: 'eighth', label: '♪♪', name: 'Corcheas', pattern: [1, 0.6], sizes: [12, 8] },
  { id: 'triplet', label: '♪♪♪', name: 'Tresillos', pattern: [1, 0.6, 0.6], sizes: [12, 8, 8] },
  { id: 'sixteenth', label: '♬♬', name: 'Semicorcheas', pattern: [1, 0.5, 0.5, 0.5], sizes: [12, 7, 7, 7] },
  { id: 'quintuplet', label: '5', name: 'Quintillo', pattern: [1, 0.5, 0.5, 0.5, 0.5], sizes: [12, 7, 7, 7, 7] },
  { id: 'sextuplet', label: '6', name: 'Sextillo', pattern: [1, 0.5, 0.5, 0.5, 0.5, 0.5], sizes: [12, 7, 7, 7, 7, 7] },
  { id: 'septuplet', label: '7', name: 'Septillo', pattern: [1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], sizes: [12, 7, 7, 7, 7, 7, 7] },
  { id: 'galopa', label: '♩♪', name: 'Galopa', pattern: [1, 0.5], sizes: [14, 8], timing: [0.67, 0.33] },
  { id: 'contra_galopa', label: '♪♩', name: 'Contra galopa', pattern: [1, 0.5], sizes: [8, 14], timing: [0.33, 0.67] },
  { id: 'saltillo', label: '♪.♬', name: 'Saltillo', pattern: [1, 0.4], sizes: [14, 7], timing: [0.75, 0.25] },
  { id: 'contra_saltillo', label: '♬♪.', name: 'Contra saltillo', pattern: [0.4, 1], sizes: [7, 14], timing: [0.25, 0.75] },
  { id: 'swing', label: '↝', name: 'Swing', pattern: [1, 0.4, 0.6], sizes: [12, 7, 9], timing: [0.5, 0.17, 0.33] },
];

const ACCENT_OPTIONS = [
  { value: 'strong', label: 'Fuerte', gain: 1.0 },
  { value: 'medium', label: 'Medio', gain: 0.5 },
  { value: 'weak', label: 'Débil', gain: 0.2 },
];

function getSubdivisionCount(sub) {
  return sub.pattern.length;
}

function getSubdivisionTiming(sub) {
  if (sub.timing) return sub.timing;
  const count = sub.pattern.length;
  return sub.pattern.map(() => 1 / count);
}

function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [numerator, setNumerator] = useState(4);
  const [denominator, setDenominator] = useState(4);
  const [subdivision, setSubdivision] = useState(SUBDIVISIONS[0]);
  const [accentStrong, setAccentStrong] = useState('strong');
  const [accentWeak, setAccentWeak] = useState('medium');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentSub, setCurrentSub] = useState(0);

  const audioCtx = useRef(null);
  const nextNoteTime = useRef(0);
  const schedulerRef = useRef(null);
  const beatRef = useRef(0);
  const subRef = useRef(0);
  const tapTimes = useRef([]);

  const bpmRef = useRef(bpm);
  const numeratorRef = useRef(numerator);
  const subdivisionRef = useRef(subdivision);
  const accentStrongRef = useRef(accentStrong);
  const accentWeakRef = useRef(accentWeak);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { numeratorRef.current = numerator; }, [numerator]);
  useEffect(() => { subdivisionRef.current = subdivision; }, [subdivision]);
  useEffect(() => { accentStrongRef.current = accentStrong; }, [accentStrong]);
  useEffect(() => { accentWeakRef.current = accentWeak; }, [accentWeak]);

  function getAudioCtx() {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx.current;
  }

  function scheduleClick(time, gain) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.frequency.value = gain >= 0.9 ? 1400 : gain >= 0.4 ? 1000 : 700;
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  const scheduler = useCallback(() => {
    const ctx = getAudioCtx();
    const bpmNow = bpmRef.current;
    const numNow = numeratorRef.current;
    const subNow = subdivisionRef.current;
    const strongNow = accentStrongRef.current;
    const weakNow = accentWeakRef.current;
    const timing = getSubdivisionTiming(subNow);
    const secondsPerBeat = 60 / bpmNow;

    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current;
      const sub = subRef.current;
      const strongGain = ACCENT_OPTIONS.find(a => a.value === strongNow)?.gain || 1;
      const weakGain = ACCENT_OPTIONS.find(a => a.value === weakNow)?.gain || 0.5;

      let gain;
      if (beat === 0 && sub === 0) gain = strongGain;
      else if (sub === 0) gain = weakGain;
      else gain = 0.15;

      scheduleClick(nextNoteTime.current, gain);

      const b = beat;
      const s = sub;
      const t = nextNoteTime.current;
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => { setCurrentBeat(b); setCurrentSub(s); }, delay);

      nextNoteTime.current += secondsPerBeat * timing[sub];
      subRef.current = (sub + 1) % timing.length;
      if (subRef.current === 0) beatRef.current = (beat + 1) % numNow;
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      beatRef.current = 0;
      subRef.current = 0;
      nextNoteTime.current = ctx.currentTime + 0.05;
      scheduler();
    } else {
      clearTimeout(schedulerRef.current);
      setCurrentBeat(-1);
      setCurrentSub(0);
    }
    return () => clearTimeout(schedulerRef.current);
  }, [isPlaying, scheduler]);

  function handleTap() {
    const now = performance.now();
    tapTimes.current.push(now);
    if (tapTimes.current.length > 8) tapTimes.current.shift();
    if (tapTimes.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.current.length; i++)
        intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avg);
      if (newBpm >= 20 && newBpm <= 300) setBpm(newBpm);
    }
  }

  const currentPreset = BPM_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.bpm - bpm) < Math.abs(prev.bpm - bpm) ? curr : prev
  );

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">

      {/* BPM Display */}
      <div className="text-center">
        <div className="text-7xl font-bold text-white font-display leading-none">{bpm}</div>
        <div className="text-lg mt-1 font-medium" style={{ color: '#7c6af7' }}>{currentPreset.name}</div>
        <div className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>BPM</div>
      </div>

      {/* BPM Slider */}
      <div className="w-full flex flex-col gap-3">
        <input type="range" min="20" max="300" value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          className="w-full" style={{ accentColor: '#7c6af7' }} />
        <div className="flex justify-between text-xs" style={{ color: '#5a5a70' }}>
          <span>20 Grave</span><span>Prestissimo 208</span>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-1.5">
          {BPM_PRESETS.map(p => (
            <button key={p.bpm} onClick={() => setBpm(p.bpm)}
              className="flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all"
              style={{
                background: Math.abs(bpm - p.bpm) < 8 ? '#7c6af720' : '#22222e',
                border: `1px solid ${Math.abs(bpm - p.bpm) < 8 ? '#7c6af7' : '#333344'}`,
              }}>
              <span className="text-xs font-bold" style={{ color: Math.abs(bpm - p.bpm) < 8 ? '#7c6af7' : '#e8e8f0' }}>{p.bpm}</span>
              <span className="text-xs" style={{ color: '#5a5a70' }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compás */}
      <div className="w-full grid grid-cols-2 gap-4">
        {/* Numerador */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-center" style={{ color: '#9090a8' }}>Numerador</label>
          <div className="flex items-center gap-2 justify-center">
            <button onClick={() => setNumerator(p => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-xl text-lg font-bold transition-all"
              style={{ background: '#22222e', color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
              onMouseLeave={e => e.currentTarget.style.background = '#22222e'}>−</button>
            <span className="text-3xl font-bold text-white w-10 text-center">{numerator}</span>
            <button onClick={() => setNumerator(p => Math.min(16, p + 1))}
              className="w-9 h-9 rounded-xl text-lg font-bold transition-all"
              style={{ background: '#22222e', color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
              onMouseLeave={e => e.currentTarget.style.background = '#22222e'}>+</button>
          </div>
        </div>

        {/* Denominador */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-center" style={{ color: '#9090a8' }}>Denominador</label>
          <div className="flex items-center gap-2 justify-center">
            <button onClick={() => {
              const idx = DENOMINATORS.indexOf(denominator);
              if (idx > 0) setDenominator(DENOMINATORS[idx - 1]);
            }}
              className="w-9 h-9 rounded-xl text-lg font-bold transition-all"
              style={{ background: '#22222e', color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
              onMouseLeave={e => e.currentTarget.style.background = '#22222e'}>−</button>
            <div className="flex flex-col items-center w-12">
              <span className="text-2xl" style={{ color: '#7c6af7' }}>{DENOMINATOR_FIGURES[denominator]}</span>
              <span className="text-xs font-bold text-white">{denominator}</span>
              <span className="text-xs" style={{ color: '#5a5a70', fontSize: '10px' }}>{DENOMINATOR_NAMES[denominator]}</span>
            </div>
            <button onClick={() => {
              const idx = DENOMINATORS.indexOf(denominator);
              if (idx < DENOMINATORS.length - 1) setDenominator(DENOMINATORS[idx + 1]);
            }}
              className="w-9 h-9 rounded-xl text-lg font-bold transition-all"
              style={{ background: '#22222e', color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
              onMouseLeave={e => e.currentTarget.style.background = '#22222e'}>+</button>
          </div>
        </div>
      </div>

      {/* Subdivisiones */}
      <div className="w-full flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Subdivisión</label>
        <div className="grid grid-cols-4 gap-1.5">
          {SUBDIVISIONS.map(s => (
            <button key={s.id} onClick={() => setSubdivision(s)}
              className="flex flex-col items-center py-2 px-1 rounded-xl transition-all"
              style={{
                background: subdivision.id === s.id ? '#7c6af720' : '#22222e',
                border: `1px solid ${subdivision.id === s.id ? '#7c6af7' : '#333344'}`,
              }}>
              <span className="text-base" style={{ color: subdivision.id === s.id ? '#7c6af7' : '#e8e8f0' }}>{s.label}</span>
              <span className="text-xs mt-0.5" style={{ color: '#5a5a70', fontSize: '10px' }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Acentos */}
      <div className="w-full grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tiempo 1</label>
          <div className="flex gap-1">
            {ACCENT_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setAccentStrong(a.value)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: accentStrong === a.value ? '#7c6af720' : '#22222e',
                  color: accentStrong === a.value ? '#7c6af7' : '#9090a8',
                  border: `1px solid ${accentStrong === a.value ? '#7c6af7' : '#333344'}`,
                }}>{a.label}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Otros tiempos</label>
          <div className="flex gap-1">
            {ACCENT_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setAccentWeak(a.value)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: accentWeak === a.value ? '#7c6af720' : '#22222e',
                  color: accentWeak === a.value ? '#7c6af7' : '#9090a8',
                  border: `1px solid ${accentWeak === a.value ? '#7c6af7' : '#333344'}`,
                }}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Pulso visual — PULSO arriba, SUBDIVISIONES abajo, alineados */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex gap-2 justify-center">
          {Array.from({ length: numerator }).map((_, beatIdx) => {
            const isActive = isPlaying && currentBeat === beatIdx;
            const subCount = subdivision.pattern.length;
            const totalWidth = subCount * 14 + (subCount - 1) * 4;
            return (
              <div key={beatIdx} className="flex flex-col items-start gap-1.5">
                {/* Pulso arriba — alineado con el primer punto de la subdivisión */}
                <div style={{ width: totalWidth, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <div className="rounded-full transition-all duration-75"
                    style={{
                      width: isActive ? 16 : 14,
                      height: isActive ? 16 : 14,
                      background: isActive
                        ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7')
                        : '#2a2a38',
                      boxShadow: isActive ? `0 0 8px ${beatIdx === 0 ? '#f7a23c' : '#7c6af7'}` : 'none',
                    }} />
                </div>
                {/* Subdivisiones abajo */}
                <div className="flex gap-1 items-center">
                  {subdivision.pattern.map((size, subIdx) => {
                    const isSubActive = isPlaying && currentBeat === beatIdx && currentSub === subIdx;
                    const dotSize = subIdx === 0 ? 14 : Math.round(14 * size);
                    return (
                      <div key={subIdx} className="rounded-full transition-all duration-75"
                        style={{
                          width: dotSize,
                          height: dotSize,
                          background: isSubActive
                            ? (subIdx === 0 ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7') : '#a08af7')
                            : '#2a2a38',
                        }} />
                    );
                  })}
                </div>
                {/* Número de tiempo */}
                <div className="text-xs text-center" style={{ color: '#3a3a50', width: totalWidth }}>{beatIdx + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-4 w-full">
        <button onClick={() => setIsPlaying(p => !p)}
          className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all"
          style={{
            background: isPlaying ? '#f75c6a20' : '#7c6af7',
            color: isPlaying ? '#f75c6a' : 'white',
            border: isPlaying ? '2px solid #f75c6a40' : 'none',
          }}>
          {isPlaying ? '⏹ Detener' : '▶ Iniciar'}
        </button>
        <button onClick={handleTap}
          className="px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
          style={{ background: '#22222e', color: '#9090a8', border: '1px solid #333344' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2a2a38'}
          onMouseLeave={e => e.currentTarget.style.background = '#22222e'}>
          TAP
        </button>
      </div>
    </div>
  );
}

// ─── PÁGINA PRÁCTICA LIBRE ───────────────────────────────────────────────────
const TOOLS = [
  { id: 'metronome', label: '🎵 Metrónomo' },
];

export default function PracticePage() {
  const [activeTool, setActiveTool] = useState('metronome');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Práctica libre</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Herramientas de práctica musical</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTool === tool.id ? '#7c6af720' : '#22222e',
              color: activeTool === tool.id ? '#7c6af7' : '#9090a8',
              border: `1px solid ${activeTool === tool.id ? '#7c6af7' : '#333344'}`,
            }}>
            {tool.label}
          </button>
        ))}
      </div>

      <div className="p-6 rounded-2xl" style={{ background: '#16161d', border: '1px solid #2a2a38' }}>
        {activeTool === 'metronome' && <Metronome />}
      </div>
    </div>
  );
}
