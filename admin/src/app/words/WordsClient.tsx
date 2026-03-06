'use client';

import { useState } from 'react';
import { addWord, updateWord, deleteWord, bulkUploadWords } from './actions';

interface Word {
  id: string;
  word: string;
  date: string;
  category: string;
}

const CATEGORIES = ['general', 'nature', 'life', 'abstract', 'food', 'emotion', 'objects', 'modern', 'science', 'people', 'places', 'action', 'animal', 'body', 'weather', 'music', 'sports', 'technology'];

export function WordsClient({ words }: { words: Word[] }) {
  const [view, setView] = useState<'calendar' | 'list' | 'bulk'>('calendar');
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [bulkResult, setBulkResult] = useState('');
  const [error, setError] = useState('');

  const wordsByDate = new Map(words.map((w) => [w.date, w]));

  // Calendar helpers
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];
  const monthName = new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCalMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCalMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 });

  // Count stats
  const futureWords = words.filter((w) => w.date >= today).length;
  const totalWords = words.length;
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
          <button className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('calendar')}>Calendar</button>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('list')}>List</button>
          <button className={`btn ${view === 'bulk' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('bulk')}>Bulk Upload</button>
          <button className="btn btn-success" onClick={() => { setShowAdd(true); setSelectedDate(''); }}>+ Add Word</button>
        </div>
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="label">Total Words</div>
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
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <tr><th>Date</th><th>Word</th><th>Category</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {words.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 700, letterSpacing: 2 }}>{w.word}</td>
                  <td><span className="badge badge-muted">{w.category}</span></td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditingWord(w)}>Edit</button>
                  </td>
                </tr>
              ))}
              {words.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No words yet. Add some!</td></tr>
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
            Paste a JSON array of words. Each entry needs &quot;word&quot;, &quot;date&quot; (YYYY-MM-DD), and optionally &quot;category&quot;.
            Existing dates will be updated (upsert).
          </p>
          <form action={handleBulk}>
            <div className="form-group">
              <label>JSON Data</label>
              <textarea
                name="words"
                rows={16}
                placeholder={`[\n  { "word": "SUNSET", "date": "2026-03-06", "category": "nature" },\n  { "word": "PIZZA", "date": "2026-03-07", "category": "food" }\n]`}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Upload Words</button>
          </form>
          {bulkResult && <div style={{ marginTop: 16, background: '#22c55e22', color: 'var(--success)', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>{bulkResult}</div>}

          <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Generate a Year of Words</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
              Click below to generate 365 pre-made words starting from tomorrow. Copy the output and paste it into the box above.
            </p>
            <button type="button" className="btn btn-outline" onClick={() => {
              const wordBank = generateWordBank();
              const textarea = document.querySelector('textarea[name="words"]') as HTMLTextAreaElement;
              if (textarea) textarea.value = JSON.stringify(wordBank, null, 2);
            }}>
              Generate 365 Words
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function generateWordBank() {
  const wordsByCategory: Record<string, string[]> = {
    nature: ['SUNSET', 'OCEAN', 'MOUNTAIN', 'FOREST', 'RIVER', 'STORM', 'THUNDER', 'RAINBOW', 'DESERT', 'VOLCANO', 'WATERFALL', 'MEADOW', 'GLACIER', 'CANYON', 'AURORA', 'BREEZE', 'DAWN', 'DUSK', 'FROST', 'BLOSSOM', 'PEBBLE', 'CORAL', 'TIDE', 'MIST', 'FOG', 'SNOW', 'ISLAND', 'JUNGLE', 'SWAMP', 'CAVE'],
    emotion: ['JEALOUSY', 'NOSTALGIA', 'REGRET', 'HOPE', 'ANGER', 'JOY', 'FEAR', 'LOVE', 'GRIEF', 'PRIDE', 'SHAME', 'ENVY', 'BLISS', 'ANXIETY', 'PEACE', 'COURAGE', 'LONGING', 'WONDER', 'GUILT', 'DESIRE', 'PATIENCE', 'PANIC', 'RELIEF', 'SORROW', 'TRUST', 'DOUBT', 'AWE', 'BOREDOM', 'EMPATHY', 'FURY'],
    abstract: ['SILENCE', 'CHILDHOOD', 'HOME', 'FREEDOM', 'TIME', 'TRUTH', 'JUSTICE', 'FATE', 'LUCK', 'CHAOS', 'DREAM', 'MEMORY', 'POWER', 'BEAUTY', 'DEATH', 'LIFE', 'WISDOM', 'CHANGE', 'DESTINY', 'SOUL', 'SHADOW', 'LIGHT', 'VOID', 'ETERNITY', 'BALANCE', 'KARMA', 'LEGACY', 'PURPOSE', 'RISK', 'MAGIC'],
    food: ['PIZZA', 'COFFEE', 'CHOCOLATE', 'SUSHI', 'BREAD', 'CHEESE', 'BACON', 'TACO', 'PASTA', 'BURGER', 'HONEY', 'AVOCADO', 'MANGO', 'POPCORN', 'STEAK', 'SOUP', 'CAKE', 'BUTTER', 'TOAST', 'RAMEN', 'PICKLE', 'WAFFLE', 'DONUT', 'PRETZEL', 'SALAD', 'GARLIC', 'LEMON', 'SPICE', 'CANDY', 'COOKIE'],
    life: ['MONDAY', 'FRIDAY', 'MORNING', 'WEDDING', 'BIRTHDAY', 'VACATION', 'SCHOOL', 'WORK', 'MONEY', 'TRAFFIC', 'SLEEP', 'FAMILY', 'DATING', 'MOVING', 'COOKING', 'SHOPPING', 'MEETING', 'WAITING', 'COMMUTE', 'LAUNDRY', 'HOMEWORK', 'BEDTIME', 'WEEKEND', 'PAYCHECK', 'ALARM', 'DEADLINE', 'PARTY', 'GOSSIP', 'NEIGHBOR', 'ROOMMATE'],
    objects: ['KEYS', 'MIRROR', 'PHONE', 'PILLOW', 'UMBRELLA', 'WALLET', 'CLOCK', 'DOOR', 'WINDOW', 'STAIRS', 'CANDLE', 'BOOK', 'PEN', 'LADDER', 'BRIDGE', 'FENCE', 'ROPE', 'CHAIN', 'WHEEL', 'COIN', 'MASK', 'CROWN', 'SWORD', 'SHIELD', 'BELL', 'FLAG', 'LAMP', 'THRONE', 'TROPHY', 'BALLOON'],
    modern: ['WIFI', 'PASSWORD', 'SELFIE', 'EMOJI', 'STREAMING', 'ALGORITHM', 'INFLUENCER', 'PODCAST', 'MEME', 'BITCOIN', 'TIKTOK', 'AIRPODS', 'UBER', 'NETFLIX', 'GOOGLE', 'TWEET', 'STARTUP', 'DRONE', 'ROBOT', 'AVATAR', 'FILTER', 'VIRAL', 'TRENDING', 'CANCEL', 'GAMING', 'HACKER', 'CRYPTO', 'VLOG', 'PLAYLIST', 'NOTIFICATION'],
    science: ['GRAVITY', 'ATOM', 'DNA', 'GALAXY', 'EVOLUTION', 'QUANTUM', 'OXYGEN', 'ECLIPSE', 'COMET', 'VIRUS', 'MAGNET', 'LASER', 'FOSSIL', 'NEURON', 'ORBIT', 'PLASMA', 'CARBON', 'CRYSTAL', 'SPECTRUM', 'VACCINE', 'ENZYME', 'PHOTON', 'GENOME', 'ASTEROID', 'BACTERIA', 'ELECTRON', 'HABITAT', 'MOLECULE', 'PARASITE', 'TELESCOPE'],
    animal: ['DOG', 'CAT', 'SHARK', 'EAGLE', 'SNAKE', 'DOLPHIN', 'LION', 'WOLF', 'BEAR', 'OWL', 'SPIDER', 'WHALE', 'PENGUIN', 'TIGER', 'MONKEY', 'ELEPHANT', 'PARROT', 'RABBIT', 'TURTLE', 'DRAGON', 'UNICORN', 'BUTTERFLY', 'SCORPION', 'OCTOPUS', 'CROW', 'HAWK', 'PANTHER', 'COBRA', 'FIREFLY', 'PIGEON'],
    people: ['TEACHER', 'STRANGER', 'VILLAIN', 'HERO', 'GENIUS', 'LEADER', 'REBEL', 'ARTIST', 'SOLDIER', 'DOCTOR', 'LEGEND', 'GHOST', 'CLOWN', 'KING', 'QUEEN', 'WARRIOR', 'NINJA', 'PIRATE', 'WIZARD', 'THIEF', 'FRIEND', 'ENEMY', 'BABY', 'BOSS', 'CHEF', 'JUDGE', 'PROPHET', 'SPY', 'TOURIST', 'MENTOR'],
    places: ['AIRPORT', 'LIBRARY', 'HOSPITAL', 'PRISON', 'CHURCH', 'STADIUM', 'CASINO', 'MUSEUM', 'BEACH', 'ROOFTOP', 'BASEMENT', 'BATHROOM', 'KITCHEN', 'ELEVATOR', 'HIGHWAY', 'GRAVEYARD', 'PLAYGROUND', 'GARDEN', 'TEMPLE', 'DUNGEON', 'ALLEY', 'MARKET', 'HARBOR', 'CABIN', 'ATTIC', 'GARAGE', 'TUNNEL', 'LOBBY', 'BALCONY', 'DINER'],
    action: ['RUNNING', 'FALLING', 'LAUGHING', 'CRYING', 'DANCING', 'FIGHTING', 'FLYING', 'HIDING', 'LYING', 'STEALING', 'KISSING', 'SCREAMING', 'SLEEPING', 'BURNING', 'BREAKING', 'BUILDING', 'CLIMBING', 'DIVING', 'CHASING', 'ESCAPING', 'MELTING', 'SPINNING', 'SINKING', 'FLOATING', 'WHISPERING', 'PRAYING', 'GAMBLING', 'HUNTING', 'PAINTING', 'SINGING'],
  };

  const allWords: Array<{ word: string; date: string; category: string }> = [];
  const categories = Object.keys(wordsByCategory);
  const flatWords: Array<{ word: string; category: string }> = [];

  for (const [cat, words] of Object.entries(wordsByCategory)) {
    for (const word of words) {
      flatWords.push({ word, category: cat });
    }
  }

  // Shuffle
  for (let i = flatWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flatWords[i], flatWords[j]] = [flatWords[j], flatWords[i]];
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 0; i < 365 && i < flatWords.length; i++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    allWords.push({ word: flatWords[i].word, date: dateStr, category: flatWords[i].category });
  }

  return allWords;
}
