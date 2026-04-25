'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEvaluation, getQuestions, createQuestion, updateQuestion, deleteQuestion, saveOptions, savePairs, saveOrderItems, saveZones } from '@/services/evaluationService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdChevronLeft } from 'react-icons/md';

const QUESTION_TYPES = [
  { id: 'multiple_single', label: '☑ Selección única' },
  { id: 'multiple_many', label: '☑☑ Selección múltiple' },
  { id: 'true_false', label: '✓✗ Verdadero/Falso' },
  { id: 'fill_blank', label: '__ Completar espacio' },
  { id: 'match', label: '🔗 Relacionar' },
  { id: 'order', label: '↕ Ordenar' },
  { id: 'image_single', label: '🖼 Imagen zona única' },
  { id: 'image_multiple', label: '🖼🖼 Imagen zonas múltiples' },
  { id: 'audio', label: '🎵 Escuchar y responder' },
];

function extractDriveId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  const m2 = url.match(/id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return m2[1];
  return null;
}

function toImageUrl(url) {
  const id = extractDriveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : url;
}

function QuestionForm({ q, onChange }) {
  const type = q.type;
  const imageRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);

  const isImageType = type === 'image_single' || type === 'image_multiple';
  const isAudioType = type === 'audio';
  const hasOptions = ['multiple_single','multiple_many','audio'].includes(type);

  function addOption() { onChange({ ...q, options: [...(q.options||[]), { text: '', is_correct: false }] }); }
  function removeOption(i) { onChange({ ...q, options: q.options.filter((_,idx)=>idx!==i) }); }
  function setOption(i, field, val) {
    const opts = [...(q.options||[])];
    opts[i] = { ...opts[i], [field]: val };
    if (type === 'multiple_single' && field === 'is_correct' && val)
      opts.forEach((o,idx) => { if (idx!==i) opts[idx] = {...o, is_correct: false}; });
    onChange({ ...q, options: opts });
  }

  function addPair() { onChange({ ...q, pairs: [...(q.pairs||[]), { left: '', right: '' }] }); }
  function removePair(i) { onChange({ ...q, pairs: q.pairs.filter((_,idx)=>idx!==i) }); }
  function setPair(i, field, val) {
    const pairs = [...(q.pairs||[])]; pairs[i] = {...pairs[i], [field]: val};
    onChange({ ...q, pairs });
  }

  function addOrderItem() { onChange({ ...q, orderItems: [...(q.orderItems||[]), { text: '' }] }); }
  function removeOrderItem(i) { onChange({ ...q, orderItems: q.orderItems.filter((_,idx)=>idx!==i) }); }
  function setOrderItem(i, val) {
    const items = [...(q.orderItems||[])]; items[i] = { text: val };
    onChange({ ...q, orderItems: items });
  }

  function getRelPos(e) {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }
  function handleMouseDown(e) { const pos = getRelPos(e); setDrawing(true); setStartPos(pos); }
  function handleMouseMove(e) {
    if (!drawing || !startPos) return;
    const pos = getRelPos(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x), y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x), height: Math.abs(pos.y - startPos.y)
    });
  }
  function handleMouseUp() {
    if (currentRect && currentRect.width > 1 && currentRect.height > 1)
      onChange({ ...q, zones: [...(q.zones||[]), currentRect] });
    setDrawing(false); setStartPos(null); setCurrentRect(null);
  }
  function removeZone(i) { onChange({ ...q, zones: q.zones.filter((_,idx)=>idx!==i) }); }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tipo de pregunta</label>
        <div className="grid grid-cols-2 gap-1.5">
          {QUESTION_TYPES.map(t => (
            <button key={t.id} type="button"
              onClick={() => onChange({ ...q, type: t.id, options: [], pairs: [], orderItems: [], zones: [], image_url: '', audio_url: '' })}
              className="px-3 py-2 rounded-xl text-xs font-medium text-left"
              style={{ background: type===t.id?'#7c6af720':'#0f0f13', color: type===t.id?'#7c6af7':'#9090a8', border:`1px solid ${type===t.id?'#7c6af7':'#333344'}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Pregunta</label>
        <textarea value={q.question||''} rows={3}
          onChange={e => onChange({...q, question: e.target.value})}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
      </div>

      {isAudioType && (
        <Input label="URL de audio (Google Drive)" value={q.audio_url||''}
          placeholder="https://drive.google.com/file/d/..."
          onChange={e => onChange({...q, audio_url: e.target.value})} />
      )}

      {isImageType && (
        <div className="flex flex-col gap-2">
          <Input label="URL de imagen (Google Drive)" value={q.image_url||''}
            placeholder="https://drive.google.com/file/d/..."
            onChange={e => onChange({...q, image_url: e.target.value, zones: []})} />
          {q.image_url && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium" style={{ color: '#9090a8' }}>
                {type==='image_single' ? 'Dibuja UNA zona correcta' : 'Dibuja las zonas correctas'} — arrastra sobre la imagen:
              </p>
              <div className="relative select-none rounded-xl overflow-hidden"
                style={{ cursor: 'crosshair' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}>
                <img
                  ref={imageRef}
                  src={toImageUrl(q.image_url)}
                  alt="pregunta"
                  className="w-full rounded-xl"
                  draggable={false}
                  onError={ev => { ev.target.src = q.image_url; }}
                />
                {(q.zones||[]).map((zone, i) => (
                  <div key={i} className="absolute rounded"
                    onClick={() => removeZone(i)}
                    style={{ left:`${zone.x}%`, top:`${zone.y}%`, width:`${zone.width}%`, height:`${zone.height}%`, background:'#4ade8040', border:'2px solid #4ade80', cursor:'pointer' }}>
                    <span className="absolute -top-4 right-0 text-xs px-1 rounded"
                      style={{ background:'#f75c6a', color:'white' }}>✕</span>
                  </div>
                ))}
                {currentRect && (
                  <div className="absolute rounded pointer-events-none"
                    style={{ left:`${currentRect.x}%`, top:`${currentRect.y}%`, width:`${currentRect.width}%`, height:`${currentRect.height}%`, background:'#7c6af740', border:'2px dashed #7c6af7' }} />
                )}
              </div>
              <p className="text-xs" style={{ color:'#5a5a70' }}>
                Click en zona verde para eliminarla · {(q.zones||[]).length} zona{(q.zones||[]).length!==1?'s':''} definida{(q.zones||[]).length!==1?'s':''}
              </p>
            </div>
          )}
        </div>
      )}

      {hasOptions && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color:'#9090a8' }}>
            Opciones {isAudioType?'(respuestas para el audio)':''}
          </label>
          {(q.options||[]).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button type="button" onClick={() => setOption(i,'is_correct',!opt.is_correct)}
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                style={{ background: opt.is_correct?'#4ade80':'#2a2a38', border:`1px solid ${opt.is_correct?'#4ade80':'#333344'}` }}>
                {opt.is_correct && <span className="text-xs font-bold" style={{ color:'#000' }}>✓</span>}
              </button>
              <input value={opt.text} onChange={e => setOption(i,'text',e.target.value)}
                placeholder={`Opción ${i+1}`}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background:'#0f0f13', border:'1px solid #333344', color:'#e8e8f0' }} />
              <button type="button" onClick={() => removeOption(i)} style={{ color:'#f75c6a' }}>✕</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={addOption}><MdAdd /> Agregar opción</Button>
        </div>
      )}

      {type==='true_false' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color:'#9090a8' }}>Respuesta correcta</label>
          <div className="flex gap-3">
            {['Verdadero','Falso'].map(val => (
              <button key={val} type="button"
                onClick={() => onChange({...q, options:[{text:'Verdadero',is_correct:val==='Verdadero'},{text:'Falso',is_correct:val==='Falso'}]})}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: q.options?.find(o=>o.text===val)?.is_correct?(val==='Verdadero'?'#4ade8020':'#f75c6a20'):'#0f0f13',
                  color: q.options?.find(o=>o.text===val)?.is_correct?(val==='Verdadero'?'#4ade80':'#f75c6a'):'#9090a8',
                  border:`1px solid ${q.options?.find(o=>o.text===val)?.is_correct?(val==='Verdadero'?'#4ade80':'#f75c6a'):'#333344'}`,
                }}>
                {val==='Verdadero'?'✓ Verdadero':'✗ Falso'}
              </button>
            ))}
          </div>
        </div>
      )}

      {type==='fill_blank' && (
        <div className="flex flex-col gap-2">
          <Input label="Respuesta correcta" value={q.options?.[0]?.text||''}
            placeholder="Escribe la respuesta correcta"
            onChange={e => onChange({...q, options:[{text:e.target.value, is_correct:true}]})} />
          <p className="text-xs" style={{ color:'#5a5a70' }}>Usa ___ en la pregunta para indicar el espacio en blanco</p>
        </div>
      )}

      {type==='match' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color:'#9090a8' }}>Pares (izquierda ↔ derecha)</label>
          {(q.pairs||[]).map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={pair.left} onChange={e => setPair(i,'left',e.target.value)} placeholder="Izquierda"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background:'#0f0f13', border:'1px solid #333344', color:'#e8e8f0' }} />
              <span style={{ color:'#5a5a70' }}>↔</span>
              <input value={pair.right} onChange={e => setPair(i,'right',e.target.value)} placeholder="Derecha"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background:'#0f0f13', border:'1px solid #333344', color:'#e8e8f0' }} />
              <button type="button" onClick={() => removePair(i)} style={{ color:'#f75c6a' }}>✕</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={addPair}><MdAdd /> Agregar par</Button>
        </div>
      )}

      {type==='order' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color:'#9090a8' }}>Elementos en el orden correcto</label>
          {(q.orderItems||[]).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-5 text-center font-bold" style={{ color:'#7c6af7' }}>{i+1}</span>
              <input value={item.text} onChange={e => setOrderItem(i,e.target.value)}
                placeholder={`Elemento ${i+1}`}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background:'#0f0f13', border:'1px solid #333344', color:'#e8e8f0' }} />
              <button type="button" onClick={() => removeOrderItem(i)} style={{ color:'#f75c6a' }}>✕</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={addOrderItem}><MdAdd /> Agregar elemento</Button>
          <p className="text-xs" style={{ color:'#5a5a70' }}>El orden en que los escribes es el orden correcto</p>
        </div>
      )}
    </div>
  );
}

export default function EvaluationQuestions() {
  const { evaluationId } = useParams();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [formQ, setFormQ] = useState({
    type: 'multiple_single', question: '',
    options: [], pairs: [], orderItems: [], zones: [],
    image_url: '', audio_url: ''
  });

  async function load() {
    const [ev, qs] = await Promise.all([getEvaluation(evaluationId), getQuestions(evaluationId)]);
    setEvaluation(ev);
    setQuestions(qs.map(q => ({
      ...q,
      options: q.question_options || [],
      pairs: q.question_pairs?.map(p => ({ left: p.left_text, right: p.right_text })) || [],
      orderItems: q.question_order_items?.map(i => ({ text: i.text })) || [],
      zones: q.question_zones || [],
    })));
  }

  useEffect(() => { load(); }, [evaluationId]);

  async function handleSave() {
    if (!formQ.question.trim()) { toast.error('Escribe la pregunta'); return; }
    try {
      let qId;
      if (editingQ) {
        await updateQuestion(editingQ.id, {
          type: formQ.type, question: formQ.question,
          image_url: formQ.image_url || null,
          audio_url: formQ.audio_url || null
        });
        qId = editingQ.id;
      } else {
        const nq = await createQuestion({
          evaluation_id: evaluationId, type: formQ.type,
          question: formQ.question,
          image_url: formQ.image_url || null,
          audio_url: formQ.audio_url || null,
          order_index: questions.length
        });
        qId = nq.id;
      }
      if (['multiple_single','multiple_many','true_false','fill_blank','audio'].includes(formQ.type))
        await saveOptions(qId, formQ.options);
      if (formQ.type==='match') await savePairs(qId, formQ.pairs);
      if (formQ.type==='order') await saveOrderItems(qId, formQ.orderItems);
      if (['image_single','image_multiple'].includes(formQ.type)) await saveZones(qId, formQ.zones);
      toast.success(editingQ?'Pregunta actualizada':'Pregunta creada');
      setShowForm(false); setEditingQ(null);
      setFormQ({ type:'multiple_single', question:'', options:[], pairs:[], orderItems:[], zones:[], image_url:'', audio_url:'' });
      load();
    } catch { toast.error('Error al guardar pregunta'); }
  }

  async function handleDelete(q) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    try { await deleteQuestion(q.id); toast.success('Eliminada'); load(); }
    catch { toast.error('Error al eliminar'); }
  }

  function openEdit(q) { setEditingQ(q); setFormQ({...q}); setShowForm(true); }
  function getTypeName(type) { return QUESTION_TYPES.find(t=>t.id===type)?.label||type; }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.push('/admin/evaluations')}
        className="flex items-center gap-1 text-sm mb-4" style={{ color:'#9090a8' }}>
        <MdChevronLeft /> Volver al banco
      </button>

      {evaluation && (
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-white">{evaluation.title}</h1>
          <p className="text-sm mt-1" style={{ color:'#5a5a70' }}>
            {questions.length} preguntas ·{' '}
            {evaluation.max_attempts===999?'Intentos ilimitados':`${evaluation.max_attempts} intento${evaluation.max_attempts!==1?'s':''}`}
            {evaluation.time_limit&&` · ⏱ ${evaluation.time_limit} min`}
            {evaluation.random_order&&' · 🔀 Orden aleatorio'}
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={() => {
          setEditingQ(null);
          setFormQ({ type:'multiple_single', question:'', options:[], pairs:[], orderItems:[], zones:[], image_url:'', audio_url:'' });
          setShowForm(true);
        }}>
          <MdAdd /> Nueva pregunta
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {questions.length===0 ? (
          <Card><p className="text-center py-12" style={{ color:'#5a5a70' }}>No hay preguntas todavía.</p></Card>
        ) : questions.map((q,i) => (
          <Card key={q.id}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background:'#7c6af720', color:'#7c6af7' }}>{i+1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:'#7c6af720', color:'#7c6af7' }}>
                    {getTypeName(q.type)}
                  </span>
                  {q.audio_url&&<span className="text-xs" style={{ color:'#5a5a70' }}>🎵 Audio</span>}
                  {q.image_url&&<span className="text-xs" style={{ color:'#5a5a70' }}>🖼 Imagen</span>}
                </div>
                <p className="text-sm text-white">{q.question}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(q)}><MdEdit /></Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(q)}><MdDelete /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title={editingQ?'Editar pregunta':'Nueva pregunta'} size="lg">
        <div className="flex flex-col gap-4">
          <QuestionForm q={formQ} onChange={setFormQ} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave}>
              {editingQ?'Guardar cambios':'Crear pregunta'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
