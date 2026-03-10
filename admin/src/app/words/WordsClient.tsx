'use client';

import { useState } from 'react';
import { getGameDate } from '@/lib/gameDate';
import { addWord, updateWord, deleteWord, bulkUploadWords } from './actions';

interface Word {
  id: string;
  word: string;
  date: string;
  category: string;
  language: string;
}

const CATEGORIES = ['general', 'nature', 'life', 'abstract', 'food', 'emotion', 'objects', 'modern', 'science', 'people', 'places', 'action', 'animal', 'body', 'weather', 'music', 'sports', 'technology'];
const CATEGORIES_ES = ['general', 'naturaleza', 'vida', 'abstracto', 'comida', 'emoci\u00F3n', 'objetos', 'moderno', 'ciencia', 'personas', 'lugares', 'acci\u00F3n', 'animal', 'cuerpo', 'clima', 'm\u00FAsica', 'deportes', 'tecnolog\u00EDa'];

export function WordsClient({ words }: { words: Word[] }) {
  const [view, setView] = useState<'calendar' | 'list' | 'bulk'>('calendar');
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [bulkResult, setBulkResult] = useState('');
  const [error, setError] = useState('');

  const filteredWords = words.filter((w) => (w.language || 'en') === lang);
  const wordsByDate = new Map(filteredWords.map((w) => [w.date, w]));

  // Calendar helpers
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const today = getGameDate();
  const monthName = new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCalMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  // Count stats
  const futureWords = filteredWords.filter((w) => w.date >= today).length;
  const totalWords = filteredWords.length;
  const gapDays = (() => {
    let gaps = 0;
    const d = new Date(today);
    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (!wordsByDate.has(dateStr)) gaps++;
      d.setDate(d.getDate() + 1);
    }
    return gaps;
  })();

  const categories = lang === 'es' ? CATEGORIES_ES : CATEGORIES;

  async function handleBulk(formData: FormData) {
    setError('');
    setBulkResult('');
    try {
      const result = await bulkUploadWords(formData);
      setBulkResult(`Successfully uploaded ${result.count} words!`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleAdd(formData: FormData) {
    setError('');
    try {
      await addWord(formData);
      setShowAdd(false);
      setSelectedDate('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleUpdate(formData: FormData) {
    setError('');
    try {
      await updateWord(formData);
      setEditingWord(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(formData: FormData) {
    if (!confirm('Delete this word? This will also delete all descriptions and votes for it.')) return;
    setError('');
    try {
      await deleteWord(formData);
      setEditingWord(null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="flex-between mb-6">
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Words</h1>
        <div className="flex gap-2">
          {/* Language toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 8, padding: 2 }}>
            <button
              className={`btn ${lang === 'en' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: 13 }}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              className={`btn ${lang === 'es' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: 13 }}
              onClick={() => setLang('es')}
            >
              Espa&ntilde;ol
            </button>
          </div>
          <button className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('calendar')}>Calendar</button>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button className={`btn ${view === 'bulk' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('bulk')}>Bulk Upload</button>
          <button className="btn btn-success" onClick={() => { setShowAdd(true); setSelectedDate(''); }}>+ Add Word</button>
        </div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="label">Total Words ({lang.toUpperCase()})</div>
          <div className="value">{totalWords}</div>
        </div>
        <div className="stat-card">
          <div className="label">Future Words</div>
          <div className="value">{futureWords}</div>
        </div>
        <div className="stat-card">
          <div className="label">Gaps (Next 30 Days)</div>
          <div className="value" style={{ color: gapDays > 0 ? 'var(--danger)' : 'var(--success)' }}>{gapDays}</div>
        </div>
      </div>

      {error && <div style={{ background: '#ef444422', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {/* Add/Edit Modal */}
      {(showAdd || editingWord) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setEditingWord(null); } }}>
          <div className="card" style={{ width: 440 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>{editingWord ? 'Edit Word' : 'Add Word'}</h2>
            <form action={editingWord ? handleUpdate : handleAdd}>
              {editingWord && <input type="hidden" name="id" value={editingWord.id} />}
              <input type="hidden" name="language" value={editingWord?.language || lang} />
              <div className="form-group">
                <label>Word</label>
                <input name="word" defaultValue={editingWord?.word || ''} placeholder="e.g. SUNSET" required autoFocus />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" defaultValue={editingWord?.date || selectedDate || ''} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" defaultValue={editingWord?.category || 'general'}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select name="language" defaultValue={editingWord?.language || lang}>
                  <option value="en">English</option>
                  <option value="es">Espa&ntilde;ol</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">{editingWord ? 'Save Changes' : 'Add Word'}</button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowAdd(false); setEditingWord(null); }}>Cancel</button>
                {editingWord && (
                  <form action={handleDelete} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="id" value={editingWord.id} />
                    <button type="submit" className="btn btn-danger">Delete</button>
                  </form>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="card">
          <div className="flex-between mb-4">
            <button className="btn btn-outline" onClick={prevMonth}>&larr;</button>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>{monthName}</h2>
            <button className="btn btn-outline" onClick={nextMonth}>&rarr;</button>
          </div>
          <div className="calendar-grid mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const word = wordsByDate.get(dateStr);
              const isToday = dateStr === today;
              return (
                <div
                  key={day}
                  className={`calendar-day ${word ? 'has-word' : 'no-word'} ${isToday ? 'today' : ''}`}
                  onClick={() => {
                    if (word) {
                      setEditingWord(word);
                    } else {
                      setSelectedDate(dateStr);
                      setShowAdd(true);
                    }
                  }}
                >
                  <span className="day-num">{day}</span>
                  {word && <span className="day-word">{word.word}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 3, marginRight: 4, verticalAlign: 'middle' }} /> Has word
            <span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--surface-2)', borderRadius: 3, marginLeft: 16, marginRight: 4, verticalAlign: 'middle' }} /> Empty
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '1px solid var(--accent)', borderRadius: 3, marginLeft: 16, marginRight: 4, verticalAlign: 'middle' }} /> Today
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Word</th><th>Category</th><th>Lang</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredWords.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 700, letterSpacing: 2 }}>{w.word}</td>
                  <td><span className="badge badge-muted">{w.category}</span></td>
                  <td><span className="badge badge-muted">{(w.language || 'en').toUpperCase()}</span></td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditingWord(w)}>Edit</button>
                  </td>
                </tr>
              ))}
              {filteredWords.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No words yet. Add some!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Upload View */}
      {view === 'bulk' && (
        <div className="card">
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Bulk Upload Words</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
            Paste a JSON array of words. Each entry needs &quot;word&quot;, &quot;date&quot; (YYYY-MM-DD), optionally &quot;category&quot; and &quot;language&quot; (en/es).
            Existing date+language pairs will be updated (upsert).
          </p>
          <form action={handleBulk}>
            <div className="form-group">
              <label>JSON Data</label>
              <textarea
                name="words"
                rows={16}
                placeholder={`[\n  { "word": "SUNSET", "date": "2026-03-06", "category": "nature", "language": "en" },\n  { "word": "ATARDECER", "date": "2026-03-06", "category": "naturaleza", "language": "es" }\n]`}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Upload Words</button>
          </form>
          {bulkResult && <div style={{ marginTop: 16, background: '#22c55e22', color: 'var(--success)', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{bulkResult}</div>}

          <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Generate a Year of Words (EN + ES)</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
              Click below to generate 365 bilingual word pairs starting from tomorrow. Each date gets one English word and one thematically matched Spanish word. Copy the output and paste it into the box above.
            </p>
            <button type="button" className="btn btn-outline" onClick={() => {
              const wordBank = generateBilingualWordBank();
              const textarea = document.querySelector('textarea[name="words"]') as HTMLTextAreaElement;
              if (textarea) textarea.value = JSON.stringify(wordBank, null, 2);
            }}>
              Generate Year of Bilingual Word Pairs
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function generateBilingualWordBank() {
  // Each entry: [english word, spanish word, en category, es category]
  const wordPairs: Array<[string, string, string, string]> = [
    // nature / naturaleza (40)
    ['SUNSET', 'ATARDECER', 'nature', 'naturaleza'], ['OCEAN', 'OC\u00C9ANO', 'nature', 'naturaleza'], ['MOUNTAIN', 'MONTA\u00D1A', 'nature', 'naturaleza'], ['FOREST', 'BOSQUE', 'nature', 'naturaleza'], ['RIVER', 'R\u00CDO', 'nature', 'naturaleza'], ['STORM', 'TORMENTA', 'nature', 'naturaleza'], ['THUNDER', 'TRUENO', 'nature', 'naturaleza'], ['RAINBOW', 'ARCO\u00CDRIS', 'nature', 'naturaleza'], ['DESERT', 'DESIERTO', 'nature', 'naturaleza'], ['VOLCANO', 'VOLC\u00C1N', 'nature', 'naturaleza'], ['WATERFALL', 'CASCADA', 'nature', 'naturaleza'], ['MEADOW', 'PRADERA', 'nature', 'naturaleza'], ['GLACIER', 'GLACIAR', 'nature', 'naturaleza'], ['CANYON', 'CA\u00D1\u00D3N', 'nature', 'naturaleza'], ['AURORA', 'AURORA', 'nature', 'naturaleza'], ['BREEZE', 'BRISA', 'nature', 'naturaleza'], ['DAWN', 'AMANECER', 'nature', 'naturaleza'], ['DUSK', 'CREP\u00DASCULO', 'nature', 'naturaleza'], ['FROST', 'ESCARCHA', 'nature', 'naturaleza'], ['BLOSSOM', 'FLOR', 'nature', 'naturaleza'], ['CORAL', 'CORAL', 'nature', 'naturaleza'], ['TIDE', 'MAREA', 'nature', 'naturaleza'], ['MIST', 'NIEBLA', 'nature', 'naturaleza'], ['SNOW', 'NIEVE', 'nature', 'naturaleza'], ['ISLAND', 'ISLA', 'nature', 'naturaleza'], ['JUNGLE', 'SELVA', 'nature', 'naturaleza'], ['CAVE', 'CUEVA', 'nature', 'naturaleza'], ['ICE', 'HIELO', 'nature', 'naturaleza'], ['MOON', 'LUNA', 'nature', 'naturaleza'], ['SHADOW', 'SOMBRA', 'nature', 'naturaleza'], ['HORIZON', 'HORIZONTE', 'nature', 'naturaleza'], ['CLIFF', 'ACANTILADO', 'nature', 'naturaleza'], ['LIGHTNING', 'REL\u00C1MPAGO', 'nature', 'naturaleza'], ['OASIS', 'OASIS', 'nature', 'naturaleza'], ['SEED', 'SEMILLA', 'nature', 'naturaleza'], ['DUNE', 'DUNA', 'nature', 'naturaleza'], ['CREEK', 'ARROYO', 'nature', 'naturaleza'], ['PEBBLE', 'GUIJARRO', 'nature', 'naturaleza'], ['ROOT', 'RA\u00CDZ', 'nature', 'naturaleza'], ['SPRING', 'PRIMAVERA', 'nature', 'naturaleza'],
    // emotion / emoci\u00F3n (38)
    ['JEALOUSY', 'CELOS', 'emotion', 'emoci\u00F3n'], ['NOSTALGIA', 'NOSTALGIA', 'emotion', 'emoci\u00F3n'], ['REGRET', 'ARREPENTIMIENTO', 'emotion', 'emoci\u00F3n'], ['HOPE', 'ESPERANZA', 'emotion', 'emoci\u00F3n'], ['ANGER', 'IRA', 'emotion', 'emoci\u00F3n'], ['JOY', 'ALEGR\u00CDA', 'emotion', 'emoci\u00F3n'], ['FEAR', 'MIEDO', 'emotion', 'emoci\u00F3n'], ['LOVE', 'AMOR', 'emotion', 'emoci\u00F3n'], ['GRIEF', 'DUELO', 'emotion', 'emoci\u00F3n'], ['PRIDE', 'ORGULLO', 'emotion', 'emoci\u00F3n'], ['SHAME', 'VERG\u00DCENZA', 'emotion', 'emoci\u00F3n'], ['BLISS', 'DICHA', 'emotion', 'emoci\u00F3n'], ['ANXIETY', 'ANSIEDAD', 'emotion', 'emoci\u00F3n'], ['PEACE', 'PAZ', 'emotion', 'emoci\u00F3n'], ['COURAGE', 'CORAJE', 'emotion', 'emoci\u00F3n'], ['LONGING', 'A\u00D1ORANZA', 'emotion', 'emoci\u00F3n'], ['WONDER', 'ASOMBRO', 'emotion', 'emoci\u00F3n'], ['GUILT', 'CULPA', 'emotion', 'emoci\u00F3n'], ['DESIRE', 'DESEO', 'emotion', 'emoci\u00F3n'], ['PATIENCE', 'PACIENCIA', 'emotion', 'emoci\u00F3n'], ['PANIC', 'P\u00C1NICO', 'emotion', 'emoci\u00F3n'], ['RELIEF', 'ALIVIO', 'emotion', 'emoci\u00F3n'], ['SORROW', 'PENA', 'emotion', 'emoci\u00F3n'], ['TRUST', 'CONFIANZA', 'emotion', 'emoci\u00F3n'], ['DOUBT', 'DUDA', 'emotion', 'emoci\u00F3n'], ['AWE', 'ADMIRACI\u00D3N', 'emotion', 'emoci\u00F3n'], ['BOREDOM', 'ABURRIMIENTO', 'emotion', 'emoci\u00F3n'], ['FURY', 'FURIA', 'emotion', 'emoci\u00F3n'], ['LONELINESS', 'SOLEDAD', 'emotion', 'emoci\u00F3n'], ['CURIOSITY', 'CURIOSIDAD', 'emotion', 'emoci\u00F3n'], ['EMPATHY', 'EMPAT\u00CDA', 'emotion', 'emoci\u00F3n'], ['MELANCHOLY', 'MELANC\u00D3LIA', 'emotion', 'emoci\u00F3n'], ['EUPHORIA', 'EUFORIA', 'emotion', 'emoci\u00F3n'], ['ENVY', 'ENVIDIA', 'emotion', 'emoci\u00F3n'], ['COMPASSION', 'COMPASI\u00D3N', 'emotion', 'emoci\u00F3n'], ['GRATITUDE', 'GRATITUD', 'emotion', 'emoci\u00F3n'], ['FRUSTRATION', 'FRUSTRACI\u00D3N', 'emotion', 'emoci\u00F3n'], ['TENDERNESS', 'TERNURA', 'emotion', 'emoci\u00F3n'],
    // abstract / abstracto (37)
    ['SILENCE', 'SILENCIO', 'abstract', 'abstracto'], ['CHILDHOOD', 'INFANCIA', 'abstract', 'abstracto'], ['HOME', 'HOGAR', 'abstract', 'abstracto'], ['FREEDOM', 'LIBERTAD', 'abstract', 'abstracto'], ['TIME', 'TIEMPO', 'abstract', 'abstracto'], ['TRUTH', 'VERDAD', 'abstract', 'abstracto'], ['JUSTICE', 'JUSTICIA', 'abstract', 'abstracto'], ['FATE', 'DESTINO', 'abstract', 'abstracto'], ['LUCK', 'SUERTE', 'abstract', 'abstracto'], ['CHAOS', 'CAOS', 'abstract', 'abstracto'], ['DREAM', 'SUE\u00D1O', 'abstract', 'abstracto'], ['MEMORY', 'MEMORIA', 'abstract', 'abstracto'], ['POWER', 'PODER', 'abstract', 'abstracto'], ['BEAUTY', 'BELLEZA', 'abstract', 'abstracto'], ['DEATH', 'MUERTE', 'abstract', 'abstracto'], ['LIFE', 'VIDA', 'abstract', 'abstracto'], ['WISDOM', 'SABIDUR\u00CDA', 'abstract', 'abstracto'], ['CHANGE', 'CAMBIO', 'abstract', 'abstracto'], ['SOUL', 'ALMA', 'abstract', 'abstracto'], ['LIGHT', 'LUZ', 'abstract', 'abstracto'], ['ETERNITY', 'ETERNIDAD', 'abstract', 'abstracto'], ['BALANCE', 'EQUILIBRIO', 'abstract', 'abstracto'], ['LEGACY', 'LEGADO', 'abstract', 'abstracto'], ['PURPOSE', 'PROP\u00D3SITO', 'abstract', 'abstracto'], ['RISK', 'RIESGO', 'abstract', 'abstracto'], ['MAGIC', 'MAGIA', 'abstract', 'abstracto'], ['REVENGE', 'VENGANZA', 'abstract', 'abstracto'], ['IRONY', 'IRON\u00CDA', 'abstract', 'abstracto'], ['PARADOX', 'PARADOJA', 'abstract', 'abstracto'], ['INNOCENCE', 'INOCENCIA', 'abstract', 'abstracto'], ['KARMA', 'KARMA', 'abstract', 'abstracto'], ['MYSTERY', 'MISTERIO', 'abstract', 'abstracto'], ['HONOR', 'HONOR', 'abstract', 'abstracto'], ['LOYALTY', 'LEALTAD', 'abstract', 'abstracto'], ['FAITH', 'FE', 'abstract', 'abstracto'], ['IDENTITY', 'IDENTIDAD', 'abstract', 'abstracto'], ['ILLUSION', 'ILUSI\u00D3N', 'abstract', 'abstracto'],
    // food / comida (35)
    ['PIZZA', 'PIZZA', 'food', 'comida'], ['COFFEE', 'CAF\u00C9', 'food', 'comida'], ['CHOCOLATE', 'CHOCOLATE', 'food', 'comida'], ['BREAD', 'PAN', 'food', 'comida'], ['CHEESE', 'QUESO', 'food', 'comida'], ['BACON', 'TOCINO', 'food', 'comida'], ['TACO', 'TACO', 'food', 'comida'], ['PASTA', 'PASTA', 'food', 'comida'], ['HONEY', 'MIEL', 'food', 'comida'], ['AVOCADO', 'AGUACATE', 'food', 'comida'], ['MANGO', 'MANGO', 'food', 'comida'], ['STEAK', 'BISTEC', 'food', 'comida'], ['SOUP', 'SOPA', 'food', 'comida'], ['CAKE', 'PASTEL', 'food', 'comida'], ['BUTTER', 'MANTEQUILLA', 'food', 'comida'], ['TOAST', 'TOSTADA', 'food', 'comida'], ['SALAD', 'ENSALADA', 'food', 'comida'], ['GARLIC', 'AJO', 'food', 'comida'], ['LEMON', 'LIM\u00D3N', 'food', 'comida'], ['SPICE', 'ESPECIA', 'food', 'comida'], ['CANDY', 'DULCE', 'food', 'comida'], ['COOKIE', 'GALLETA', 'food', 'comida'], ['BREAKFAST', 'DESAYUNO', 'food', 'comida'], ['WINE', 'VINO', 'food', 'comida'], ['SALT', 'SAL', 'food', 'comida'], ['SUSHI', 'SUSHI', 'food', 'comida'], ['HUNGER', 'HAMBRE', 'food', 'comida'], ['ICE CREAM', 'HELADO', 'food', 'comida'], ['RICE', 'ARROZ', 'food', 'comida'], ['PEPPER', 'PIMIENTA', 'food', 'comida'], ['OLIVE', 'ACEITUNA', 'food', 'comida'], ['CINNAMON', 'CANELA', 'food', 'comida'], ['STRAWBERRY', 'FRESA', 'food', 'comida'], ['TEA', 'T\u00C9', 'food', 'comida'], ['VANILLA', 'VAINILLA', 'food', 'comida'],
    // life / vida (32)
    ['MONDAY', 'LUNES', 'life', 'vida'], ['FRIDAY', 'VIERNES', 'life', 'vida'], ['MORNING', 'MA\u00D1ANA', 'life', 'vida'], ['WEDDING', 'BODA', 'life', 'vida'], ['BIRTHDAY', 'CUMPLEA\u00D1OS', 'life', 'vida'], ['VACATION', 'VACACIONES', 'life', 'vida'], ['SCHOOL', 'ESCUELA', 'life', 'vida'], ['WORK', 'TRABAJO', 'life', 'vida'], ['MONEY', 'DINERO', 'life', 'vida'], ['TRAFFIC', 'TR\u00C1FICO', 'life', 'vida'], ['SLEEP', 'SUE\u00D1O', 'life', 'vida'], ['FAMILY', 'FAMILIA', 'life', 'vida'], ['DATING', 'CITAS', 'life', 'vida'], ['WEEKEND', 'FIN DE SEMANA', 'life', 'vida'], ['ALARM', 'ALARMA', 'life', 'vida'], ['DEADLINE', 'FECHA L\u00CDMITE', 'life', 'vida'], ['PARTY', 'FIESTA', 'life', 'vida'], ['GOSSIP', 'CHISME', 'life', 'vida'], ['COMMUTE', 'TRAYECTO', 'life', 'vida'], ['LAUNDRY', 'COLADA', 'life', 'vida'], ['PAYCHECK', 'N\u00D3MINA', 'life', 'vida'], ['RETIREMENT', 'JUBILACI\u00D3N', 'life', 'vida'], ['HOMEWORK', 'DEBERES', 'life', 'vida'], ['ROUTINE', 'RUTINA', 'life', 'vida'], ['RENT', 'ALQUILER', 'life', 'vida'], ['DIVORCE', 'DIVORCIO', 'life', 'vida'], ['INTERVIEW', 'ENTREVISTA', 'life', 'vida'], ['MOVING', 'MUDANZA', 'life', 'vida'], ['PROMOTION', 'ASCENSO', 'life', 'vida'], ['SIESTA', 'SIESTA', 'life', 'vida'], ['GRADUATION', 'GRADUACI\u00D3N', 'life', 'vida'], ['TAX', 'IMPUESTO', 'life', 'vida'],
    // objects / objetos (33)
    ['KEYS', 'LLAVES', 'objects', 'objetos'], ['MIRROR', 'ESPEJO', 'objects', 'objetos'], ['PHONE', 'TEL\u00C9FONO', 'objects', 'objetos'], ['PILLOW', 'ALMOHADA', 'objects', 'objetos'], ['UMBRELLA', 'PARAGUAS', 'objects', 'objetos'], ['WALLET', 'CARTERA', 'objects', 'objetos'], ['CLOCK', 'RELOJ', 'objects', 'objetos'], ['DOOR', 'PUERTA', 'objects', 'objetos'], ['WINDOW', 'VENTANA', 'objects', 'objetos'], ['CANDLE', 'VELA', 'objects', 'objetos'], ['BOOK', 'LIBRO', 'objects', 'objetos'], ['BRIDGE', 'PUENTE', 'objects', 'objetos'], ['COIN', 'MONEDA', 'objects', 'objetos'], ['MASK', 'M\u00C1SCARA', 'objects', 'objetos'], ['CROWN', 'CORONA', 'objects', 'objetos'], ['SWORD', 'ESPADA', 'objects', 'objetos'], ['BELL', 'CAMPANA', 'objects', 'objetos'], ['FLAG', 'BANDERA', 'objects', 'objetos'], ['LAMP', 'L\u00C1MPARA', 'objects', 'objetos'], ['TROPHY', 'TROFEO', 'objects', 'objetos'], ['BALLOON', 'GLOBO', 'objects', 'objetos'], ['PASSPORT', 'PASAPORTE', 'objects', 'objetos'], ['HEADPHONES', 'AURICULARES', 'objects', 'objetos'], ['STAIRS', 'ESCALERAS', 'objects', 'objetos'], ['PEN', 'BOL\u00CDGRAFO', 'objects', 'objetos'], ['COMPASS', 'BR\u00DAJULA', 'objects', 'objetos'], ['SCISSORS', 'TIJERAS', 'objects', 'objetos'], ['NEEDLE', 'AGUJA', 'objects', 'objetos'], ['ROPE', 'CUERDA', 'objects', 'objetos'], ['BLANKET', 'MANTA', 'objects', 'objetos'], ['GLASSES', 'GAFAS', 'objects', 'objetos'], ['CHAIN', 'CADENA', 'objects', 'objetos'], ['HAMMER', 'MARTILLO', 'objects', 'objetos'],
    // modern / moderno (28)
    ['WIFI', 'WIFI', 'modern', 'moderno'], ['PASSWORD', 'CONTRASE\u00D1A', 'modern', 'moderno'], ['SELFIE', 'SELFIE', 'modern', 'moderno'], ['EMOJI', 'EMOJI', 'modern', 'moderno'], ['ALGORITHM', 'ALGORITMO', 'modern', 'moderno'], ['INFLUENCER', 'INFLUENCER', 'modern', 'moderno'], ['PODCAST', 'PODCAST', 'modern', 'moderno'], ['MEME', 'MEME', 'modern', 'moderno'], ['BITCOIN', 'BITCOIN', 'modern', 'moderno'], ['STREAMING', 'STREAMING', 'modern', 'moderno'], ['STARTUP', 'STARTUP', 'modern', 'moderno'], ['DRONE', 'DRON', 'modern', 'moderno'], ['ROBOT', 'ROBOT', 'modern', 'moderno'], ['VIRAL', 'VIRAL', 'modern', 'moderno'], ['HACKER', 'HACKER', 'modern', 'moderno'], ['NOTIFICATION', 'NOTIFICACI\u00D3N', 'modern', 'moderno'], ['CRYPTOCURRENCY', 'CRIPTOMONEDA', 'modern', 'moderno'], ['AI', 'IA', 'modern', 'moderno'], ['AVATAR', 'AVATAR', 'modern', 'moderno'], ['PLAYLIST', 'PLAYLIST', 'modern', 'moderno'], ['TROLL', 'TROL', 'modern', 'moderno'], ['FILTER', 'FILTRO', 'modern', 'moderno'], ['CLOUD', 'NUBE', 'modern', 'moderno'], ['PIXEL', 'P\u00CDXEL', 'modern', 'moderno'], ['HASHTAG', 'HASHTAG', 'modern', 'moderno'], ['METAVERSE', 'METAVERSO', 'modern', 'moderno'], ['APP', 'APP', 'modern', 'moderno'], ['FIREWALL', 'CORTAFUEGOS', 'modern', 'moderno'],
    // science / ciencia (27)
    ['GRAVITY', 'GRAVEDAD', 'science', 'ciencia'], ['ATOM', '\u00C1TOMO', 'science', 'ciencia'], ['DNA', 'ADN', 'science', 'ciencia'], ['GALAXY', 'GALAXIA', 'science', 'ciencia'], ['EVOLUTION', 'EVOLUCI\u00D3N', 'science', 'ciencia'], ['OXYGEN', 'OX\u00CDGENO', 'science', 'ciencia'], ['ECLIPSE', 'ECLIPSE', 'science', 'ciencia'], ['COMET', 'COMETA', 'science', 'ciencia'], ['VIRUS', 'VIRUS', 'science', 'ciencia'], ['MAGNET', 'IM\u00C1N', 'science', 'ciencia'], ['LASER', 'L\u00C1SER', 'science', 'ciencia'], ['FOSSIL', 'F\u00D3SIL', 'science', 'ciencia'], ['NEURON', 'NEURONA', 'science', 'ciencia'], ['ORBIT', '\u00D3RBITA', 'science', 'ciencia'], ['CRYSTAL', 'CRISTAL', 'science', 'ciencia'], ['VACCINE', 'VACUNA', 'science', 'ciencia'], ['MOLECULE', 'MOL\u00C9CULA', 'science', 'ciencia'], ['TELESCOPE', 'TELESCOPIO', 'science', 'ciencia'], ['INFINITY', 'INFINITO', 'science', 'ciencia'], ['DIMENSION', 'DIMENSI\u00D3N', 'science', 'ciencia'], ['ENERGY', 'ENERG\u00CDA', 'science', 'ciencia'], ['SPACE', 'ESPACIO', 'science', 'ciencia'], ['BRAIN', 'CEREBRO', 'science', 'ciencia'], ['EARTHQUAKE', 'TERREMOTO', 'science', 'ciencia'], ['PHOTON', 'FOT\u00D3N', 'science', 'ciencia'], ['PLASMA', 'PLASMA', 'science', 'ciencia'], ['SPECTRUM', 'ESPECTRO', 'science', 'ciencia'],
    // animal (30)
    ['DOG', 'PERRO', 'animal', 'animal'], ['CAT', 'GATO', 'animal', 'animal'], ['SHARK', 'TIBUR\u00D3N', 'animal', 'animal'], ['EAGLE', '\u00C1GUILA', 'animal', 'animal'], ['SNAKE', 'SERPIENTE', 'animal', 'animal'], ['DOLPHIN', 'DELF\u00CDN', 'animal', 'animal'], ['LION', 'LE\u00D3N', 'animal', 'animal'], ['WOLF', 'LOBO', 'animal', 'animal'], ['BEAR', 'OSO', 'animal', 'animal'], ['OWL', 'B\u00DAHO', 'animal', 'animal'], ['WHALE', 'BALLENA', 'animal', 'animal'], ['PENGUIN', 'PING\u00DCINO', 'animal', 'animal'], ['TIGER', 'TIGRE', 'animal', 'animal'], ['MONKEY', 'MONO', 'animal', 'animal'], ['ELEPHANT', 'ELEFANTE', 'animal', 'animal'], ['RABBIT', 'CONEJO', 'animal', 'animal'], ['TURTLE', 'TORTUGA', 'animal', 'animal'], ['BUTTERFLY', 'MARIPOSA', 'animal', 'animal'], ['OCTOPUS', 'PULPO', 'animal', 'animal'], ['ANT', 'HORMIGA', 'animal', 'animal'], ['SPIDER', 'ARA\u00D1A', 'animal', 'animal'], ['FROG', 'RANA', 'animal', 'animal'], ['PARROT', 'LORO', 'animal', 'animal'], ['FOX', 'ZORRO', 'animal', 'animal'], ['HAWK', 'HALC\u00D3N', 'animal', 'animal'], ['DEER', 'CIERVO', 'animal', 'animal'], ['CROW', 'CUERVO', 'animal', 'animal'], ['BEE', 'ABEJA', 'animal', 'animal'], ['HORSE', 'CABALLO', 'animal', 'animal'], ['SQUID', 'CALAMAR', 'animal', 'animal'],
    // people / personas (29)
    ['TEACHER', 'PROFESOR', 'people', 'personas'], ['STRANGER', 'DESCONOCIDO', 'people', 'personas'], ['HERO', 'H\u00C9ROE', 'people', 'personas'], ['LEADER', 'L\u00CDDER', 'people', 'personas'], ['REBEL', 'REBELDE', 'people', 'personas'], ['ARTIST', 'ARTISTA', 'people', 'personas'], ['DOCTOR', 'M\u00C9DICO', 'people', 'personas'], ['GHOST', 'FANTASMA', 'people', 'personas'], ['CLOWN', 'PAYASO', 'people', 'personas'], ['KING', 'REY', 'people', 'personas'], ['QUEEN', 'REINA', 'people', 'personas'], ['WARRIOR', 'GUERRERO', 'people', 'personas'], ['PIRATE', 'PIRATA', 'people', 'personas'], ['WIZARD', 'MAGO', 'people', 'personas'], ['FRIEND', 'AMIGO', 'people', 'personas'], ['BABY', 'BEB\u00C9', 'people', 'personas'], ['CHEF', 'CHEF', 'people', 'personas'], ['SPY', 'ESP\u00CDA', 'people', 'personas'], ['MOTHER', 'MADRE', 'people', 'personas'], ['BOSS', 'JEFE', 'people', 'personas'], ['CHILD', 'NI\u00D1O', 'people', 'personas'], ['ENEMY', 'ENEMIGO', 'people', 'personas'], ['GRANDMOTHER', 'ABUELA', 'people', 'personas'], ['THIEF', 'LADR\u00D3N', 'people', 'personas'], ['JUDGE', 'JUEZ', 'people', 'personas'], ['SAILOR', 'MARINERO', 'people', 'personas'], ['PRINCESS', 'PRINCESA', 'people', 'personas'], ['STUDENT', 'ESTUDIANTE', 'people', 'personas'], ['NEIGHBOUR', 'VECINO', 'people', 'personas'],
    // places / lugares (28)
    ['AIRPORT', 'AEROPUERTO', 'places', 'lugares'], ['LIBRARY', 'BIBLIOTECA', 'places', 'lugares'], ['HOSPITAL', 'HOSPITAL', 'places', 'lugares'], ['PRISON', 'C\u00C1RCEL', 'places', 'lugares'], ['BEACH', 'PLAYA', 'places', 'lugares'], ['MUSEUM', 'MUSEO', 'places', 'lugares'], ['KITCHEN', 'COCINA', 'places', 'lugares'], ['HIGHWAY', 'AUTOPISTA', 'places', 'lugares'], ['GARDEN', 'JARD\u00CDN', 'places', 'lugares'], ['TEMPLE', 'TEMPLO', 'places', 'lugares'], ['MARKET', 'MERCADO', 'places', 'lugares'], ['HARBOR', 'PUERTO', 'places', 'lugares'], ['CABIN', 'CABA\u00D1A', 'places', 'lugares'], ['GARAGE', 'GARAJE', 'places', 'lugares'], ['TUNNEL', 'T\u00DANEL', 'places', 'lugares'], ['BALCONY', 'BALC\u00D3N', 'places', 'lugares'], ['CEMETERY', 'CEMENTERIO', 'places', 'lugares'], ['GYM', 'GIMNASIO', 'places', 'lugares'], ['BORDER', 'FRONTERA', 'places', 'lugares'], ['ROOFTOP', 'AZOTEA', 'places', 'lugares'], ['BASEMENT', 'S\u00D3TANO', 'places', 'lugares'], ['PALACE', 'PALACIO', 'places', 'lugares'], ['TOWER', 'TORRE', 'places', 'lugares'], ['PLAZA', 'PLAZA', 'places', 'lugares'], ['FARM', 'GRANJA', 'places', 'lugares'], ['ATTIC', '\u00C1TICO', 'places', 'lugares'], ['ALLEY', 'CALLEJ\u00D3N', 'places', 'lugares'], ['STADIUM', 'ESTADIO', 'places', 'lugares'],
    // action / acci\u00F3n (26)
    ['RUNNING', 'CORRER', 'action', 'acci\u00F3n'], ['FALLING', 'CAER', 'action', 'acci\u00F3n'], ['LAUGHING', 'RE\u00CDR', 'action', 'acci\u00F3n'], ['CRYING', 'LLORAR', 'action', 'acci\u00F3n'], ['DANCING', 'BAILAR', 'action', 'acci\u00F3n'], ['FIGHTING', 'PELEAR', 'action', 'acci\u00F3n'], ['FLYING', 'VOLAR', 'action', 'acci\u00F3n'], ['HIDING', 'ESCONDERSE', 'action', 'acci\u00F3n'], ['KISSING', 'BESAR', 'action', 'acci\u00F3n'], ['SLEEPING', 'DORMIR', 'action', 'acci\u00F3n'], ['BURNING', 'QUEMAR', 'action', 'acci\u00F3n'], ['CLIMBING', 'ESCALAR', 'action', 'acci\u00F3n'], ['DIVING', 'BUCEAR', 'action', 'acci\u00F3n'], ['WHISPERING', 'SUSURRAR', 'action', 'acci\u00F3n'], ['PAINTING', 'PINTAR', 'action', 'acci\u00F3n'], ['SINGING', 'CANTAR', 'action', 'acci\u00F3n'], ['FORGIVE', 'PERDONAR', 'action', 'acci\u00F3n'], ['WAITING', 'ESPERAR', 'action', 'acci\u00F3n'], ['LYING', 'MENTIR', 'action', 'acci\u00F3n'], ['ARGUING', 'DISCUTIR', 'action', 'acci\u00F3n'], ['SWIMMING', 'NADAR', 'action', 'acci\u00F3n'], ['DREAMING', 'SO\u00D1AR', 'action', 'acci\u00F3n'], ['TRAVELING', 'VIAJAR', 'action', 'acci\u00F3n'], ['HEALING', 'SANAR', 'action', 'acci\u00F3n'], ['COOKING', 'COCINAR', 'action', 'acci\u00F3n'], ['HUGGING', 'ABRAZAR', 'action', 'acci\u00F3n'],
  ];

  // --- Smart category distribution ---
  // Step 1: Shuffle
  for (let i = wordPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordPairs[i], wordPairs[j]] = [wordPairs[j], wordPairs[i]];
  }

  // Step 2: No two consecutive days with the same category
  for (let i = 1; i < wordPairs.length; i++) {
    if (wordPairs[i][2] === wordPairs[i - 1][2]) {
      // Find the next word with a different category and swap
      for (let j = i + 1; j < wordPairs.length; j++) {
        if (wordPairs[j][2] !== wordPairs[i - 1][2]) {
          [wordPairs[i], wordPairs[j]] = [wordPairs[j], wordPairs[i]];
          break;
        }
      }
    }
  }

  // Step 3: Weekly variety — each 7-day block should have at least 5 different categories
  for (let week = 0; week < Math.floor(wordPairs.length / 7); week++) {
    const start = week * 7;
    const end = Math.min(start + 7, wordPairs.length);
    const weekCategories = new Set(wordPairs.slice(start, end).map((p) => p[2]));

    if (weekCategories.size < 5) {
      // Try to swap duplicates within this week with words outside the week that bring new categories
      const catCount = new Map<string, number>();
      for (let i = start; i < end; i++) {
        catCount.set(wordPairs[i][2], (catCount.get(wordPairs[i][2]) || 0) + 1);
      }

      for (let i = start; i < end; i++) {
        const cat = wordPairs[i][2];
        if ((catCount.get(cat) || 0) > 1 && weekCategories.size < 5) {
          // Find a word outside this week with a category not in this week
          for (let j = end; j < wordPairs.length; j++) {
            const newCat = wordPairs[j][2];
            if (!weekCategories.has(newCat)) {
              // Check the swap won't create consecutive duplicates
              const prevCat = i > 0 ? wordPairs[i - 1][2] : null;
              const nextCat = i < wordPairs.length - 1 ? wordPairs[i + 1][2] : null;
              if (newCat !== prevCat && newCat !== nextCat) {
                [wordPairs[i], wordPairs[j]] = [wordPairs[j], wordPairs[i]];
                catCount.set(cat, (catCount.get(cat) || 1) - 1);
                weekCategories.add(newCat);
                break;
              }
            }
          }
        }
      }
    }
  }

  // Build the output
  const allWords: Array<{ word: string; date: string; category: string; language: string }> = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 0; i < 365 && i < wordPairs.length; i++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const [enWord, esWord, enCat, esCat] = wordPairs[i];
    allWords.push({ word: enWord, date: dateStr, category: enCat, language: 'en' });
    allWords.push({ word: esWord, date: dateStr, category: esCat, language: 'es' });
  }

  return allWords;
}
