'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── METRÓNOMO ────────────────────────────────────────────────────────────────
const BPM_PRESETS = [
  { bpm: 40, name: 'Grave' }, { bpm: 55, name: 'Largo' },
  { bpm: 66, name: 'Larghetto' }, { bpm: 72, name: 'Adagio' },
  { bpm: 84, name: 'Andante' }, { bpm: 100, name: 'Moderato' },
  { bpm: 116, name: 'Allegretto' }, { bpm: 132, name: 'Allegro' },
  { bpm: 160, name: 'Vivace' }, { bpm: 184, name: 'Presto' },
  { bpm: 208, name: 'Prestissimo' },
];
const DENOMINATORS = [1, 2, 4, 8, 16, 32];
const DENOMINATOR_FIGURES = { 1: '𝅝', 2: '𝅗𝅥', 4: '♩', 8: '♪', 16: '𝅘𝅥𝅯', 32: '𝅘𝅥𝅰' };
const DENOMINATOR_NAMES = { 1: 'Redonda', 2: 'Blanca', 4: 'Negra', 8: 'Corchea', 16: 'Semicorchea', 32: 'Fusa' };
const MET_SUBDIVISIONS = [
  { id: 'quarter', label: '♩', name: 'Negra', pattern: [1], timing: [1] },
  { id: 'eighth', label: '♪♪', name: 'Corcheas', pattern: [1, 0.6], timing: [0.5, 0.5] },
  { id: 'triplet', label: '♪♪♪', name: 'Tresillos', pattern: [1, 0.6, 0.6], timing: [1/3, 1/3, 1/3] },
  { id: 'sixteenth', label: '♬♬', name: 'Semicorcheas', pattern: [1, 0.5, 0.5, 0.5], timing: [0.25, 0.25, 0.25, 0.25] },
];
const ACCENT_OPTIONS = [
  { value: 'strong', label: 'Fuerte', gain: 1.0 },
  { value: 'medium', label: 'Medio', gain: 0.5 },
  { value: 'weak', label: 'Débil', gain: 0.2 },
];
function getClosestPreset(bpm) {
  return BPM_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.bpm - bpm) < Math.abs(prev.bpm - bpm) ? curr : prev);
}

