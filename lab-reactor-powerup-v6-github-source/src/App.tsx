import React, { useEffect, useState } from 'react';
import {
  getBoardCustomFields,
  getCardCustomFieldItems,
  ensureCustomFields,
  mapTrelloToLabState,
  mapLabStateToTrelloPayload,
  updateCardCustomFields,
  calculateSyncHash,
  LabState,
} from './trello/customFieldsClient';
import { fieldRegistry } from './config/fieldRegistry';
import { validateLabState } from './domain/validationEngine';

// Debounce helper to avoid thrashing API updates. Simple implementation.
function debounce<F extends (...args: any[]) => void>(fn: F, delay: number) {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

interface AppProps {
  boardId: string;
  cardId: string;
}

/**
 * Root component for the Lab Reactor Power‑Up. It manages the local
 * state representing all custom fields on the current card, keeps it
 * synchronised with Trello, and renders a simple form based on the
 * field registry. For brevity the UI is minimalist; styling should
 * be added separately using CSS modules or a utility framework.
 */
export default function App({ boardId, cardId }: AppProps) {
  const [labState, setLabState] = useState<LabState>({});
  const [boardFields, setBoardFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Synchronisé');

  // Debounced save function
  const debouncedSave = debounce(async (state: LabState) => {
    try {
      const items = mapLabStateToTrelloPayload(state, boardFields);
      await updateCardCustomFields(cardId, items);
      setStatusMsg('Synchronisé');
    } catch (err) {
      setStatusMsg('Erreur de sauvegarde');
    }
  }, 800);

  // Load data from Trello on mount or when boardId/cardId change
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fields = await getBoardCustomFields(boardId);
        setBoardFields(fields);
        const items = await getCardCustomFieldItems(cardId);
        const state = mapTrelloToLabState(fields, items);
        setLabState(state);
        setStatusMsg('Synchronisé');
      } catch (err) {
        console.error(err);
        setStatusMsg('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId, cardId]);

  // Watch state changes and save
  useEffect(() => {
    if (!loading) {
      setStatusMsg('Sauvegarde…');
      debouncedSave(labState);
    }
  }, [labState]);

  // Handler for field changes
  const handleChange = (key: string, value: any) => {
    setLabState(prev => ({ ...prev, [key]: value }));
  };

  // Manual sync from Trello
  const handleSync = async () => {
    setStatusMsg('Synchronisation…');
    try {
      const fields = await getBoardCustomFields(boardId);
      setBoardFields(fields);
      const items = await getCardCustomFieldItems(cardId);
      const state = mapTrelloToLabState(fields, items);
      setLabState(state);
      setStatusMsg('Synchronisé');
    } catch (err) {
      setStatusMsg('Erreur de synchronisation');
    }
  };

  // Initialise custom fields
  const handleInitFields = async () => {
    setStatusMsg('Initialisation…');
    try {
      await ensureCustomFields(boardId);
      setStatusMsg('Champs initialisés');
    } catch (err) {
      setStatusMsg('Erreur d\'initialisation');
    }
  };

  const validation = validateLabState(labState);

  return (
    <div style={{ padding: '1rem', maxWidth: 800, fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Lab Reactor</h1>
        <div style={{ marginTop: '0.5rem' }}>
          <button onClick={handleSync} style={{ marginRight: '0.5rem' }}>
            Synchroniser depuis Trello
          </button>
          <button onClick={handleInitFields} style={{ marginRight: '0.5rem' }}>
            Initialiser / vérifier les champs SEF
          </button>
          <span style={{ fontStyle: 'italic' }}>{statusMsg}</span>
        </div>
      </header>
      {loading && <p>Chargement…</p>}
      {!loading && (
        <>
          {/* Validation summary */}
          <section
            style={{
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '1rem',
              backgroundColor:
                validation.status === 'Prêt à présenter'
                  ? '#e6ffed'
                  : validation.status === 'Attention'
                  ? '#fffbe6'
                  : '#ffe6e6',
            }}
          >
            <strong>Validation :</strong>{' '}
            <span>
              {validation.score}% – {validation.status}
            </span>
            {validation.alerts.length > 0 && (
              <ul>
                {validation.alerts.map((alert, i) => (
                  <li key={i}>{alert}</li>
                ))}
              </ul>
            )}
            {validation.missing.length > 0 && (
              <p style={{ margin: 0 }}>
                <em>Champs manquants :</em> {validation.missing.join(', ')}
              </p>
            )}
          </section>

          {/* Group fields by section for better readability */}
          {Array.from(
            fieldRegistry.reduce((acc, def) => {
              if (!acc.has(def.section)) acc.set(def.section, [] as typeof fieldRegistry);
              acc.get(def.section)!.push(def);
              return acc;
            }, new Map<string, typeof fieldRegistry>())
          ).map(([sectionName, defs]) => (
            <section key={sectionName} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>
                {sectionName}
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {defs.map(def => (
                  <div key={def.key} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{def.name}</label>
                    {def.type === 'text' && (
                      <input
                        type="text"
                        value={labState[def.key] ?? ''}
                        onChange={e => handleChange(def.key, e.target.value)}
                      />
                    )}
                    {def.type === 'number' && (
                      <input
                        type="number"
                        value={labState[def.key] ?? ''}
                        onChange={e =>
                          handleChange(def.key, e.target.value === '' ? null : Number(e.target.value))
                        }
                      />
                    )}
                    {def.type === 'date' && (
                      <input
                        type="date"
                        value={
                          labState[def.key] instanceof Date
                            ? (labState[def.key] as Date).toISOString().substring(0, 10)
                            : ''
                        }
                        onChange={e => handleChange(def.key, e.target.value ? new Date(e.target.value) : null)}
                      />
                    )}
                    {def.type === 'checkbox' && (
                      <input
                        type="checkbox"
                        checked={Boolean(labState[def.key])}
                        onChange={e => handleChange(def.key, e.target.checked)}
                      />
                    )}
                    {def.type === 'list' && (
                      <select
                        value={labState[def.key] ?? ''}
                        onChange={e => handleChange(def.key, e.target.value === '' ? null : e.target.value)}
                      >
                        <option value="">—</option>
                        {def.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}