import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  MousePointerClick,
  RefreshCcw,
  Save,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { FIELD_BY_KEY, FIELD_REGISTRY, FIELD_SECTIONS, getFieldsBySection, type FieldDefinition, type FieldKey } from './config/fieldRegistry';
import { cleanAfterDuplication } from './domain/duplication';
import { createEmptyLabState, type LabState, type LabValue } from './domain/labState';
import {
  generateSchoolCalendarMonths,
  getActiveSessionNumber,
  getAllSavedMilestoneDates,
  getSessionMilestones,
  SESSION_NUMBERS,
  type MilestoneTone,
  type SessionNumber,
} from './domain/sessionPlanning';
import { validateLabState } from './domain/validationEngine';
import {
  buildFieldMapping,
  ensureCustomFields,
  getBoardCustomFields,
  getCardCustomFieldItems,
  mapLabStateToTrelloPayload,
  mapTrelloToLabState,
  updateCardCustomFields,
  type FieldMapping,
} from './trello/customFieldsClient';
import { buildCsv, buildSummary, downloadCsv } from './utils/exporters';

const AUTOSAVE_DELAY_MS = 800;
const POLL_INTERVAL_MS = 8000;
const REQUIRED_MAPPING_COUNT = FIELD_REGISTRY.length;
const QUICK_FIELD_COLUMNS: FieldKey[][] = [
  ['sef_contact_name', 'sef_contact_phone', 'sef_contact_email', 'sef_program'],
  ['sef_start_time', 'sef_end_time', 'sef_room'],
  ['sef_school_name', 'sef_session_name', 'sef_grade_range', 'sef_day_of_week'],
];
const EXTRA_QUICK_FIELDS: FieldKey[] = ['sef_school_year', 'sef_group_target', 'sef_status', 'sef_season'];
const PRIORITY_FIELD_KEYS: FieldKey[] = [
  'sef_school_name',
  'sef_contact_name',
  'sef_contact_phone',
  'sef_contact_email',
  'sef_program',
  'sef_day_of_week',
  'sef_start_time',
  'sef_end_time',
  'sef_room',
  'sef_grade_range',
  'sef_school_year',
  'sef_status',
];

type SyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'error';

interface TrelloContext {
  boardId: string | null;
  cardId: string | null;
  cardName: string;
}

