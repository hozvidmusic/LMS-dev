'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── SOUNDFONT LOADER ─────────────────────────────────────────────────────────
const SF_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM';
const loadedBuffers = {};
let globalCtx = null;

function getCtx() {
  if (!globalCtx) globalCtx = new (window.AudioContext || window.webkitAudioContext)();
  return globalCtx;
}

async function loadNote(instrument, note) {
  const key = `${instrument}_${note}`;
  if (loadedBuffers[key]) return loadedBuffers[key];
  try {
    const url = `${SF_BASE}/${instrument}-mp3/${note}.mp3`;
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const ctx = getCtx();
    const buf = await ctx.decodeAudioData(arr);
    loadedBuffers[key] = buf;
    return buf;
  } catch { return null; }
}

function noteToName(midi) {
  const notes = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const octave = Math.floor(midi / 12) - 1;
  return notes[midi % 12] + octave;
}

async function playNote(instrument, midi, time, volume = 1) {
  const note = noteToName(midi);
  const buf = await loadNote(instrument, note);
  if (!buf) return;
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buf;
  src.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, time || ctx.currentTime);
  src.start(time || ctx.currentTime);
}

// Preload common drum sounds
async function preloadDrums(notes) {
  for (const midi of notes) {
    await loadNote('synth_drum', noteToName(midi));
  }
}

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
  const schedulerRef = useRef(null);
  const beatRef = useRef(0);
  const subRef = useRef(0);
  const nextNoteTime = useRef(0);
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
    function h(e) { if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false); }
    if (showSettings) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSettings]);

  function scheduleClick(time, gain) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = gain >= 0.9 ? 1400 : gain >= 0.4 ? 1000 : 700;
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.start(time); osc.stop(time + 0.04);
  }

  const scheduler = useCallback(() => {
    const ctx = getCtx();
    const sub = subdivisionRef.current;
    const spb = 60 / bpmRef.current;
    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current, si = subRef.current;
      const sg = ACCENT_OPTIONS.find(a => a.value === accentStrongRef.current)?.gain || 1;
      const wg = ACCENT_OPTIONS.find(a => a.value === accentWeakRef.current)?.gain || 0.5;
      const gain = beat === 0 && si === 0 ? sg : si === 0 ? wg : 0.15;
      scheduleClick(nextNoteTime.current, gain);
      const b = beat, s = si, t = nextNoteTime.current;
      setTimeout(() => { setCurrentBeat(b); setCurrentSub(s); }, Math.max(0, (t - ctx.currentTime) * 1000));
      nextNoteTime.current += spb * sub.timing[si];
      subRef.current = (si + 1) % sub.timing.length;
      if (subRef.current === 0) beatRef.current = (beat + 1) % numeratorRef.current;
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getCtx();
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
      const ivs = []; for (let i = 1; i < tapTimes.current.length; i++) ivs.push(tapTimes.current[i] - tapTimes.current[i-1]);
      const avg = ivs.reduce((a,b)=>a+b)/ivs.length;
      const nb = Math.round(60000/avg); if (nb>=20&&nb<=300) setBpm(nb);
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
            <button onClick={() => setShowSettings(p=>!p)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: showSettings?'#7c6af720':'#22222e', border:`1px solid ${showSettings?'#7c6af7':'#333344'}`, color: showSettings?'#7c6af7':'#9090a8' }}>⚙️</button>
            {showSettings && (
              <div className="absolute right-0 top-11 z-50 rounded-2xl p-4 flex flex-col gap-4"
                style={{ background:'#1c1c26', border:'1px solid #2a2a38', width:'280px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
                <p className="text-sm font-semibold text-white">Configuración</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color:'#9090a8' }}>Subdivisión</label>
                  <div className="flex gap-1.5">
                    {MET_SUBDIVISIONS.map(s => (
                      <button key={s.id} onClick={() => setSubdivision(s)} className="flex-1 flex flex-col items-center py-1.5 rounded-xl"
                        style={{ background: subdivision.id===s.id?'#7c6af720':'#0f0f13', border:`1px solid ${subdivision.id===s.id?'#7c6af7':'#333344'}` }}>
                        <span className="text-sm" style={{ color: subdivision.id===s.id?'#7c6af7':'#e8e8f0' }}>{s.label}</span>
                        <span style={{ color:'#5a5a70', fontSize:'9px' }}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color:'#9090a8' }}>Volumen — Tiempo 1</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentStrong(a.value)} className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: accentStrong===a.value?'#7c6af720':'#0f0f13', color: accentStrong===a.value?'#7c6af7':'#9090a8', border:`1px solid ${accentStrong===a.value?'#7c6af7':'#333344'}` }}>{a.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color:'#9090a8' }}>Volumen — Otros tiempos</label>
                  <div className="flex gap-1">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.value} onClick={() => setAccentWeak(a.value)} className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: accentWeak===a.value?'#7c6af720':'#0f0f13', color: accentWeak===a.value?'#7c6af7':'#9090a8', border:`1px solid ${accentWeak===a.value?'#7c6af7':'#333344'}` }}>{a.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color:'#9090a8' }}>Numerador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => setNumerator(p=>Math.max(1,p-1))} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background:'#0f0f13', color:'#9090a8' }}>−</button>
                      <span className="text-lg font-bold text-white w-6 text-center">{numerator}</span>
                      <button onClick={() => setNumerator(p=>Math.min(16,p+1))} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background:'#0f0f13', color:'#9090a8' }}>+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium" style={{ color:'#9090a8' }}>Denominador</label>
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => { const idx=DENOMINATORS.indexOf(denominator); if(idx>0) setDenominator(DENOMINATORS[idx-1]); }} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background:'#0f0f13', color:'#9090a8' }}>−</button>
                      <div className="flex flex-col items-center w-10">
                        <span className="text-base" style={{ color:'#7c6af7' }}>{DENOMINATOR_FIGURES[denominator]}</span>
                        <span className="text-xs font-bold text-white">{denominator}</span>
                      </div>
                      <button onClick={() => { const idx=DENOMINATORS.indexOf(denominator); if(idx<DENOMINATORS.length-1) setDenominator(DENOMINATORS[idx+1]); }} className="w-7 h-7 rounded-lg text-sm font-bold" style={{ background:'#0f0f13', color:'#9090a8' }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-1">
        <input type="range" min="20" max="300" value={bpm} onChange={e=>setBpm(Number(e.target.value))} className="w-full" style={{ accentColor:'#7c6af7' }} />
        <div className="flex justify-between text-xs" style={{ color:'#5a5a70' }}><span>20 — Grave</span><span>Prestissimo — 208</span></div>
      </div>
      <div className="w-full flex gap-3 justify-center flex-wrap mt-2">
        {Array.from({ length: numerator }).map((_,beatIdx) => {
          const isActiveBeat = isPlaying && currentBeat===beatIdx;
          const dotSize=14, subDotSize=8, subCount=subdivision.pattern.length;
          const totalWidth = dotSize+(subCount-1)*(subDotSize+5);
          return (
            <div key={beatIdx} className="flex flex-col items-start gap-2">
              <div style={{ width:totalWidth, display:'flex', justifyContent:'flex-start' }}>
                <div className="rounded-full transition-all duration-75" style={{ width:dotSize, height:dotSize, background: isActiveBeat?(beatIdx===0?'#f7a23c':'#7c6af7'):'#2a2a38', boxShadow: isActiveBeat?`0 0 10px ${beatIdx===0?'#f7a23c80':'#7c6af780'}`:'none' }} />
              </div>
              <div className="flex items-center gap-1">
                {subdivision.pattern.map((_,subIdx) => {
                  const isActiveSub = isPlaying&&currentBeat===beatIdx&&currentSub===subIdx;
                  const size = subIdx===0?dotSize:subDotSize;
                  return <div key={subIdx} className="rounded-full transition-all duration-75" style={{ width:size, height:size, background: isActiveSub?(subIdx===0?(beatIdx===0?'#f7a23c':'#7c6af7'):'#a08af7'):'#2a2a38' }} />;
                })}
              </div>
              <div className="text-xs text-center" style={{ color:'#3a3a50', width:totalWidth }}>{beatIdx+1}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 w-full mt-2">
        <button onClick={() => setIsPlaying(p=>!p)} className="flex-1 py-4 rounded-2xl text-lg font-bold transition-all"
          style={{ background:isPlaying?'#f75c6a20':'#7c6af7', color:isPlaying?'#f75c6a':'white', border:isPlaying?'2px solid #f75c6a40':'none' }}>
          {isPlaying?'⏹ Detener':'▶ Iniciar'}
        </button>
        <button onClick={handleTap} className="px-6 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
          style={{ background:'#22222e', color:'#9090a8', border:'1px solid #333344' }}>TAP</button>
      </div>
    </div>
  );
}

// ─── PRÁCTICA RÍTMICA ─────────────────────────────────────────────────────────
const DRUM_INSTRUMENT = 'synth_drum';

const INSTRUMENT_TYPES = [
  { id:'linear', name:'Ritmo lineal', rows:[
    { id:'line', name:'Ritmo', color:'#7c6af7', midi:56 },
  ]},
  { id:'body_basic', name:'Corporal básica', rows:[
    { id:'clap', name:'Palmada', color:'#f7a23c', midi:39 },
    { id:'stomp', name:'Patada', color:'#f75c6a', midi:36 },
  ]},
  { id:'body_ext', name:'Corporal extendida', rows:[
    { id:'right_hand', name:'Mano D', color:'#f7a23c', midi:39 },
    { id:'left_hand', name:'Mano I', color:'#fbbf24', midi:38 },
    { id:'right_foot', name:'Pie D', color:'#f75c6a', midi:36 },
    { id:'left_foot', name:'Pie I', color:'#f7603c', midi:35 },
  ]},
  { id:'drums_basic', name:'Batería básica', rows:[
    { id:'kick', name:'Bombo', color:'#f75c6a', midi:36 },
    { id:'snare', name:'Caja', color:'#7c6af7', midi:38 },
    { id:'hihat', name:'Hi-hat', color:'#4ade80', midi:42 },
  ]},
  { id:'drums_adv', name:'Batería avanzada', rows:[
    { id:'kick', name:'Bombo', color:'#f75c6a', midi:36 },
    { id:'snare', name:'Caja', color:'#7c6af7', midi:38 },
    { id:'hihat', name:'Hi-hat', color:'#4ade80', midi:42 },
    { id:'ride', name:'Ride', color:'#3ca2f7', midi:51 },
    { id:'crash', name:'Crash', color:'#a78bfa', midi:49 },
    { id:'tom1', name:'Tom 1', color:'#fbbf24', midi:48 },
    { id:'tom2', name:'Tom 2', color:'#f7a23c', midi:45 },
    { id:'floor', name:'Floor Tom', color:'#f7603c', midi:41 },
  ]},
  { id:'congas', name:'Congas', rows:[
    { id:'conga_low', name:'Conga grave', color:'#f7a23c', midi:64 },
    { id:'conga_high', name:'Conga aguda', color:'#fbbf24', midi:63 },
  ]},
  { id:'bongos', name:'Bongós', rows:[
    { id:'bongo_m', name:'Bongó macho', color:'#4ade80', midi:60 },
    { id:'bongo_h', name:'Bongó hembra', color:'#3ca2f7', midi:61 },
  ]},
  { id:'guacharaca', name:'Guacharaca', rows:[
    { id:'guacharaca', name:'Guacharaca', color:'#a78bfa', midi:73 },
  ]},
  { id:'menor', name:'Percusión menor', rows:[
    { id:'maracas', name:'Maracas', color:'#4ade80', midi:70 },
    { id:'shaker', name:'Shaker', color:'#3ca2f7', midi:82 },
    { id:'pandereta', name:'Pandereta', color:'#f7a23c', midi:54 },
  ]},
  { id:'afro', name:'Afrocubana', rows:[
    { id:'clave', name:'Clave', color:'#f75c6a', midi:75 },
    { id:'cencerro', name:'Cencerro', color:'#fbbf24', midi:56 },
    { id:'timbal', name:'Timbal', color:'#7c6af7', midi:65 },
  ]},
  { id:'orquestal', name:'Orquestal', rows:[
    { id:'triangulo', name:'Triángulo', color:'#3ca2f7', midi:81 },
    { id:'castanuelas', name:'Castañuelas', color:'#f7a23c', midi:85 },
    { id:'woodblock', name:'Woodblock', color:'#4ade80', midi:76 },
  ]},
  { id:'electronic', name:'Electrónica', rows:[
    { id:'clap_e', name:'Clap', color:'#a78bfa', midi:39 },
    { id:'rimshot', name:'Rim shot', color:'#f75c6a', midi:37 },
  ]},
];

function RhythmPad() {
  const [bpm, setBpm] = useState(90);
  const [numerator, setNumerator] = useState(4);
  const [bars, setBars] = useState(1);
  const [selectedType, setSelectedType] = useState(INSTRUMENT_TYPES[3]);
  const [completeSelected, setCompleteSelected] = useState(['drums_basic']);
  const [isComplete, setIsComplete] = useState(false);
  const [activeRows, setActiveRows] = useState(INSTRUMENT_TYPES[3].rows);
  const [grid, setGrid] = useState({});
  const [volumes, setVolumes] = useState({});
  const [muted, setMuted] = useState({});
  const [soloed, setSoloed] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const [showBpmSettings, setShowBpmSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  const schedulerRef = useRef(null);
  const stepRef = useRef(0);
  const nextNoteTime = useRef(0);
  const bpmRef = useRef(bpm);
  const gridRef = useRef(grid);
  const volumesRef = useRef(volumes);
  const mutedRef = useRef(muted);
  const soloedRef = useRef(soloed);
  const activeRowsRef = useRef(activeRows);
  const numeratorRef = useRef(numerator);
  const barsRef = useRef(bars);
  const bpmSettingsRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { volumesRef.current = volumes; }, [volumes]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { soloedRef.current = soloed; }, [soloed]);
  useEffect(() => { activeRowsRef.current = activeRows; }, [activeRows]);
  useEffect(() => { numeratorRef.current = numerator; }, [numerator]);
  useEffect(() => { barsRef.current = bars; }, [bars]);

  useEffect(() => {
    function h(e) { if (bpmSettingsRef.current && !bpmSettingsRef.current.contains(e.target)) setShowBpmSettings(false); }
    if (showBpmSettings) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showBpmSettings]);

  const totalSteps = numerator * bars;

  function getRows() {
    if (isComplete) return completeSelected.flatMap(id => INSTRUMENT_TYPES.find(t=>t.id===id)?.rows||[]);
    return selectedType.rows;
  }

  function hasSolo() { return Object.values(soloedRef.current).some(Boolean); }

  const scheduler = useCallback(() => {
    const ctx = getCtx();
    const spStep = 60 / bpmRef.current;
    const total = numeratorRef.current * barsRef.current;
    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      const step = stepRef.current;
      const t = nextNoteTime.current;
      setTimeout(() => setCurrentStep(step), Math.max(0,(t-ctx.currentTime)*1000));
      const rows = activeRowsRef.current;
      const anySolo = rows.some(r => soloedRef.current[r.id]);
      rows.forEach(row => {
        if (anySolo && !soloedRef.current[row.id]) return;
        if (mutedRef.current[row.id]) return;
        if (gridRef.current[row.id]?.[step]) {
          const vol = volumesRef.current[row.id] ?? 0.8;
          playNote(DRUM_INSTRUMENT, row.midi, t, vol);
        }
      });
      nextNoteTime.current += spStep;
      stepRef.current = (step+1)%total;
      if (stepRef.current===0) setLoopCount(p=>p+1);
    }
    schedulerRef.current = setTimeout(scheduler, 25);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const ctx = getCtx();
      if (ctx.state==='suspended') ctx.resume();
      // Preload
      const rows = activeRowsRef.current;
      setLoading(true);
      Promise.all(rows.map(r => loadNote(DRUM_INSTRUMENT, noteToName(r.midi)))).then(() => {
        setLoading(false);
        stepRef.current = 0;
        nextNoteTime.current = ctx.currentTime + 0.1;
        scheduler();
      });
    } else { clearTimeout(schedulerRef.current); setCurrentStep(-1); }
    return () => clearTimeout(schedulerRef.current);
  }, [isPlaying, scheduler]);

  function toggleCell(rowId, step) {
    setGrid(prev => ({ ...prev, [rowId]: { ...prev[rowId], [step]: !prev[rowId]?.[step] } }));
  }

  function generateRandom() {
    const rows = getRows();
    const newGrid = {};
    rows.forEach(row => {
      newGrid[row.id] = {};
      for (let i=0; i<totalSteps; i++) newGrid[row.id][i] = Math.random()<0.25;
    });
    setGrid(newGrid);
  }

  function handleTypeSelect(type, complete=false) {
    setIsComplete(complete);
    if (!complete) { setSelectedType(type); setActiveRows(type.rows); }
    setGrid({}); setMuted({}); setSoloed({});
    if (isPlaying) setIsPlaying(false);
  }

  function toggleCompleteType(id) {
    setCompleteSelected(prev => {
      const next = prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      setActiveRows(next.flatMap(tid=>INSTRUMENT_TYPES.find(t=>t.id===tid)?.rows||[]));
      return next;
    });
    setGrid({}); setSoloed({});
  }

  function toggleSolo(rowId) {
    setSoloed(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  }

  const displayRows = getRows();

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controles superiores */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div ref={bpmSettingsRef} className="relative">
          <button onClick={() => setShowBpmSettings(p=>!p)} className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background:'#22222e', border:'1px solid #333344' }}>
            <span className="text-white font-bold">{bpm}</span>
            <span style={{ color:'#5a5a70', fontSize:'11px' }}>BPM ⚙️</span>
          </button>
          {showBpmSettings && (
            <div className="absolute left-0 top-11 z-50 rounded-2xl p-4 flex flex-col gap-3"
              style={{ background:'#1c1c26', border:'1px solid #2a2a38', width:'220px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
              <input type="range" min="40" max="240" value={bpm} onChange={e=>setBpm(Number(e.target.value))} style={{ accentColor:'#7c6af7', width:'100%' }} />
              <div className="flex justify-between text-xs" style={{ color:'#5a5a70' }}><span>40</span><span className="font-bold text-white">{bpm}</span><span>240</span></div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color:'#9090a8' }}>Numerador del compás</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setNumerator(p=>Math.max(1,p-1))} className="w-7 h-7 rounded text-sm" style={{ background:'#0f0f13', color:'#9090a8' }}>−</button>
                  <span className="text-sm font-bold text-white w-4 text-center">{numerator}</span>
                  <button onClick={() => setNumerator(p=>Math.min(16,p+1))} className="w-7 h-7 rounded text-sm" style={{ background:'#0f0f13', color:'#9090a8' }}>+</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color:'#9090a8' }}>Número de compases</label>
                <div className="flex gap-1">
                  {[1,2,3,4].map(b => (
                    <button key={b} onClick={() => setBars(b)} className="flex-1 py-1 rounded text-xs font-bold"
                      style={{ background: bars===b?'#7c6af720':'#0f0f13', color: bars===b?'#7c6af7':'#9090a8', border:`1px solid ${bars===b?'#7c6af7':'#333344'}` }}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs px-2 py-1 rounded-lg" style={{ background:'#22222e', color:'#5a5a70' }}>
          {totalSteps} pasos · {bars} compás{bars>1?'es':''}
        </div>
        <div className="flex gap-2">
          <button onClick={generateRandom} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background:'#22222e', color:'#9090a8', border:'1px solid #333344' }}>🎲 Generar</button>
          <button onClick={() => setGrid({})} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background:'#22222e', color:'#9090a8', border:'1px solid #333344' }}>🗑 Limpiar</button>
          {isPlaying && <div className="px-2 py-1 rounded-lg text-xs" style={{ background:'#7c6af720', color:'#7c6af7' }}>🔁 {loopCount}</div>}
        </div>
      </div>

      {/* Selector de tipo */}
      <div className="flex flex-wrap gap-1.5">
        {INSTRUMENT_TYPES.map(type => (
          <button key={type.id} onClick={() => handleTypeSelect(type, false)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: !isComplete&&selectedType.id===type.id?'#7c6af720':'#22222e', color: !isComplete&&selectedType.id===type.id?'#7c6af7':'#9090a8', border:`1px solid ${!isComplete&&selectedType.id===type.id?'#7c6af7':'#333344'}` }}>
            {type.name}
          </button>
        ))}
        <button onClick={() => handleTypeSelect(null, true)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{ background: isComplete?'#7c6af720':'#22222e', color: isComplete?'#7c6af7':'#9090a8', border:`1px solid ${isComplete?'#7c6af7':'#333344'}` }}>
          🎛 Percusión completa
        </button>
      </div>

      {isComplete && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl" style={{ background:'#0f0f13', border:'1px solid #2a2a38' }}>
          <p className="w-full text-xs font-medium mb-1" style={{ color:'#9090a8' }}>Selecciona los tipos:</p>
          {INSTRUMENT_TYPES.map(type => (
            <button key={type.id} onClick={() => toggleCompleteType(type.id)}
              className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ background: completeSelected.includes(type.id)?'#7c6af720':'#22222e', color: completeSelected.includes(type.id)?'#7c6af7':'#9090a8', border:`1px solid ${completeSelected.includes(type.id)?'#7c6af7':'#333344'}` }}>
              {type.name}
            </button>
          ))}
        </div>
      )}

      {/* Cuadrícula */}
      <div className="overflow-x-auto pb-2">
        <div style={{ minWidth: Math.max(400, totalSteps*36+200) }}>
          {/* Cabecera compases */}
          <div className="flex mb-1" style={{ marginLeft: 200 }}>
            {Array.from({ length: bars }).map((_,barIdx) => (
              <div key={barIdx} style={{ width: numerator*36+numerator*4 }}>
                <div className="text-xs font-semibold px-1" style={{ color:'#5a5a70' }}>Compás {barIdx+1}</div>
              </div>
            ))}
          </div>

          {/* Cabecera pasos */}
          <div className="flex mb-2" style={{ marginLeft: 200 }}>
            {Array.from({ length: totalSteps }).map((_,step) => {
              const beatInBar = step%numerator;
              const isBarStart = beatInBar===0&&step>0;
              const isActive = currentStep===step;
              return (
                <div key={step} className="flex items-center justify-center text-xs font-bold transition-all rounded"
                  style={{ width:32, height:22, marginRight:4, marginLeft:isBarStart?8:0, color:isActive?'#7c6af7':beatInBar===0?'#9090a8':'#3a3a50', background:isActive?'#7c6af720':'transparent' }}>
                  {beatInBar+1}
                </div>
              );
            })}
          </div>

          {/* Filas */}
          {displayRows.map(row => {
            const isMuted = muted[row.id];
            const isSoloed = soloed[row.id];
            const vol = volumes[row.id] ?? 0.8;
            return (
              <div key={row.id} className="flex items-center mb-2">
                {/* Controles de fila */}
                <div className="flex items-center gap-1 flex-shrink-0" style={{ width:200 }}>
                  {/* Mute */}
                  <button onClick={() => setMuted(p=>({...p,[row.id]:!p[row.id]}))}
                    className="w-6 h-6 rounded text-xs font-bold flex-shrink-0 flex items-center justify-center"
                    style={{ background:isMuted?'#f75c6a20':'#22222e', color:isMuted?'#f75c6a':'#5a5a70', border:`1px solid ${isMuted?'#f75c6a':'#333344'}` }}>
                    M
                  </button>
                  {/* Solo */}
                  <button onClick={() => toggleSolo(row.id)}
                    className="w-6 h-6 rounded text-xs font-bold flex-shrink-0 flex items-center justify-center"
                    style={{ background:isSoloed?'#fbbf2420':'#22222e', color:isSoloed?'#fbbf24':'#5a5a70', border:`1px solid ${isSoloed?'#fbbf24':'#333344'}` }}>
                    S
                  </button>
                  {/* Color dot + nombre */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:row.color }} />
                  <span className="text-xs truncate flex-1" style={{ color:'#c0c0d0', maxWidth:70 }}>{row.name}</span>
                  {/* Volumen */}
                  <input type="range" min="0" max="1" step="0.05" value={vol}
                    onChange={e => setVolumes(p=>({...p,[row.id]:Number(e.target.value)}))}
                    style={{ width:50, accentColor: row.color }}
                    title={`Volumen: ${Math.round(vol*100)}%`}
                  />
                </div>

                {/* Celdas */}
                <div className="flex">
                  {Array.from({ length: totalSteps }).map((_,step) => {
                    const beatInBar = step%numerator;
                    const isBarStart = beatInBar===0&&step>0;
                    const isActive = currentStep===step;
                    const isOn = grid[row.id]?.[step];
                    return (
                      <button key={step} onClick={() => toggleCell(row.id, step)}
                        className="transition-all rounded"
                        style={{
                          width:32, height:32, marginRight:4,
                          marginLeft: isBarStart?8:0,
                          background: isOn?(isActive?row.color:row.color+'cc'):(isActive?'#2a2a38':beatInBar===0?'#1c1c26':'#16161d'),
                          border: isOn?`1px solid ${row.color}`:`1px solid ${beatInBar===0?'#2a2a38':'#1c1c26'}`,
                          borderLeft: isBarStart?`3px solid #3a3a50`:undefined,
                          boxShadow: isOn&&isActive?`0 0 8px ${row.color}80`:'none',
                          opacity: isMuted?0.3:1,
                        }} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Play */}
      <button onClick={() => { setIsPlaying(p=>!p); if(isPlaying){setLoopCount(0);setCurrentStep(-1);} }}
        className="w-full py-4 rounded-2xl text-lg font-bold transition-all"
        style={{ background:isPlaying?'#f75c6a20':'#7c6af7', color:isPlaying?'#f75c6a':'white', border:isPlaying?'2px solid #f75c6a40':'none' }}>
        {loading?'⏳ Cargando sonidos...':isPlaying?'⏹ Detener':'▶ Iniciar'}
      </button>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const TOOLS = [
  { id:'metronome', label:'🎵 Metrónomo' },
  { id:'rhythm', label:'🥁 Práctica rítmica' },
];

export default function PracticePage() {
  const [activeTool, setActiveTool] = useState('metronome');
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Práctica libre</h1>
        <p className="text-sm mt-1" style={{ color:'#5a5a70' }}>Herramientas de práctica musical</p>
      </div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background:activeTool===tool.id?'#7c6af720':'#22222e', color:activeTool===tool.id?'#7c6af7':'#9090a8', border:`1px solid ${activeTool===tool.id?'#7c6af7':'#333344'}` }}>
            {tool.label}
          </button>
        ))}
      </div>
      <div className="p-6 rounded-2xl" style={{ background:'#16161d', border:'1px solid #2a2a38' }}>
        {activeTool==='metronome' && <Metronome />}
        {activeTool==='rhythm' && <RhythmPad />}
      </div>
    </div>
  );
}
