'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEvaluation, getQuestions, getAttemptsCount, saveResult } from '@/services/evaluationService';
import { MdChevronLeft, MdTimer } from 'react-icons/md';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuestionMultipleSingle({ options, answer, setAnswer }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button key={opt.id} type="button" onClick={() => setAnswer(opt.id)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all"
          style={{
            background: answer === opt.id ? '#7c6af720' : '#0f0f13',
            border: `1px solid ${answer === opt.id ? '#7c6af7' : '#2a2a38'}`,
            color: answer === opt.id ? '#e8e8f0' : '#9090a8',
          }}>
          <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ border: `2px solid ${answer === opt.id ? '#7c6af7' : '#5a5a70'}` }}>
            {answer === opt.id && <div className="w-2 h-2 rounded-full" style={{ background: '#7c6af7' }} />}
          </div>
          {opt.text}
        </button>
      ))}
    </div>
  );
}

function QuestionMultipleMany({ options, answer = [], setAnswer }) {
  function toggle(id) {
    setAnswer(prev => Array.isArray(prev) ? (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) : [id]);
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => {
        const checked = (answer || []).includes(opt.id);
        return (
          <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all"
            style={{
              background: checked ? '#7c6af720' : '#0f0f13',
              border: `1px solid ${checked ? '#7c6af7' : '#2a2a38'}`,
              color: checked ? '#e8e8f0' : '#9090a8',
            }}>
            <div className="w-4 h-4 rounded-md flex-shrink-0 flex items-center justify-center"
              style={{ border: `2px solid ${checked ? '#7c6af7' : '#5a5a70'}`, background: checked ? '#7c6af7' : 'transparent' }}>
              {checked && <span className="text-white text-xs font-bold">v</span>}
            </div>
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}

function QuestionTrueFalse({ answer, setAnswer }) {
  return (
    <div className="flex gap-3">
      {[{ val: 'true', label: 'Verdadero' }, { val: 'false', label: 'Falso' }].map(opt => (
        <button key={opt.val} type="button" onClick={() => setAnswer(opt.val)}
          className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: answer === opt.val ? '#7c6af720' : '#0f0f13',
            border: `1px solid ${answer === opt.val ? '#7c6af7' : '#2a2a38'}`,
            color: answer === opt.val ? '#7c6af7' : '#9090a8',
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function QuestionFillBlank({ answer, setAnswer }) {
  return (
    <input value={answer || ''} onChange={e => setAnswer(e.target.value)}
      placeholder="Escribe tu respuesta aqui..."
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={{ background: '#0f0f13', border: '1px solid #2a2a38', color: '#e8e8f0' }} />
  );
}

function QuestionMatch({ pairs, answer = {}, setAnswer }) {
  const [rights] = useState(() => shuffle(pairs.map(p => p.right_text)));
  return (
    <div className="flex flex-col gap-3">
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: '#0f0f13', border: '1px solid #2a2a38', color: '#e8e8f0' }}>
            {pair.left_text}
          </div>
          <span style={{ color: '#5a5a70' }}>to</span>
          <select value={answer[pair.left_text] || ''}
            onChange={e => setAnswer({ ...answer, [pair.left_text]: e.target.value })}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#0f0f13', border: '1px solid #2a2a38', color: '#e8e8f0' }}>
            <option value="">Seleccionar...</option>
            {rights.map((r, j) => <option key={j} value={r}>{r}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function QuestionOrder({ items, answer = [], setAnswer }) {
  const [list, setList] = useState(() => answer.length ? answer : shuffle(items.map(i => i.text)));
  const drag = useRef(null);
  function onDragStart(i) { drag.current = i; }
  function onDrop(i) {
    const next = [...list];
    const moved = next.splice(drag.current, 1)[0];
    next.splice(i, 0, moved);
    setList(next);
    setAnswer(next);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs mb-1" style={{ color: '#5a5a70' }}>Arrastra para ordenar</p>
      {list.map((item, i) => (
        <div key={item} draggable onDragStart={() => onDragStart(i)}
          onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm cursor-grab"
          style={{ background: '#0f0f13', border: '1px solid #2a2a38', color: '#e8e8f0' }}>
          <span style={{ color: '#5a5a70' }}>handle</span>
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#7c6af720', color: '#7c6af7' }}>{i + 1}</span>
          {item}
        </div>
      ))}
    </div>
  );
}

function scoreQuestion(q, answer) {
  if (answer === undefined || answer === null || answer === '') return 0;
  switch (q.type) {
    case 'multiple_single': {
      const correct = (q.question_options || []).find(o => o.is_correct);
      return correct && answer === correct.id ? 1 : 0;
    }
    case 'true_false': {
      const correct = (q.question_options || []).find(o => o.is_correct);
      return correct && answer === correct.text?.toLowerCase() ? 1 : 0;
    }
    case 'multiple_many': {
      const correctIds = (q.question_options || []).filter(o => o.is_correct).map(o => o.id);
      const ansArr = answer || [];
      return correctIds.every(id => ansArr.includes(id)) && ansArr.every(id => correctIds.includes(id)) ? 1 : 0;
    }
    case 'fill_blank': {
      const correct = (q.question_options || []).find(o => o.is_correct)?.text || '';
      return answer?.trim().toLowerCase() === correct.trim().toLowerCase() ? 1 : 0;
    }
    case 'match': {
      const pairs = q.question_pairs || [];
      if (!pairs.length) return 0;
      return pairs.filter(p => answer[p.left_text] === p.right_text).length / pairs.length;
    }
    case 'order': {
      const items = (q.question_order_items || []).map(i => i.text);
      const ansArr = answer || [];
      return items.length ? items.filter((item, i) => ansArr[i] === item).length / items.length : 0;
    }
    default: return 0;
  }
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: '#5a5a70' }}>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

export default function TakeEvaluation() {
  const { evaluationId } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [evaluation, setEvaluation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [ev, qs, att] = await Promise.all([
          getEvaluation(evaluationId),
          getQuestions(evaluationId),
          getAttemptsCount(evaluationId, profile?.id),
        ]);
        setEvaluation(ev);
        setQuestions(ev.random_order ? shuffle(qs) : qs);
        setAttempts(att);
      } catch { toast.error('No se pudo cargar la evaluacion'); }
      finally { setLoading(false); }
    }
    if (profile) load();
  }, [evaluationId, profile]);

  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [started, timeLeft]);

  function startEval() {
    setStarted(true);
    if (evaluation?.time_limit) setTimeLeft(evaluation.time_limit * 60);
  }

  function setAnswer(qId, value) { setAnswers(prev => ({ ...prev, [qId]: value })); }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    clearTimeout(timerRef.current);
    try {
      const total = questions.length;
      const raw = questions.reduce((sum, q) => sum + scoreQuestion(q, answers[q.id]), 0);
      const pct = total > 0 ? Math.round((raw / total) * 100) : 0;
      await saveResult({ evaluation_id: evaluationId, user_id: profile.id, score: pct, attempt: attempts + 1, answers });
      setScore(pct);
      setFinished(true);
    } catch { toast.error('Error al enviar la evaluacion'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: '#5a5a70' }}>Cargando...</p></div>;
  if (!evaluation) return <div className="flex items-center justify-center h-64"><p style={{ color: '#5a5a70' }}>Evaluacion no encontrada.</p></div>;

  const canAttempt = evaluation.max_attempts === 999 || attempts < evaluation.max_attempts;

  if (finished) {
    const passed = score >= 60;
    return (
      <div className="max-w-lg mx-auto pt-10">
        <Card>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: passed ? '#4ade8020' : '#f75c6a20' }}>
              {passed ? 'ok' : 'ups'}
            </div>
            <h2 className="font-display font-bold text-2xl text-white">{passed ? 'Bien hecho!' : 'Sigue practicando'}</h2>
            <div className="text-6xl font-bold" style={{ color: passed ? '#4ade80' : '#f75c6a' }}>{score}%</div>
            <p className="text-sm text-center" style={{ color: '#9090a8' }}>
              {passed ? 'Superaste la evaluacion.' : 'No alcanzaste el puntaje minimo (60%).'}
            </p>
            <Button onClick={() => router.back()} className="mt-2">Volver a la leccion</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-lg mx-auto pt-10">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm mb-4" style={{ color: '#9090a8' }}>
          Volver
        </button>
        <Card>
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-bold text-2xl text-white">{evaluation.title}</h1>
            {evaluation.description && <p className="text-sm" style={{ color: '#9090a8' }}>{evaluation.description}</p>}
            <div className="flex flex-col gap-2 p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
              <InfoRow label="Preguntas" value={questions.length} />
              <InfoRow label="Intentos usados" value={`${attempts} de ${evaluation.max_attempts === 999 ? 'ilimitados' : evaluation.max_attempts}`} />
              {evaluation.time_limit && <InfoRow label="Tiempo limite" value={`${evaluation.time_limit} minutos`} />}
            </div>
            {!canAttempt
              ? <p className="text-center text-sm py-2" style={{ color: '#f75c6a' }}>Has alcanzado el numero maximo de intentos.</p>
              : <Button onClick={startEval} className="w-full">Comenzar evaluacion</Button>}
          </div>
        </Card>
      </div>
    );
  }

  const mins = timeLeft !== null ? String(Math.floor(timeLeft / 60)).padStart(2, '0') : null;
  const secs = timeLeft !== null ? String(timeLeft % 60).padStart(2, '0') : null;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="sticky top-0 z-10 flex items-center justify-between py-3 mb-6"
        style={{ background: '#0a0a0f', borderBottom: '1px solid #1a1a24' }}>
        <h2 className="font-semibold text-white text-sm truncate">{evaluation.title}</h2>
        {timeLeft !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-bold"
            style={{ background: timeLeft < 60 ? '#f75c6a20' : '#7c6af720', color: timeLeft < 60 ? '#f75c6a' : '#7c6af7', border: `1px solid ${timeLeft < 60 ? '#f75c6a40' : '#7c6af740'}` }}>
            {mins}:{secs}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-8">
        {questions.map((q, idx) => (
          <div key={q.id}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#5a5a70' }}>Pregunta {idx + 1} de {questions.length}</p>
            <p className="text-white font-medium mb-4">{q.question}</p>
            {q.image_url && <img src={q.image_url} alt="pregunta" className="rounded-xl mb-4 max-h-60 object-contain w-full" style={{ border: '1px solid #2a2a38' }} />}
            {q.audio_url && <audio controls src={q.audio_url} className="w-full mb-4 rounded-xl" />}
            {q.type === 'multiple_single' && <QuestionMultipleSingle options={q.question_options || []} answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
            {q.type === 'multiple_many' && <QuestionMultipleMany options={q.question_options || []} answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
            {q.type === 'true_false' && <QuestionTrueFalse answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
            {q.type === 'fill_blank' && <QuestionFillBlank answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
            {q.type === 'match' && <QuestionMatch pairs={q.question_pairs || []} answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
            {q.type === 'order' && <QuestionOrder items={q.question_order_items || []} answer={answers[q.id]} setAnswer={v => setAnswer(q.id, v)} />}
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 flex justify-center"
        style={{ background: 'linear-gradient(to top, #0a0a0f 60%, transparent)' }}>
        <Button onClick={handleSubmit} disabled={submitting} className="px-10">
          {submitting ? 'Enviando...' : 'Enviar evaluacion'}
        </Button>
      </div>
    </div>
  );
}