function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [numerator, setNumerator] = useState(4);
  const [denominator, setDenominator] = useState(4);
  const [subdivision, setSubdivision] = useState(MET_SUBDIVISIONS[0]);
  const [accentStrong, setAccentStrong] = useState('strong');
  const [accentWeak, setAccentWeak] = useState('medium');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentSub, setCurrentSub] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const audioCtx = useRef(null);
  const nextNoteTime = useRef(0);
  const schedulerRef = useRef(null);
  const beatRef = useRef(0);
  const subRef = useRef(0);
  const tapTimes = useRef([]);
  const settingsRef = useRef(null);
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
  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    }
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);
  function getAudioCtx() {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx.current;
  }
  function scheduleClick(time, gain) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = gain >= 0.9 ? 1400 : gain >= 0.4 ? 1000 : 700;
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.start(time); osc.stop(time + 0.04);
  }
  const scheduler = useCallback(() => {
    const ctx = getAudioCtx();
    const sub = subdivisionRef.current;
    const spb = 60 / bpmRef.current;
    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current, si = subRef.current;
      const sg = ACCENT_OPTIONS.find(a => a.value === accentStrongRef.current)?.gain || 1;
      const wg = ACCENT_OPTIONS.find(a => a.value === accentWeakRef.current)?.gain || 0.5;
      let gain = beat === 0 && si === 0 ? sg : si === 0 ? wg : 0.15;
      scheduleClick(nextNoteTime.current, gain);
      const b = beat, s = si, t = nextNoteTime.current;
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => { setCurrentBeat(b); setCurrentSub(s); }, delay);
      nextNoteTime.current += spb * sub.timing[si];
      subRef.current = (si + 1) % sub.timing.length;
      if (subRef.current === 0) beatRef.current = (beat + 1) % numeratorRef.current;
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, []);
  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      beatRef.current = 0; subRef.current = 0;
      nextNoteTime.current = ctx.currentTime + 0.05;
      scheduler();
    } else { clearTimeout(schedulerRef.current); setCurrentBeat(-1); setCurrentSub(0); }
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
      const nb = Math.round(60000 / avg);
      if (nb >= 20 && nb <= 300) setBpm(nb);
    }
  }
  const closestPreset = getClosestPreset(bpm);
  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">
      <div className="w-full flex items-start justify-between">
        <div className="flex-1" />
        <div className="text-center">
          <div className="text-7xl font-bold text-white font-display leading-none">{bpm}</div>
          <div className="text-lg mt-1 font-medium" style={{ color: '#7c6af7' }}>{closestPreset.name}</div>
          <div className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>BPM</div>
        </div>
        <div className="flex-1 flex justify-end" ref={settingsRef}>
          <div className="relative">
            <button onClick={() => setShowSettings(p => !p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-lg"
              style={{ background: showSettings ? '#7c6af720' : '#22222e', border: `1px solid ${showSettings ? '#7c6af7' : '#333344'}`, color: showSettings ? '#7c6af7' : '#9090a8' }}>
              ⚙️
            </button>
            {showSettings && (
              <div className="absolute right-0 top-11 z-50 rounded-2xl p-4 flex flex-col gap-4"
                style={{ background: '#1c1c26', border: '1px solid #2a2a38', width: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <p className="text-sm font-semibold text-white">Configuración</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Subdivisión</label>
                  <div className="flex gap-1.5">
                    {MET_SUBDIVISIONS.map(s => (
                      <button key={s.id} onClick={() => setSubdivision(s)}
                        className="flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all"
                        style={{ background: subdivision.id === s.id ? '#7c6af720' : '#0f0f13', border: `1px solid ${subdivision.id === s.id ? '#7c6af7' : '#333344'}` }}>
                        <span className="text-sm" style={{ color: subdivision.id === s.id ? '#7c6af7' : '#e8e8f0' }}>{s.label}</span>
                        <span style={{ color: '#5a5a70', fontSize: '9px' }}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Volumen — Tiempo 1</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentStrong(a.value)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: accentStrong === a.value ? '#7c6af720' : '#0f0f13', color: accentStrong === a.value ? '#7c6af7' : '#9090a8', border: `1px solid ${accentStrong === a.value ? '#7c6af7' : '#333344'}` }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Volumen — Otros tiempos</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentWeak(a.value)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: accentWeak === a.value ? '#7c6af720' : '#0f0f13', color: accentWeak === a.value ? '#7c6af7' : '#9090a8', border: `1px solid ${accentWeak === a.value ? '#7c6af7' : '#333344'}` }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Numerador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => setNumerator(p => Math.max(1, p - 1))} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background: '#0f0f13', color: '#9090a8' }}>−</button>
                      <span className="text-lg font-bold text-white w-6 text-center">{numerator}</span>
                      <button onClick={() => setNumerator(p => Math.min(16, p + 1))} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background: '#0f0f13', color: '#9090a8' }}>+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Denominador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => { const idx = DENOMINATORS.indexOf(denominator); if (idx > 0) setDenominator(DENOMINATORS[idx - 1]); }} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background: '#0f0f13', color: '#9090a8' }}>−</button>
                      <div className="flex flex-col items-center w-10">
                        <span className="text-base" style={{ color: '#7c6af7' }}>{DENOMINATOR_FIGURES[denominator]}</span>
                        <span className="text-xs font-bold text-white">{denominator}</span>
                      </div>
                      <button onClick={() => { const idx = DENOMINATORS.indexOf(denominator); if (idx < DENOMINATORS.length - 1) setDenominator(DENOMINATORS[idx + 1]); }} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background: '#0f0f13', color: '#9090a8' }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-1">
        <input type="range" min="20" max="300" value={bpm} onChange={e => setBpm(Number(e.target.value))} className="w-full" style={{ accentColor: '#7c6af7' }} />
        <div className="flex justify-between text-xs" style={{ color: '#5a5a70' }}><span>20 — Grave</span><span>Prestissimo — 208</span></div>
      </div>
      <div className="w-full flex gap-3 justify-center flex-wrap mt-2">
        {Array.from({ length: numerator }).map((_, beatIdx) => {
          const isActiveBeat = isPlaying && currentBeat === beatIdx;
          const dotSize = 14, subDotSize = 8;
          const subCount = subdivision.pattern.length;
          const totalWidth = dotSize + (subCount - 1) * (subDotSize + 5);
          return (
            <div key={beatIdx} className="flex flex-col items-start gap-2">
              <div style={{ width: totalWidth, display: 'flex', justifyContent: 'flex-start' }}>
                <div className="rounded-full transition-all duration-75" style={{ width: dotSize, height: dotSize, background: isActiveBeat ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7') : '#2a2a38', boxShadow: isActiveBeat ? `0 0 10px ${beatIdx === 0 ? '#f7a23c80' : '#7c6af780'}` : 'none' }} />
              </div>
              <div className="flex items-center gap-1">
                {subdivision.pattern.map((_, subIdx) => {
                  const isActiveSub = isPlaying && currentBeat === beatIdx && currentSub === subIdx;
                  const size = subIdx === 0 ? dotSize : subDotSize;
                  return <div key={subIdx} className="rounded-full transition-all duration-75" style={{ width: size, height: size, background: isActiveSub ? (subIdx === 0 ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7') : '#a08af7') : '#2a2a38' }} />;
                })}
              </div>
              <div className="text-xs text-center" style={{ color: '#3a3a50', width: totalWidth }}>{beatIdx + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 w-full mt-2">
        <button onClick={() => setIsPlaying(p => !p)} className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all"
          style={{ background: isPlaying ? '#f75c6a20' : '#7c6af7', color: isPlaying ? '#f75c6a' : 'white', border: isPlaying ? '2px solid #f75c6a40' : 'none' }}>
          {isPlaying ? '⏹ Detener' : '▶ Iniciar'}
        </button>
        <button onClick={handleTap} className="px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
          style={{ background: '#22222e', color: '#9090a8', border: '1px solid #333344' }}>
          TAP
        </button>
      </div>
    </div>
  );
}

// ─── PRÁCTICA RÍTMICA ─────────────────────────────────────────────────────────

const INSTRUMENT_TYPES = [
  { id: 'linear', name: 'Ritmo lineal', rows: [{ id: 'line', name: 'Ritmo', color: '#7c6af7', freq: 600, type: 'sine' }] },
  { id: 'body_basic', name: 'Corporal básica', rows: [
    { id: 'clap', name: 'Palmada', color: '#f7a23c', freq: 1000, type: 'sine' },
    { id: 'stomp', name: 'Patada', color: '#f75c6a', freq: 80, type: 'sine' },
  ]},
  { id: 'body_ext', name: 'Corporal extendida', rows: [
    { id: 'right_hand', name: 'Mano D', color: '#f7a23c', freq: 1100, type: 'sine' },
    { id: 'left_hand', name: 'Mano I', color: '#fbbf24', freq: 900, type: 'sine' },
    { id: 'right_foot', name: 'Pie D', color: '#f75c6a', freq: 90, type: 'sine' },
    { id: 'left_foot', name: 'Pie I', color: '#f7603c', freq: 70, type: 'sine' },
  ]},
  { id: 'drums_basic', name: 'Batería básica', rows: [
    { id: 'kick', name: 'Bombo', color: '#f75c6a', freq: 60, type: 'sine' },
    { id: 'snare', name: 'Caja', color: '#7c6af7', freq: 200, type: 'triangle' },
    { id: 'hihat', name: 'Hi-hat', color: '#4ade80', freq: 8000, type: 'sawtooth' },
  ]},
  { id: 'drums_adv', name: 'Batería avanzada', rows: [
    { id: 'kick', name: 'Bombo', color: '#f75c6a', freq: 60, type: 'sine' },
    { id: 'snare', name: 'Caja', color: '#7c6af7', freq: 200, type: 'triangle' },
    { id: 'hihat', name: 'Hi-hat', color: '#4ade80', freq: 8000, type: 'sawtooth' },
    { id: 'ride', name: 'Ride', color: '#3ca2f7', freq: 6000, type: 'sawtooth' },
    { id: 'crash', name: 'Crash', color: '#a78bfa', freq: 7000, type: 'sawtooth' },
    { id: 'tom1', name: 'Tom 1', color: '#fbbf24', freq: 150, type: 'sine' },
    { id: 'tom2', name: 'Tom 2', color: '#f7a23c', freq: 120, type: 'sine' },
    { id: 'floor', name: 'Floor Tom', color: '#f7603c', freq: 90, type: 'sine' },
  ]},
  { id: 'congas', name: 'Congas', rows: [
    { id: 'conga_low', name: 'Conga grave', color: '#f7a23c', freq: 150, type: 'sine' },
    { id: 'conga_high', name: 'Conga aguda', color: '#fbbf24', freq: 300, type: 'sine' },
  ]},
  { id: 'bongos', name: 'Bongós', rows: [
    { id: 'bongo_macho', name: 'Bongó macho', color: '#4ade80', freq: 400, type: 'sine' },
    { id: 'bongo_hembra', name: 'Bongó hembra', color: '#3ca2f7', freq: 280, type: 'sine' },
  ]},
  { id: 'guacharaca', name: 'Guacharaca', rows: [
    { id: 'guacharaca', name: 'Guacharaca', color: '#a78bfa', freq: 1500, type: 'sawtooth' },
  ]},
  { id: 'menor', name: 'Percusión menor', rows: [
    { id: 'maracas', name: 'Maracas', color: '#4ade80', freq: 4000, type: 'sawtooth' },
    { id: 'shaker', name: 'Shaker', color: '#3ca2f7', freq: 5000, type: 'sawtooth' },
    { id: 'pandereta', name: 'Pandereta', color: '#f7a23c', freq: 2000, type: 'triangle' },
  ]},
  { id: 'afro', name: 'Afrocubana', rows: [
    { id: 'clave', name: 'Clave', color: '#f75c6a', freq: 1800, type: 'square' },
    { id: 'cencerro', name: 'Cencerro', color: '#fbbf24', freq: 2500, type: 'triangle' },
    { id: 'timbal', name: 'Timbal', color: '#7c6af7', freq: 350, type: 'sine' },
  ]},
  { id: 'orquestal', name: 'Orquestal', rows: [
    { id: 'triangulo', name: 'Triángulo', color: '#3ca2f7', freq: 3500, type: 'sine' },
    { id: 'castanuelas', name: 'Castañuelas', color: '#f7a23c', freq: 1600, type: 'square' },
    { id: 'woodblock', name: 'Woodblock', color: '#4ade80', freq: 1200, type: 'square' },
  ]},
  { id: 'electronic', name: 'Electrónica', rows: [
    { id: 'clap_e', name: 'Clap', color: '#a78bfa', freq: 800, type: 'triangle' },
    { id: 'rimshot', name: 'Rim shot', color: '#f75c6a', freq: 500, type: 'square' },
  ]},
];

const COMPLETE_TYPE = {
  id: 'complete', name: 'Percusión completa',
};

function playDrum(ctx, row, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = row.type || 'sine';
  if (row.freq > 3000) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = row.freq;
    src.buffer = buf; src.connect(filt); filt.connect(gain);
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    src.start(time); src.stop(time + 0.1);
    return;
  }
  if (row.id === 'kick' || row.freq < 100) {
    osc.frequency.setValueAtTime(row.freq * 3, time);
    osc.frequency.exponentialRampToValueAtTime(row.freq, time + 0.05);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    osc.start(time); osc.stop(time + 0.3);
    return;
  }
  osc.frequency.value = row.freq;
  gain.gain.setValueAtTime(0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.start(time); osc.stop(time + 0.15);
}

function RhythmPad() {
  const [bpm, setBpm] = useState(90);
  const [numerator, setNumerator] = useState(4);
  const [denominator, setDenominator] = useState(4);
  const [bars, setBars] = useState(1);
  const [selectedType, setSelectedType] = useState(INSTRUMENT_TYPES[3]);
  const [completeSelected, setCompleteSelected] = useState(['drums_basic']);
  const [showComplete, setShowComplete] = useState(false);
  const [activeRows, setActiveRows] = useState(INSTRUMENT_TYPES[3].rows);
  const [grid, setGrid] = useState({});
  const [volumes, setVolumes] = useState({});
  const [muted, setMuted] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const [showBpmSettings, setShowBpmSettings] = useState(false);

  const audioCtx = useRef(null);
  const schedulerRef = useRef(null);
  const stepRef = useRef(0);
  const nextNoteTime = useRef(0);
  const bpmRef = useRef(bpm);
  const gridRef = useRef(grid);
  const volumesRef = useRef(volumes);
  const mutedRef = useRef(muted);
  const activeRowsRef = useRef(activeRows);
  const numeratorRef = useRef(numerator);
  const barsRef = useRef(bars);
  const bpmSettingsRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { activeRowsRef.current = activeRows; }, [activeRows]);
  useEffect(() => { numeratorRef.current = numerator; }, [numerator]);
  useEffect(() => { barsRef.current = bars; }, [bars]);

  useEffect(() => {
    function handleClick(e) {
      if (bpmSettingsRef.current && !bpmSettingsRef.current.contains(e.target)) setShowBpmSettings(false);
    }
    if (showBpmSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showBpmSettings]);

  const totalSteps = numerator * bars;

  function getAudioCtx() {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx.current;
  }

  function getRows() {
    if (selectedType.id === 'complete') {
      return completeSelected.flatMap(id => INSTRUMENT_TYPES.find(t => t.id === id)?.rows || []);
    }
    return selectedType.rows;
  }

  const scheduler = useCallback(() => {
    const ctx = getAudioCtx();
    const spb = 60 / bpmRef.current;
    const spStep = spb / 1;
    const total = numeratorRef.current * barsRef.current;

    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const step = stepRef.current;
      const t = nextNoteTime.current;
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => setCurrentStep(step), delay);

      const rows = activeRowsRef.current;
      rows.forEach(row => {
        if (mutedRef.current[row.id]) return;
        if (gridRef.current[row.id]?.[step]) {
          const vol = volumesRef.current[row.id] ?? 0.8;
          playDrum(ctx, { ...row }, t);
        }
      });

      nextNoteTime.current += spStep;
      stepRef.current = (step + 1) % total;
      if (stepRef.current === 0) setLoopCount(p => p + 1);
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      stepRef.current = 0;
      nextNoteTime.current = ctx.currentTime + 0.05;
      scheduler();
    } else {
      clearTimeout(schedulerRef.current);
      setCurrentStep(-1);
    }
    return () => clearTimeout(schedulerRef.current);
  }, [isPlaying, scheduler]);

  function toggleCell(rowId, step) {
    setGrid(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], [step]: !prev[rowId]?.[step] }
    }));
  }

  function clearGrid() {
    setGrid({});
  }

  function generateRandom() {
    const rows = getRows();
    const newGrid = {};
    rows.forEach(row => {
      newGrid[row.id] = {};
      for (let i = 0; i < totalSteps; i++) {
        newGrid[row.id][i] = Math.random() < 0.25;
      }
    });
    setGrid(newGrid);
  }

  function handleTypeSelect(type) {
    if (type.id === 'complete') {
      setSelectedType({ ...COMPLETE_TYPE });
      setShowComplete(true);
    } else {
      setSelectedType(type);
      setShowComplete(false);
      setActiveRows(type.rows);
    }
    setGrid({});
    setCurrentStep(-1);
    if (isPlaying) setIsPlaying(false);
  }

  function toggleCompleteType(id) {
    setCompleteSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      const rows = next.flatMap(tid => INSTRUMENT_TYPES.find(t => t.id === tid)?.rows || []);
      setActiveRows(rows);
      return next;
    });
    setGrid({});
  }

  const displayRows = getRows();

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Controles superiores */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* BPM */}
        <div className="flex items-center gap-2" ref={bpmSettingsRef}>
          <div className="relative">
            <button onClick={() => setShowBpmSettings(p => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ background: '#22222e', border: '1px solid #333344' }}>
              <span className="text-white font-bold">{bpm}</span>
              <span style={{ color: '#5a5a70', fontSize: '11px' }}>BPM ⚙️</span>
            </button>
            {showBpmSettings && (
              <div className="absolute left-0 top-11 z-50 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: '#1c1c26', border: '1px solid #2a2a38', width: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <input type="range" min="40" max="240" value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ accentColor: '#7c6af7', width: '100%' }} />
                <div className="flex justify-between text-xs" style={{ color: '#5a5a70' }}><span>40</span><span className="font-bold text-white">{bpm}</span><span>240</span></div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs" style={{ color: '#9090a8' }}>Compás</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setNumerator(p => Math.max(1, p - 1))} className="w-6 h-6 rounded text-xs" style={{ background: '#0f0f13', color: '#9090a8' }}>−</button>
                      <span className="text-sm font-bold text-white w-4 text-center">{numerator}</span>
                      <button onClick={() => setNumerator(p => Math.min(16, p + 1))} className="w-6 h-6 rounded text-xs" style={{ background: '#0f0f13', color: '#9090a8' }}>+</button>
                      <span style={{ color: '#5a5a70', fontSize: '11px' }}>/{denominator}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs" style={{ color: '#9090a8' }}>Compases</label>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4].map(b => (
                        <button key={b} onClick={() => setBars(b)}
                          className="w-6 h-6 rounded text-xs font-bold"
                          style={{ background: bars === b ? '#7c6af720' : '#0f0f13', color: bars === b ? '#7c6af7' : '#9090a8', border: `1px solid ${bars === b ? '#7c6af7' : '#333344'}` }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs px-2 py-1 rounded-lg" style={{ background: '#22222e', color: '#5a5a70' }}>
            {numerator * bars} pasos · {bars} compás{bars > 1 ? 'es' : ''}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button onClick={generateRandom} className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: '#22222e', color: '#9090a8', border: '1px solid #333344' }}>
            🎲 Generar
          </button>
          <button onClick={clearGrid} className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: '#22222e', color: '#9090a8', border: '1px solid #333344' }}>
            🗑 Limpiar
          </button>
          {isPlaying && (
            <div className="px-2 py-1 rounded-lg text-xs" style={{ background: '#7c6af720', color: '#7c6af7' }}>
              🔁 {loopCount}
            </div>
          )}
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="flex flex-wrap gap-1.5">
        {INSTRUMENT_TYPES.map(type => (
          <button key={type.id} onClick={() => handleTypeSelect(type)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: selectedType.id === type.id ? '#7c6af720' : '#22222e',
              color: selectedType.id === type.id ? '#7c6af7' : '#9090a8',
              border: `1px solid ${selectedType.id === type.id ? '#7c6af7' : '#333344'}`,
            }}>
            {type.name}
          </button>
        ))}
        <button onClick={() => handleTypeSelect(COMPLETE_TYPE)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: selectedType.id === 'complete' ? '#7c6af720' : '#22222e',
            color: selectedType.id === 'complete' ? '#7c6af7' : '#9090a8',
            border: `1px solid ${selectedType.id === 'complete' ? '#7c6af7' : '#333344'}`,
          }}>
          🎛 Percusión completa
        </button>
      </div>

      {/* Selector percusión completa */}
      {selectedType.id === 'complete' && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
          <p className="w-full text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Selecciona los tipos:</p>
          {INSTRUMENT_TYPES.map(type => (
            <button key={type.id} onClick={() => toggleCompleteType(type.id)}
              className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: completeSelected.includes(type.id) ? '#7c6af720' : '#22222e',
                color: completeSelected.includes(type.id) ? '#7c6af7' : '#9090a8',
                border: `1px solid ${completeSelected.includes(type.id) ? '#7c6af7' : '#333344'}`,
              }}>
              {type.name}
            </button>
          ))}
        </div>
      )}

      {/* Cuadrícula */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(400, totalSteps * 36 + 120) }}>
          {/* Cabecera de compases */}
          <div className="flex mb-1" style={{ marginLeft: 120 }}>
            {Array.from({ length: bars }).map((_, barIdx) => (
              <div key={barIdx} className="flex" style={{ width: numerator * 36 }}>
                <div className="text-xs font-semibold px-1" style={{ color: '#5a5a70' }}>
                  Compás {barIdx + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Cabecera de pasos */}
          <div className="flex mb-2" style={{ marginLeft: 120 }}>
            {Array.from({ length: totalSteps }).map((_, step) => {
              const beatInBar = step % numerator;
              const isFirst = beatInBar === 0;
              const isActive = currentStep === step;
              return (
                <div key={step} className="flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    width: 32, height: 24, marginRight: 4,
                    marginLeft: isFirst && step > 0 ? 4 : 0,
                    color: isActive ? '#7c6af7' : beatInBar === 0 ? '#9090a8' : '#3a3a50',
                    borderLeft: isFirst && step > 0 ? '2px solid #2a2a38' : 'none',
                    background: isActive ? '#7c6af720' : 'transparent',
                    borderRadius: 4,
                  }}>
                  {beatInBar + 1}
                </div>
              );
            })}
          </div>

          {/* Filas */}
          {displayRows.map(row => (
            <div key={row.id} className="flex items-center mb-2">
              {/* Nombre + controles */}
              <div className="flex items-center gap-1 flex-shrink-0" style={{ width: 120 }}>
                <button onClick={() => setMuted(p => ({ ...p, [row.id]: !p[row.id] }))}
                  className="w-5 h-5 rounded text-xs flex-shrink-0"
                  style={{ background: muted[row.id] ? '#f75c6a20' : '#22222e', color: muted[row.id] ? '#f75c6a' : '#5a5a70', border: `1px solid ${muted[row.id] ? '#f75c6a' : '#333344'}` }}>
                  {muted[row.id] ? 'M' : 'M'}
                </button>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <span className="text-xs truncate" style={{ color: '#c0c0d0', maxWidth: 80 }}>{row.name}</span>
              </div>

              {/* Celdas */}
              <div className="flex">
                {Array.from({ length: totalSteps }).map((_, step) => {
                  const beatInBar = step % numerator;
                  const isBarStart = beatInBar === 0 && step > 0;
                  const isActive = currentStep === step;
                  const isOn = grid[row.id]?.[step];
                  return (
                    <button key={step}
                      onClick={() => toggleCell(row.id, step)}
                      className="transition-all rounded"
                      style={{
                        width: 32, height: 32, marginRight: 4,
                        marginLeft: isBarStart ? 4 : 0,
                        background: isOn
                          ? isActive ? row.color : row.color + 'cc'
                          : isActive ? '#2a2a38' : beatInBar === 0 ? '#1c1c26' : '#16161d',
                        border: isOn
                          ? `1px solid ${row.color}`
                          : `1px solid ${beatInBar === 0 ? '#2a2a38' : '#1c1c26'}`,
                        boxShadow: isOn && isActive ? `0 0 8px ${row.color}80` : 'none',
                        borderLeft: isBarStart ? `2px solid #2a2a38` : undefined,
                      }} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Play */}
      <button onClick={() => { setIsPlaying(p => !p); if (isPlaying) { setLoopCount(0); setCurrentStep(-1); } }}
        className="w-full py-4 rounded-2xl text-lg font-bold transition-all mt-2"
        style={{ background: isPlaying ? '#f75c6a20' : '#7c6af7', color: isPlaying ? '#f75c6a' : 'white', border: isPlaying ? '2px solid #f75c6a40' : 'none' }}>
        {isPlaying ? '⏹ Detener' : '▶ Iniciar'}
      </button>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'metronome', label: '🎵 Metrónomo', component: <Metronome /> },
  { id: 'rhythm', label: '🥁 Práctica rítmica', component: <RhythmPad /> },
];

export default function PracticePage() {
  const [activeTool, setActiveTool] = useState('metronome');
  const active = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Práctica libre</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Herramientas de práctica musical</p>
      </div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: activeTool === tool.id ? '#7c6af720' : '#22222e', color: activeTool === tool.id ? '#7c6af7' : '#9090a8', border: `1px solid ${activeTool === tool.id ? '#7c6af7' : '#333344'}` }}>
            {tool.label}
          </button>
        ))}
      </div>
      <div className="p-6 rounded-2xl" style={{ background: '#16161d', border: '1px solid #2a2a38' }}>
        {activeTool === 'metronome' && <Metronome />}
        {activeTool === 'rhythm' && <RhythmPad />}
      </div>
    </div>
  );
}
