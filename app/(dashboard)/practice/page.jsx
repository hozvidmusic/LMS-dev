'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── METRÓNOMO ───────────────────────────────────────────────────────────────
function Metronome() {
  const [bpm, setBpm] = useState(100);
  const [numerator, setNumerator] = useState(4);
  const [denominator, setDenominator] = useState(4);
  const [subdivision, setSubdivision] = useState(1);
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

  const ACCENT_GAIN = { strong: 1.0, medium: 0.5, weak: 0.2 };
  const DENOMINATORS = [1, 2, 4, 8, 16, 32];
  const SUBDIVISIONS = [
    { value: 1, label: 'Negras' },
    { value: 2, label: 'Corcheas' },
    { value: 3, label: 'Tresillos' },
    { value: 4, label: 'Semicorcheas' },
  ];
  const ACCENT_OPTIONS = [
    { value: 'strong', label: 'Fuerte' },
    { value: 'medium', label: 'Medio' },
    { value: 'weak', label: 'Débil' },
  ];

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
    osc.frequency.value = gain >= 0.9 ? 1200 : gain >= 0.4 ? 900 : 600;
    gainNode.gain.setValueAtTime(gain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  const scheduler = useCallback(() => {
    const ctx = getAudioCtx();
    const secondsPerBeat = 60 / bpm;
    const secondsPerSub = secondsPerBeat / subdivision;

    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current;
      const sub = subRef.current;
      let gain;
      if (beat === 0 && sub === 0) gain = ACCENT_GAIN[accentStrong];
      else if (sub === 0) gain = ACCENT_GAIN[accentWeak];
      else gain = 0.15;

      scheduleClick(nextNoteTime.current, gain);
      setCurrentBeat(beat);
      setCurrentSub(sub);

      nextNoteTime.current += secondsPerSub;
      subRef.current = (sub + 1) % subdivision;
      if (subRef.current === 0) beatRef.current = (beat + 1) % numerator;
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, [bpm, numerator, subdivision, accentStrong, accentWeak]);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      beatRef.current = 0;
      subRef.current = 0;
      nextNoteTime.current = ctx.currentTime;
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

  const secondsPerBeat = 60 / bpm;
  const progress = isPlaying && currentBeat >= 0 ? ((currentBeat + (currentSub / subdivision)) / numerator) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      {/* BPM Display */}
      <div className="text-center">
        <div className="text-7xl font-bold text-white font-display">{bpm}</div>
        <div className="text-sm mt-1" style={{ color: '#5a5a70' }}>BPM</div>
      </div>

      {/* BPM Slider */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex justify-between text-xs" style={{ color: '#5a5a70' }}>
          <span>20</span><span>300</span>
        </div>
        <input type="range" min="20" max="300" value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
          className="w-full accent-purple-500" style={{ accentColor: '#7c6af7' }} />
        <div className="flex gap-2 justify-center flex-wrap">
          {[60, 80, 100, 120, 140, 160].map(b => (
            <button key={b} onClick={() => setBpm(b)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: bpm === b ? '#7c6af720' : '#22222e',
                color: bpm === b ? '#7c6af7' : '#9090a8',
                border: `1px solid ${bpm === b ? '#7c6af7' : '#333344'}`,
              }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Compás */}
      <div className="w-full grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-center" style={{ color: '#9090a8' }}>Numerador</label>
          <div className="flex items-center gap-2 justify-center">
            <button onClick={() => setNumerator(p => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg text-lg font-bold"
              style={{ background: '#22222e', color: '#9090a8' }}>−</button>
            <span className="text-2xl font-bold text-white w-8 text-center">{numerator}</span>
            <button onClick={() => setNumerator(p => Math.min(16, p + 1))}
              className="w-8 h-8 rounded-lg text-lg font-bold"
              style={{ background: '#22222e', color: '#9090a8' }}>+</button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-center" style={{ color: '#9090a8' }}>Denominador</label>
          <div className="flex flex-wrap gap-1 justify-center">
            {DENOMINATORS.map(d => (
              <button key={d} onClick={() => setDenominator(d)}
                className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: denominator === d ? '#7c6af720' : '#22222e',
                  color: denominator === d ? '#7c6af7' : '#9090a8',
                  border: `1px solid ${denominator === d ? '#7c6af7' : '#333344'}`,
                }}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Subdivisión */}
      <div className="w-full flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Subdivisión</label>
        <div className="flex gap-2 flex-wrap">
          {SUBDIVISIONS.map(s => (
            <button key={s.value} onClick={() => setSubdivision(s.value)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: subdivision === s.value ? '#7c6af720' : '#22222e',
                color: subdivision === s.value ? '#7c6af7' : '#9090a8',
                border: `1px solid ${subdivision === s.value ? '#7c6af7' : '#333344'}`,
              }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Acento fuerte y débil */}
      <div className="w-full grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tiempo 1</label>
          <div className="flex flex-col gap-1">
            {ACCENT_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setAccentStrong(a.value)}
                className="py-1.5 rounded-lg text-xs font-medium transition-all"
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
          <div className="flex flex-col gap-1">
            {ACCENT_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setAccentWeak(a.value)}
                className="py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: accentWeak === a.value ? '#7c6af720' : '#22222e',
                  color: accentWeak === a.value ? '#7c6af7' : '#9090a8',
                  border: `1px solid ${accentWeak === a.value ? '#7c6af7' : '#333344'}`,
                }}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Pulso visual */}
      <div className="w-full flex gap-2 justify-center">
        {Array.from({ length: numerator }).map((_, i) => (
          <div key={i} className="flex-1 h-4 rounded-full transition-all"
            style={{
              background: isPlaying && currentBeat === i
                ? i === 0 ? '#7c6af7' : '#a08af7'
                : '#2a2a38',
              transform: isPlaying && currentBeat === i ? 'scaleY(1.4)' : 'scaleY(1)',
              maxWidth: '40px',
            }} />
        ))}
      </div>

      {/* Progreso del compás */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a38' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: '#7c6af7' }} />
      </div>

      {/* Botones */}
      <div className="flex gap-4 w-full">
        <button onClick={() => setIsPlaying(p => !p)}
          className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all"
          style={{
            background: isPlaying ? '#f75c6a20' : '#7c6af7',
            color: isPlaying ? '#f75c6a' : 'white',
            border: isPlaying ? '2px solid #f75c6a' : 'none',
          }}>
          {isPlaying ? '⏹ Detener' : '▶ Iniciar'}
        </button>
        <button onClick={handleTap}
          className="px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
          style={{ background: '#22222e', color: '#9090a8', border: '1px solid #333344' }}>
          TAP
        </button>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL PRÁCTICA LIBRE ─────────────────────────────────────────
const TOOLS = [
  { id: 'metronome', label: '🎵 Metrónomo', component: <Metronome /> },
  // Aquí irán las demás herramientas
];

export default function PracticePage() {
  const [activeTool, setActiveTool] = useState('metronome');
  const active = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Práctica libre</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Herramientas de práctica musical</p>
      </div>

      {/* Tabs de herramientas */}
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

      {/* Herramienta activa */}
      <div className="p-6 rounded-2xl" style={{ background: '#16161d', border: '1px solid #2a2a38' }}>
        {active?.component}
      </div>
    </div>
  );
}