export default function App() {
  const [state, setState] = useState<LabState>(() => createEmptyLabState({ sef_session_name: 'Session 1', sef_status: 'Brouillon' }));
  const [context, setContext] = useState<TrelloContext>({ boardId: null, cardId: null, cardName: 'Carte locale' });
  const [mapping, setMapping] = useState<Partial<FieldMapping>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('Mode local prêt.');
  const [didLoad, setDidLoad] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionNumber>(1);
  const [selectedMilestoneKey, setSelectedMilestoneKey] = useState<FieldKey | null>(null);
  const saveTimer = useRef<number | null>(null);
  const isApplyingRemote = useRef(false);

  const validation = useMemo(() => validateLabState(state), [state]);
  const calendarMonths = useMemo(() => generateSchoolCalendarMonths(state.sef_school_year), [state.sef_school_year]);
  const milestoneDates = useMemo(() => getAllSavedMilestoneDates(state), [state]);
  const activeMilestones = useMemo(() => getSessionMilestones(state, activeSession), [activeSession, state]);
  const selectedMilestone = useMemo(
    () => activeMilestones.find((milestone) => milestone.fieldKey === selectedMilestoneKey && milestone.fieldKey) ?? activeMilestones.find((milestone) => milestone.fieldKey),
    [activeMilestones, selectedMilestoneKey],
  );
  const priorityCompletion = useMemo(() => {
    const filled = PRIORITY_FIELD_KEYS.filter((key) => {
      const value = state[key];
      return value !== null && value !== '' && value !== false;
    }).length;
    return Math.round((filled / PRIORITY_FIELD_KEYS.length) * 100);
  }, [state]);
  const hasTrelloContext = Boolean(context.boardId && context.cardId);

  const loadFromTrello = useCallback(async () => {
    const nextContext = await readTrelloContext();
    setContext(nextContext);

    if (!nextContext.boardId || !nextContext.cardId) {
      setMessage('Mode local: ouvrez depuis une carte Trello pour synchroniser.');
      setDidLoad(true);
      return;
    }

    setSyncStatus('loading');
    setMessage('Synchronisation depuis Trello...');
    try {
      let fields = await getBoardCustomFields(nextContext.boardId);
      let nextMapping = buildFieldMapping(fields);

      if (Object.keys(nextMapping).length < REQUIRED_MAPPING_COUNT) {
        setMessage('Préparation des champs Trello...');
        const ensured = await ensureCustomFields(nextContext.boardId);
        nextMapping = ensured.mapping;
        fields = await getBoardCustomFields(nextContext.boardId);
        nextMapping = buildFieldMapping(fields);
      }

      const items = await getCardCustomFieldItems(nextContext.cardId);
      const nextState = mapTrelloToLabState(fields, items);

      isApplyingRemote.current = true;
      setMapping(nextMapping);
      setState(nextState);
      setActiveSession(getActiveSessionNumber(nextState));
      setSyncStatus('synced');
      setMessage('Carte Trello synchronisée.');
      setDidLoad(true);
      window.setTimeout(() => {
        isApplyingRemote.current = false;
      }, 0);
    } catch (error) {
      setSyncStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erreur de synchronisation.');
      setDidLoad(true);
      isApplyingRemote.current = false;
    }
  }, []);

  useEffect(() => {
    if (selectedMilestoneKey && activeMilestones.some((milestone) => milestone.fieldKey === selectedMilestoneKey)) return;
    setSelectedMilestoneKey(activeMilestones.find((milestone) => milestone.fieldKey)?.fieldKey ?? null);
  }, [activeMilestones, selectedMilestoneKey]);

  const saveNow = useCallback(
    async (stateToSave = state) => {
      if (!context.cardId || !Object.keys(mapping).length) {
        setMessage('Impossible de sauvegarder: contexte Trello ou champs manquants.');
        return;
      }

      const payload = mapLabStateToTrelloPayload(stateToSave, mapping);
      if (!payload.length) {
        setSyncStatus('synced');
        setMessage('Synchronisé.');
        return;
      }

      setSyncStatus('saving');
      setMessage('Sauvegarde dans Trello...');
      try {
        await updateCardCustomFields(context.cardId, payload);
        setState((current) => ({ ...current, sef_sync_hash: payload.find((item) => item.fieldKey === 'sef_sync_hash')?.value?.text ?? current.sef_sync_hash }));
        setSyncStatus('synced');
        setMessage('Synchronisé.');
      } catch (error) {
        setSyncStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erreur de sauvegarde.');
      }
    },
    [context.cardId, mapping, state],
  );

  useEffect(() => {
    void loadFromTrello();
  }, [loadFromTrello]);

  useEffect(() => {
    if (!didLoad || isApplyingRemote.current) return;
    const nextWarnings = validation.alerts.map((alert) => alert.message).join('; ');
    setState((current) => {
      if (current.sef_validation_score === validation.score && current.sef_validation_status === validation.status && current.sef_warnings === nextWarnings) {
        return current;
      }
      return {
        ...current,
        sef_validation_score: validation.score,
        sef_validation_status: validation.status,
        sef_warnings: nextWarnings || null,
        sef_lab_reactor_version: 'mvp-organisation-1',
      };
    });
  }, [didLoad, validation]);

  useEffect(() => {
    if (!didLoad || !hasTrelloContext || isApplyingRemote.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [didLoad, hasTrelloContext, saveNow, state]);

  useEffect(() => {
    const onFocus = () => {
      if (hasTrelloContext) void loadFromTrello();
    };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && hasTrelloContext && syncStatus !== 'saving') void loadFromTrello();
    }, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [hasTrelloContext, loadFromTrello, syncStatus]);

  const updateField = (key: FieldKey, value: LabValue) => {
    setState((current) => ({ ...current, [key]: value }));
    if (key === 'sef_session_name') {
      if (value === 'Session 2') setActiveSession(2);
      else if (value === 'Session 3') setActiveSession(3);
      else setActiveSession(1);
    }
  };

  const updateSelectedMilestoneDate = (date: string) => {
    if (!selectedMilestone?.fieldKey) return;
    updateField(selectedMilestone.fieldKey, date);
    setMessage(`${selectedMilestone.label}: ${date}.`);
  };

  const initializeFields = async () => {
    if (!context.boardId) {
      setMessage("Ouvrez le Power-Up depuis une carte Trello avant d'initialiser les champs.");
      setSyncStatus('error');
      return;
    }

    setSyncStatus('loading');
    setMessage('Initialisation des champs SEF...');
    try {
      const result = await ensureCustomFields(context.boardId);
      setMapping(result.mapping);
      setSyncStatus(result.errors.length ? 'error' : 'synced');
      setMessage(`Champs créés: ${result.created.length}. Déjà présents: ${result.present.length}. Options créées: ${result.optionsCreated.length}.`);
      await loadFromTrello();
    } catch (error) {
      setSyncStatus('error');
      setMessage(error instanceof Error ? error.message : "Erreur pendant l'initialisation.");
    }
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(buildSummary(state));
    setMessage('Résumé copié.');
  };

  const copyCsv = async () => {
    await navigator.clipboard.writeText(buildCsv(state));
    setMessage('CSV copié.');
  };

  const onCleanAfterDuplication = () => {
    const clearDates = window.confirm('Vider les dates de jalons sur cette carte dupliquée? Annuler les conservera.');
    setState((current) => cleanAfterDuplication(current, { clearDates }));
    setMessage(clearDates ? 'Carte nettoyée, dates vidées.' : 'Carte nettoyée, dates conservées.');
  };

  const openCalculatorWidget = () => {
    if (typeof state.sef_pricing_widget_url === 'string' && state.sef_pricing_widget_url.trim()) {
      window.open(state.sef_pricing_widget_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setMessage('Aucune URL de widget calculatrice configurée.');
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-mark"><FlaskConical size={24} /></div>
          <div>
            <p className="eyebrow">Sciences en Folie</p>
            <h1>Lab Reactor</h1>
            <p className="hero-copy">{context.cardName}</p>
          </div>
        </div>
        <div className="header-metrics">
          <div className="metric-pill"><Zap size={16} />{priorityCompletion}% fiche</div>
          <div className={`sync-pill ${syncStatus}`}><span />{labelForSync(syncStatus)}</div>
        </div>
      </header>

      <section className="quick-sheet" aria-label="Fiche rapide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Saisie rapide</p>
            <h2>Les champs qui comptent</h2>
          </div>
          <strong>{valueOrDash(state.sef_school_year)} · {valueOrDash(state.sef_status)}</strong>
        </div>
        <div className="quick-columns">
          {QUICK_FIELD_COLUMNS.map((column, index) => (
            <div className="quick-column" key={index}>
              {column.map((key) => <FieldInput key={key} field={FIELD_BY_KEY[key]} value={state[key]} onChange={(value) => updateField(key, value)} />)}
            </div>
          ))}
        </div>
        <div className="quick-extra">
          {EXTRA_QUICK_FIELDS.map((key) => <FieldInput key={key} field={FIELD_BY_KEY[key]} value={state[key]} onChange={(value) => updateField(key, value)} />)}
        </div>
      </section>

      <section className="planning-board" aria-label="Dates et calendrier">
        <div className="planning-sidebar">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Dates</p>
              <h2>Session {activeSession}</h2>
            </div>
            <div className="session-tabs">
              {SESSION_NUMBERS.map((session) => (
                <button key={session} type="button" className={activeSession === session ? 'active' : ''} onClick={() => setActiveSession(session)}>
                  {session}
                </button>
              ))}
            </div>
          </div>
          <div className="selected-step">
            <MousePointerClick size={18} />
            <div>
              <span>Étape active</span>
              <strong>{selectedMilestone?.label ?? 'Aucune étape'}</strong>
            </div>
          </div>
          <div className="milestone-list">
            {activeMilestones.map((milestone) => (
              <button
                key={milestone.id}
                type="button"
                className={`milestone-row ${milestone.tone} ${selectedMilestone?.fieldKey === milestone.fieldKey ? 'selected' : ''}`}
                disabled={!milestone.fieldKey}
                onClick={() => milestone.fieldKey && setSelectedMilestoneKey(milestone.fieldKey)}
              >
                <span className="milestone-tone" />
                <strong>{milestone.label}</strong>
                <span>{milestone.date ?? '--'}</span>
                <em>{milestone.status}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="calendar-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Calendrier</p>
              <h2>{valueOrDash(state.sef_school_year)}</h2>
            </div>
            <CalendarDays size={22} />
          </div>
          <div className="calendar-legend">
            {(['purple', 'red', 'blue', 'yellow', 'gray', 'green', 'orange'] as MilestoneTone[]).map((tone) => <span key={tone} className={`legend-dot ${tone}`}>{toneLabel(tone)}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarMonths.map((month) => (
              <MiniCalendar
                key={`${month.year}-${month.month}`}
                month={month}
                dates={milestoneDates}
                selectedDate={selectedMilestone?.date ?? null}
                selectedTone={selectedMilestone?.tone ?? 'blue'}
                onDateSelect={updateSelectedMilestoneDate}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="validation-actions-grid">
        <section className="validation-panel" aria-label="Validation opérationnelle">
          <div className="score-ring" style={{ '--score': validation.score } as CSSProperties}>
            <strong>{validation.score}%</strong>
            <span>{validation.status}</span>
          </div>
          <div>
            <p className="eyebrow">Section 4</p>
            <h2>Validation opérationnelle</h2>
            <p>{validation.alerts.length ? `${validation.alerts.length} alerte(s) à régler.` : 'La carte est prête à présenter.'}</p>
          </div>
          {validation.alerts.length > 0 && (
            <div className="alerts">
              {validation.alerts.map((alert) => <div key={alert.message} className={`alert ${alert.level}`}><AlertTriangle size={17} />{alert.message}</div>)}
            </div>
          )}
        </section>

        <section className="actions-panel" aria-label="Actions rapides">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Trello</p>
              <h2>Synchro</h2>
            </div>
          </div>
          <p className="status-message"><strong>{message}</strong><span>{hasTrelloContext ? 'Connecté à Trello' : 'Mode local'}</span></p>
          <div className="sync-checks">
            <span className={context.cardId ? 'ok' : ''}><CheckCircle2 size={15} />Carte</span>
            <span className={context.boardId ? 'ok' : ''}><CheckCircle2 size={15} />Board</span>
            <span className={Object.keys(mapping).length >= REQUIRED_MAPPING_COUNT ? 'ok' : ''}><CheckCircle2 size={15} />Champs SEF</span>
          </div>
          <div className="actions-grid">
            <button type="button" onClick={loadFromTrello}><RefreshCcw size={18} />Synchroniser depuis Trello</button>
            <button type="button" onClick={() => void saveNow()}><Save size={18} />Sauvegarder maintenant</button>
            <button type="button" onClick={initializeFields}><Wand2 size={18} />Initialiser / vérifier les champs SEF</button>
            <button type="button" onClick={copySummary}><Clipboard size={18} />Copier résumé</button>
            <button type="button" onClick={copyCsv}><Copy size={18} />Copier CSV</button>
            <button type="button" onClick={() => downloadCsv(buildCsv(state), `${state.sef_school_name || 'lab-reactor'}.csv`)}><Download size={18} />Télécharger CSV</button>
            <button type="button" onClick={onCleanAfterDuplication}><Sparkles size={18} />Nettoyer après duplication</button>
            <button type="button" onClick={openCalculatorWidget}><ExternalLink size={18} />Ouvrir widget calculatrice</button>
          </div>
        </section>
      </section>

      <section className="summary-panel">
        <div className="section-heading"><h2>Résumé exportable</h2></div>
        <pre>{buildSummary(state)}</pre>
      </section>

      <section className="form-workbench">
        <div className="section-heading">
          <div><p className="eyebrow">Annexe</p><h2>Tous les champs Trello</h2></div>
        </div>
        {FIELD_SECTIONS.filter((section) => section !== 'Validation / technique').map((section) => (
          <FieldSectionView key={section} title={section} fields={getFieldsBySection(section)} state={state} onChange={updateField} />
        ))}
      </section>
    </main>
  );
}

function MiniCalendar({
  month,
  dates,
  selectedDate,
  selectedTone,
  onDateSelect,
}: {
  month: ReturnType<typeof generateSchoolCalendarMonths>[number];
  dates: Array<{ date: string; tone: MilestoneTone; label: string }>;
  selectedDate: string | null;
  selectedTone: MilestoneTone;
  onDateSelect: (date: string) => void;
}) {
  const datesByDay = new Map<number, Array<{ date: string; tone: MilestoneTone; label: string }>>();
  for (const item of dates) {
    if (Number(item.date.slice(0, 4)) !== month.year || Number(item.date.slice(5, 7)) !== month.month + 1) continue;
    const day = Number(item.date.slice(8, 10));
    datesByDay.set(day, [...(datesByDay.get(day) ?? []), item]);
  }

  return (
    <article className="mini-calendar">
      <h3>{month.label}</h3>
      <div className="weekdays">{['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      {month.weeks.map((week, index) => (
        <div className="week" key={index}>
          {week.map((day, cell) => {
            if (!day) return <span key={`${index}-${cell}`} />;
            const isoDate = formatCalendarDate(month.year, month.month, day);
            const events = datesByDay.get(day) ?? [];
            const primaryEvent = events[0];
            const isSelected = selectedDate === isoDate;
            return (
              <button
                key={`${index}-${cell}`}
                type="button"
                className={`${primaryEvent ? `marked ${primaryEvent.tone}` : ''} ${isSelected ? `selected-date ${selectedTone}` : ''}`}
                title={events.map((event) => event.label).join('\n') || isoDate}
                onClick={() => onDateSelect(isoDate)}
              >
                <span>{day}</span>
                {events.length > 0 && <i>{events.length}</i>}
              </button>
            );
          })}
        </div>
      ))}
    </article>
  );
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function FieldSectionView({ title, fields, state, onChange }: { title: string; fields: FieldDefinition[]; state: LabState; onChange: (key: FieldKey, value: LabValue) => void }) {
  return (
    <section className="field-section">
      <h3>{title}</h3>
      <div className="field-grid">
        {fields.map((field) => <FieldInput key={field.key} field={field} value={state[field.key as FieldKey]} onChange={(value) => onChange(field.key as FieldKey, value)} />)}
      </div>
    </section>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDefinition; value: LabValue; onChange: (value: LabValue) => void }) {
  const id = `field-${field.key}`;
  return (
    <label className="field" htmlFor={id}>
      <span>{field.trelloName}</span>
      {field.type === 'list' ? (
        <select id={id} value={String(value ?? '')} onChange={(event) => onChange(event.target.value || null)}>
          <option value="">-</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value || null)}
        />
      )}
    </label>
  );
}

async function readTrelloContext(): Promise<TrelloContext> {
  const isPanel = new URLSearchParams(window.location.search).get('panel') === 'lab';
  if (!isPanel) return { boardId: null, cardId: null, cardName: 'Carte locale' };
  const t = window.TrelloPowerUp?.iframe?.();
  if (!t) return { boardId: null, cardId: null, cardName: 'Carte locale' };
  const [board, card] = await Promise.all([t.board('id'), t.card('id,name')]);
  const boardData = board as { id?: string };
  const cardData = card as { id?: string; name?: string };
  return { boardId: boardData.id ?? null, cardId: cardData.id ?? null, cardName: cardData.name ?? 'Carte Trello' };
}

function labelForSync(status: SyncStatus): string {
  if (status === 'loading') return 'Lecture...';
  if (status === 'saving') return 'Sauvegarde...';
  if (status === 'synced') return 'Synchronisé';
  if (status === 'error') return 'Erreur';
  return 'Prêt';
}

function valueOrDash(value: LabValue): string {
  if (value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

function toneLabel(tone: MilestoneTone): string {
  const labels: Record<MilestoneTone, string> = {
    purple: 'livraison coupons',
    red: 'distribution / fin',
    blue: 'inscriptions / spectacle',
    yellow: 'courriels',
    gray: 'listes',
    green: 'cours',
    orange: 'fin des cours',
  };
  return labels[tone];
}
