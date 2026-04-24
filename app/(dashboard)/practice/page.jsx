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
  { id: 'quarter',   label: '♩',   name: 'Negra',        pattern: [1],                timing: [1] },
  { id: 'eighth',    label: '♪♪',  name: 'Corcheas',     pattern: [1, 0.6],           timing: [0.5, 0.5] },
  { id: 'triplet',   label: '♪♪♪', name: 'Tresillos',    pattern: [1, 0.6, 0.6],      timing: [1/3, 1/3, 1/3] },
  { id: 'sixteenth', label: '♬♬',  name: 'Semicorcheas', pattern: [1, 0.5, 0.5, 0.5], timing: [0.25, 0.25, 0.25, 0.25] },
];

const ACCENT_OPTIONS = [
  { value: 'strong', label: 'Fuerte', gain: 1.0 },
  { value: 'medium', label: 'Medio',  gain: 0.5 },
  { value: 'weak',   label: 'Débil',  gain: 0.2 },
];

function getClosestPreset(bpm) {
  return BPM_PRESETS.reduce((prev, curr) =>
    Math.abs(curr.bpm - bpm) < Math.abs(prev.bpm - bpm) ? curr : prev
  );
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

  // Cerrar settings al click fuera
  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  function getAudioCtx() {
    if (!audioCtx.current)
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
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
    const sub = subdivisionRef.current;
    const secondsPerBeat = 60 / bpmRef.current;

    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current;
      const si = subRef.current;
      const strongGain = ACCENT_OPTIONS.find(a => a.value === accentStrongRef.current)?.gain || 1;
      const weakGain = ACCENT_OPTIONS.find(a => a.value === accentWeakRef.current)?.gain || 0.5;

      let gain;
      if (beat === 0 && si === 0) gain = strongGain;
      else if (si === 0) gain = weakGain;
      else gain = 0.15;

      scheduleClick(nextNoteTime.current, gain);

      const b = beat, s = si, t = nextNoteTime.current;
      const delay = Math.max(0, (t - ctx.currentTime) * 1000);
      setTimeout(() => { setCurrentBeat(b); setCurrentSub(s); }, delay);

      nextNoteTime.current += secondsPerBeat * sub.timing[si];
      subRef.current = (si + 1) % sub.timing.length;
      if (subRef.current === 0) beatRef.current = (beat + 1) % numeratorRef.current;
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

  const closestPreset = getClosestPreset(bpm);

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">

      {/* BPM Display + engranaje */}
      <div className="w-full flex items-start justify-between">
        <div className="flex-1" />
        <div className="text-center">
          <div className="text-7xl font-bold text-white font-display leading-none">{bpm}</div>
          <div className="text-lg mt-1 font-medium" style={{ color: '#7c6af7' }}>{closestPreset.name}</div>
          <div className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>BPM</div>
        </div>
        {/* Engranaje */}
        <div className="flex-1 flex justify-end" ref={settingsRef}>
          <div className="relative">
            <button onClick={() => setShowSettings(p => !p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-lg"
              style={{
                background: showSettings ? '#7c6af720' : '#22222e',
                border: `1px solid ${showSettings ? '#7c6af7' : '#333344'}`,
                color: showSettings ? '#7c6af7' : '#9090a8',
              }}>
              ⚙️
            </button>

            {/* Panel flotante de configuración */}
            {showSettings && (
              <div className="absolute right-0 top-11 z-50 rounded-2xl p-4 flex flex-col gap-4"
                style={{
                  background: '#1c1c26',
                  border: '1px solid #2a2a38',
                  width: '280px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                <p className="text-sm font-semibold text-white">Configuración</p>

                {/* Subdivisiones */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Subdivisión</label>
                  <div className="flex gap-1.5">
                    {SUBDIVISIONS.map(s => (
                      <button key={s.id} onClick={() => setSubdivision(s)}
                        className="flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all"
                        style={{
                          background: subdivision.id === s.id ? '#7c6af720' : '#0f0f13',
                          border: `1px solid ${subdivision.id === s.id ? '#7c6af7' : '#333344'}`,
                        }}>
                        <span className="text-sm" style={{ color: subdivision.id === s.id ? '#7c6af7' : '#e8e8f0' }}>{s.label}</span>
                        <span style={{ color: '#5a5a70', fontSize: '9px' }}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Acento tiempo 1 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Volumen — Tiempo 1</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentStrong(a.value)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: accentStrong === a.value ? '#7c6af720' : '#0f0f13',
                          color: accentStrong === a.value ? '#7c6af7' : '#9090a8',
                          border: `1px solid ${accentStrong === a.value ? '#7c6af7' : '#333344'}`,
                        }}>{a.label}</button>
                    ))}
                  </div>
                </div>

                {/* Acento otros tiempos */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Volumen — Otros tiempos</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentWeak(a.value)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: accentWeak === a.value ? '#7c6af720' : '#0f0f13',
                          color: accentWeak === a.value ? '#7c6af7' : '#9090a8',
                          border: `1px solid ${accentWeak === a.value ? '#7c6af7' : '#333344'}`,
                        }}>{a.label}</button>
                    ))}
                  </div>
                </div>

                {/* Compás dentro del panel */}
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Numerador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => setNumerator(p => Math.max(1, p - 1))}
                        className="w-7 h-7 rounded-lg text-sm font-bold"
                        style={{ background: '#0f0f13', color: '#9090a8' }}>−</button>
                      <span className="text-lg font-bold text-white w-6 text-center">{numerator}</span>
                      <button onClick={() => setNumerator(p => Math.min(16, p + 1))}
                        className="w-7 h-7 rounded-lg text-sm font-bold"
                        style={{ background: '#0f0f13', color: '#9090a8' }}>+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color: '#9090a8' }}>Denominador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => {
                        const idx = DENOMINATORS.indexOf(denominator);
                        if (idx > 0) setDenominator(DENOMINATORS[idx - 1]);
                      }}
                        className="w-7 h-7 rounded-lg text-sm font-bold"
                        style={{ background: '#0f0f13', color: '#9090a8' }}>−</button>
                      <div className="flex flex-col items-center w-10">
                        <span className="text-base" style={{ color: '#7c6af7' }}>{DENOMINATOR_FIGURES[denominator]}</span>
                        <span className="text-xs font-bold text-white">{denominator}</span>
                      </div>
                      <button onClick={() => {
                        const idx = DENOMINATORS.indexOf(denominator);
                        if (idx < DENOMINATORS.length - 1) setDenominator(DENOMINATORS[idx + 1]);
                      }}
                        className="w-7 h-7 rounded-lg text-sm font-bold"
                        style={{ background: '#0f0f13', color: '#9090a8' }}>+</button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="w-full flex flex-col gap-1">
        <input type="range" min="20" max="300" value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          className="w-full" style={{ accentColor: '#7c6af7' }} />
        <div className="flex justify-between text-xs" style={{ color: '#5a5a70' }}>
          <span>20 — Grave</span><span>Prestissimo — 208</span>
        </div>
      </div>

      {/* Pulso visual — pulso arriba, subdivisiones abajo, alineados */}
      <div className="w-full flex gap-3 justify-center flex-wrap mt-2">
        {Array.from({ length: numerator }).map((_, beatIdx) => {
          const isActiveBeat = isPlaying && currentBeat === beatIdx;
          const dotSize = 14;
          const subDotSize = 8;
          const subCount = subdivision.pattern.length;
          const totalWidth = dotSize + (subCount - 1) * (subDotSize + 5);

          return (
            <div key={beatIdx} className="flex flex-col items-start gap-2">
              {/* Pulso arriba */}
              <div style={{ width: totalWidth, display: 'flex', justifyContent: 'flex-start' }}>
                <div className="rounded-full transition-all duration-75"
                  style={{
                    width: dotSize,
                    height: dotSize,
                    background: isActiveBeat
                      ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7')
                      : '#2a2a38',
                    boxShadow: isActiveBeat
                      ? `0 0 10px ${beatIdx === 0 ? '#f7a23c80' : '#7c6af780'}`
                      : 'none',
                  }} />
              </div>

              {/* Subdivisiones abajo */}
              <div className="flex items-center gap-1">
                {subdivision.pattern.map((_, subIdx) => {
                  const isActiveSub = isPlaying && currentBeat === beatIdx && currentSub === subIdx;
                  const size = subIdx === 0 ? dotSize : subDotSize;
                  return (
                    <div key={subIdx} className="rounded-full transition-all duration-75"
                      style={{
                        width: size,
                        height: size,
                        background: isActiveSub
                          ? (subIdx === 0
                            ? (beatIdx === 0 ? '#f7a23c' : '#7c6af7')
                            : '#a08af7')
                          : '#2a2a38',
                      }} />
                  );
                })}
              </div>

              {/* Número */}
              <div className="text-xs text-center" style={{ color: '#3a3a50', width: totalWidth }}>
                {beatIdx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botones */}
      <div className="flex gap-4 w-full mt-2">
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
