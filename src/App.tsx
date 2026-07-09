import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  MousePointerClick,
  Plus,
  Printer,
  RefreshCcw,
} from 'lucide-react';
import { FIELD_BY_KEY, TECHNICAL_FIELD_KEYS, VISIBLE_TRELLO_FIELD_REGISTRY, type FieldDefinition, type FieldKey } from './config/fieldRegistry';
import { createEmptyLabState, type LabState, type LabValue } from './domain/labState';
import {
  generateSchoolCalendarMonths,
  getActiveSessionNumber,
  getAllSavedMilestoneDates,
  getSessionMilestones,
  readCourseDates,
  SESSION_NUMBERS,
  type MilestoneTone,
  type SessionNumber,
  writeCourseDates,
} from './domain/sessionPlanning';
import { validateLabState } from './domain/validationEngine';
import {
  buildFieldMapping,
  calculateSyncHash,
  createLabCardOnBoard,
  ensureCustomFields,
  extractLabPayloadFromDescription,
  getBoardCustomFields,
  getCardCustomFieldItems,
  LAB_REACTOR_PAYLOAD_FIELD_NAME,
  mapLabStateToTrelloPayload,
  mapTrelloToLabState,
  readLabPayloadField,
  readLabPayloadFromDescription,
  removeLabPayloadFromDescription,
  updateCardCustomFields,
  writeLabPayloadField,
  type FieldMapping,
  type TrelloCustomField,
  type TrelloCustomFieldItem,
} from './trello/customFieldsClient';
import { buildSummary } from './utils/exporters';

const AUTOSAVE_DELAY_MS = 5000;
const VISIBLE_FIELD_SYNC_INTERVAL_MS = 10000;
const RATE_LIMIT_RETRY_MS = 30000;
const LOCAL_DRAFT_PREFIX = 'lab-reactor-draft:';
const REQUIRED_MAPPING_COUNT = VISIBLE_TRELLO_FIELD_REGISTRY.length;
const FORCE_VISIBLE_FIELD_SYNC = true;
const TRELLO_IFRAME_OPTIONS = {
  appKey: import.meta.env.VITE_TRELLO_API_KEY ?? 'a9936eee9f445b63329fe1ab29b41e1f',
  appName: 'Lab Reactor',
};
const QUICK_FIELD_COLUMNS: FieldKey[][] = [
  ['sef_contact_name', 'sef_contact_phone', 'sef_contact_email', 'sef_program'],
  ['sef_start_time', 'sef_end_time', 'sef_room'],
  ['sef_school_name', 'sef_session_name', 'sef_grade_range', 'sef_day_of_week'],
];
const EXTRA_QUICK_FIELDS: FieldKey[] = ['sef_school_year', 'sef_group_target', 'sef_status', 'sef_season'];
const SESSION_DETAIL_FIELDS = ['theme', 'price'] as const;
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
type DateTarget = { kind: 'field'; id: string; key: FieldKey } | { kind: 'course'; id: string; session: SessionNumber; index: number };
type TabId = 'general' | 'program' | 'dates' | 'summary';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'general', label: 'Informations générales' },
  { id: 'program', label: 'Programme & prix' },
  { id: 'dates', label: 'Dates importantes' },
  { id: 'summary', label: 'Résumé & validation' },
];

interface TrelloContext {
  boardId: string | null;
  cardId: string | null;
  cardName: string;
}

interface SavedStateSource {
  label: string;
  state: LabState | null;
  savedAt?: string | null;
}

interface PowerUpSnapshot {
  fields: TrelloCustomField[];
  items: TrelloCustomFieldItem[];
  desc: string | null;
}

export default function App() {
  const [state, setState] = useState<LabState>(() => createEmptyLabState({ sef_session_name: 'Session 1', sef_status: 'Brouillon' }));
  const [context, setContext] = useState<TrelloContext>({ boardId: null, cardId: null, cardName: 'Carte locale' });
  const [mapping, setMapping] = useState<Partial<FieldMapping>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('Mode local prêt.');
  const [didLoad, setDidLoad] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionNumber>(1);
  const [selectedDateTarget, setSelectedDateTarget] = useState<DateTarget | null>(null);
  const [courseSlots, setCourseSlots] = useState<Record<SessionNumber, number>>({ 1: 4, 2: 4, 3: 4, 4: 4 });
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const saveTimer = useRef<number | null>(null);
  const isApplyingRemote = useRef(false);
  const latestState = useRef(state);
  const saveInFlight = useRef(false);
  const pendingSave = useRef(false);
  const lastDurableHash = useRef<string | null>(null);
  const lastVisibleFieldSyncAt = useRef(0);
  const retryTimer = useRef<number | null>(null);

  const validation = useMemo(() => validateLabState(state), [state]);
  const calendarMonths = useMemo(() => generateSchoolCalendarMonths(state.sef_school_year), [state.sef_school_year]);
  const milestoneDates = useMemo(() => getAllSavedMilestoneDates(state), [state]);
  const activeMilestones = useMemo(() => getSessionMilestones(state, activeSession), [activeSession, state]);
  const activeCourseDates = useMemo(() => readCourseDates(state, activeSession), [activeSession, state]);
  const visibleCourseCount = Math.min(12, Math.max(4, courseSlots[activeSession], activeCourseDates.length));
  const visibleMilestones = useMemo(
    () => activeMilestones.filter((milestone) => !milestone.courseIndex || milestone.courseIndex <= visibleCourseCount),
    [activeMilestones, visibleCourseCount],
  );
  const selectedMilestone = useMemo(() => {
    if (selectedDateTarget) {
      const match = visibleMilestones.find((milestone) => milestone.id === selectedDateTarget.id);
      if (match) return match;
    }
    return visibleMilestones.find((milestone) => milestone.fieldKey) ?? visibleMilestones.find((milestone) => milestone.courseIndex);
  }, [selectedDateTarget, visibleMilestones]);
  const priorityCompletion = useMemo(() => {
    const filled = PRIORITY_FIELD_KEYS.filter((key) => {
      const value = state[key];
      return value !== null && value !== '' && value !== false;
    }).length;
    return Math.round((filled / PRIORITY_FIELD_KEYS.length) * 100);
  }, [state]);
  const hasTrelloContext = Boolean(context.boardId && context.cardId);
  const sessionPrices = SESSION_NUMBERS.map((session) => Number(state[`sef_s${session}_price` as FieldKey]) || 0);
  const totalSessionPrice = sessionPrices.reduce((sum, price) => sum + price, 0);
  const pricedSessionCount = sessionPrices.filter((price) => price > 0).length;
  const makePayload = {
    source: 'lab-reactor',
    cardId: context.cardId,
    boardId: context.boardId,
    school: state.sef_school_name,
    civilYear: state.sef_school_year,
    status: state.sef_status,
    sessions: SESSION_NUMBERS.map((session) => ({
      session,
      theme: state[`sef_s${session}_theme` as FieldKey],
      price: state[`sef_s${session}_price` as FieldKey],
      courseDates: readCourseDates(state, session),
    })),
    totalSessionPrice,
    pricedSessionCount,
  };

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
      const snapshot = await readPowerUpSnapshot().catch(() => null);
      const fields = snapshot?.fields.length ? snapshot.fields : await getBoardCustomFields(nextContext.boardId).catch(() => []);
      const nextMapping = buildFieldMapping(fields);
      const items = snapshot?.items.length ? snapshot.items : fields.length ? await getCardCustomFieldItems(nextContext.cardId).catch(() => []) : [];
      const visibleState = readVisibleCustomFieldState(fields, items);
      const descriptionSource = snapshot?.desc !== null && snapshot?.desc !== undefined
        ? readDescriptionBackupFromText(snapshot.desc)
        : await readDescriptionBackup(nextContext.cardId).catch(() => null);
      if (snapshot?.desc?.includes('LAB_REACTOR_PAYLOAD_START')) {
        void removeLabPayloadFromDescription(nextContext.cardId).catch(() => undefined);
      }
      const payloadSource = readPayloadBackupFromItems(fields, items);
      const payloadFieldSource = payloadSource
        ? null
        : await readPayloadBackupFromField(nextContext.boardId, nextContext.cardId).catch(() => null);
      const sources: SavedStateSource[] = [
        descriptionSource ?? { label: 'description Trello', state: null },
        payloadSource ?? payloadFieldSource ?? { label: 'payload Trello', state: null },
        { label: 'champs personnalisés Trello', state: visibleState },
        readLocalDraft(nextContext.boardId, nextContext.cardId) ?? { label: 'brouillon local', state: null },
      ];
      const bestSource = chooseBestSavedState(sources);
      const nextState = bestSource?.state ?? createEmptyLabState({ sef_session_name: 'Session 1', sef_status: 'Brouillon' });

      isApplyingRemote.current = true;
      latestState.current = nextState;
      setMapping(nextMapping);
      setState(nextState);
      lastDurableHash.current = calculateSyncHash(nextState);
      setActiveSession(getActiveSessionNumber(nextState));
      setSyncStatus('synced');
      setMessage(bestSource ? `Fiche chargée depuis ${bestSource.label}.` : 'Carte Trello synchronisée.');
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
    if (selectedDateTarget && visibleMilestones.some((milestone) => milestone.id === selectedDateTarget.id)) return;
    const next = visibleMilestones.find((milestone) => milestone.fieldKey) ?? visibleMilestones.find((milestone) => milestone.courseIndex);
    setSelectedDateTarget(toDateTarget(next, activeSession));
  }, [activeSession, selectedDateTarget, visibleMilestones]);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  const saveNow = useCallback(
    async (stateToSave = latestState.current) => {
      if (!context.cardId || !context.boardId) {
        setMessage('Ouvrez depuis une carte Trello pour activer la synchro automatique.');
        return;
      }
      const nextHash = calculateSyncHash(stateToSave);
      if (lastDurableHash.current === nextHash) {
        return;
      }
      if (saveInFlight.current) {
        pendingSave.current = true;
        return;
      }

      saveInFlight.current = true;
      let scheduledRetry = false;
      if (retryTimer.current) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      setSyncStatus('saving');
      setMessage('Sauvegarde dans Trello...');
      try {
        await saveDurableState(context.boardId, context.cardId, stateToSave);
        lastDurableHash.current = nextHash;

        let activeMapping = mapping;
        if (!Object.keys(activeMapping).length) {
          const fields = await getBoardCustomFields(context.boardId).catch(() => []);
          activeMapping = buildFieldMapping(fields);
          if (Object.keys(activeMapping).length) setMapping(activeMapping);
        }

        const shouldMirrorVisibleFields = Object.keys(activeMapping).length && Date.now() - lastVisibleFieldSyncAt.current > VISIBLE_FIELD_SYNC_INTERVAL_MS;
        if (shouldMirrorVisibleFields) {
          const visibleState = FORCE_VISIBLE_FIELD_SYNC ? { ...stateToSave, sef_sync_hash: null } : stateToSave;
          const payload = mapLabStateToTrelloPayload(visibleState, activeMapping);
          if (payload.length) {
            await updateCardCustomFields(context.cardId, payload).catch(() => undefined);
            lastVisibleFieldSyncAt.current = Date.now();
            setState((current) => ({
              ...current,
              sef_sync_hash: payload.find((item) => item.fieldKey === 'sef_sync_hash')?.value?.text ?? current.sef_sync_hash,
            }));
          }
        }

        setSyncStatus('synced');
        setMessage(shouldMirrorVisibleFields ? 'Sauvegardé dans Lab Reactor et champs Trello.' : 'Sauvegardé dans Lab Reactor.');
      } catch (error) {
        setSyncStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Erreur de sauvegarde.';
        if (isRateLimitError(errorMessage)) {
          scheduledRetry = true;
          retryTimer.current = window.setTimeout(() => {
            const retryState = pendingSave.current ? latestState.current : stateToSave;
            pendingSave.current = false;
            void saveNow(retryState);
          }, RATE_LIMIT_RETRY_MS);
          setMessage('Trello limite temporairement les requêtes. Brouillon conservé, nouvel essai automatique dans 30 secondes.');
        } else {
          setMessage(errorMessage);
        }
      } finally {
        saveInFlight.current = false;
        if (!scheduledRetry && pendingSave.current) {
          pendingSave.current = false;
          window.setTimeout(() => void saveNow(latestState.current), 250);
        }
      }
    },
    [context.boardId, context.cardId, mapping],
  );

  const createTrelloCardFromBoard = useCallback(async () => {
    if (!context.boardId) {
      setSyncStatus('error');
      setMessage('Impossible de créer la carte: contexte tableau Trello manquant.');
      return;
    }

    setSyncStatus('saving');
    setMessage('Création de la carte Trello...');
    try {
      const cardName = state.sef_school_name ? `Lab Reactor - ${state.sef_school_name}` : 'Nouvelle fiche Lab Reactor';
      const card = await createLabCardOnBoard(context.boardId, cardName, 'Fiche créée depuis le Power-Up Lab Reactor.');
      await saveDurableState(context.boardId, card.id, state);
      lastDurableHash.current = calculateSyncHash(state);

      const ensureResult = await ensureCustomFields(context.boardId);
      const visibleState = { ...state, sef_sync_hash: null };
      const payload = mapLabStateToTrelloPayload(visibleState, ensureResult.mapping);
      if (payload.length) {
        await updateCardCustomFields(card.id, payload).catch(() => undefined);
        lastVisibleFieldSyncAt.current = Date.now();
      }

      setContext({ boardId: context.boardId, cardId: card.id, cardName: card.name });
      setMapping(ensureResult.mapping);
      setSyncStatus('synced');
      setMessage(ensureResult.errors.length ? 'Carte créée et fiche sauvegardée. Certains champs Trello visibles sont partiels.' : 'Carte créée et fiche sauvegardée dans Lab Reactor/Trello.');
    } catch (error) {
      setSyncStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erreur pendant la création de la carte Trello.');
    }
  }, [context.boardId, state]);

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
    saveLocalDraft(context.boardId, context.cardId, state);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [didLoad, hasTrelloContext, saveNow, state]);

  const updateField = (key: FieldKey, value: LabValue) => {
    setState((current) => ({ ...current, [key]: value }));
    if (key === 'sef_session_name') {
      if (value === 'Session 2') setActiveSession(2);
      else if (value === 'Session 3') setActiveSession(3);
      else if (value === 'Session 4') setActiveSession(4);
      else setActiveSession(1);
    }
  };

  const updateSelectedMilestoneDate = (date: string) => {
    const target = selectedDateTarget ?? toDateTarget(selectedMilestone, activeSession);
    if (!target) return;
    updateDateTarget(target, date);
    setMessage(`${selectedMilestone?.label ?? 'Date'}: ${date}.`);
  };

  const updateDateTarget = (target: DateTarget, date: string) => {
    if (target.kind === 'field') {
      updateField(target.key, date || null);
      return;
    }

    const dates = [...readCourseDates(state, target.session)];
    dates[target.index - 1] = date;
    updateField(`sef_s${target.session}_course_dates` as FieldKey, writeCourseDates(dates));
    setCourseSlots((current) => ({ ...current, [target.session]: Math.max(current[target.session], target.index) }));
  };

  const updateMilestoneDate = (milestone: NonNullable<typeof selectedMilestone>, date: string) => {
    const target = toDateTarget(milestone, activeSession);
    if (!target) return;
    setSelectedDateTarget(target);
    updateDateTarget(target, date);
    setMessage(`${milestone.label}: ${date || 'date retirée'}.`);
  };

  return (
    <main className="lab-shell">
      <header className="lab-topbar">
        <div className="brand-row">
          <div className="brand-mark"><FlaskConical size={24} /></div>
          <div>
            <p className="eyebrow">Lab Reactor</p>
            <h1>Fiche de proposition parascolaire</h1>
            <p className="hero-copy">{valueOrDash(state.sef_school_name)} · {valueOrDash(state.sef_season)} {valueOrDash(state.sef_school_year)} · {valueOrDash(state.sef_program)}</p>
          </div>
        </div>
        <div className="header-metrics">
          <span>Dernière sauvegarde: auto</span>
          <div className={`sync-pill ${syncStatus}`}><span />{labelForSync(syncStatus)}</div>
        </div>
      </header>

      <div className="lab-layout">
        <aside className="lab-nav" aria-label="Navigation Lab Reactor">
          <div className="completion-card">
            <div className="score-ring" style={{ '--score': validation.score } as CSSProperties}>
              <strong>{validation.score}%</strong>
              <span>{validation.status}</span>
            </div>
            <p>{priorityCompletion}% des champs rapides remplis</p>
          </div>
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="lab-content">
          {activeTab === 'general' && (
            <section className="panel-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">1. Informations générales</p>
                  <h2>École, contact et contexte</h2>
                </div>
              </div>
              <div className="quick-columns">
                {QUICK_FIELD_COLUMNS.map((column, index) => (
                  <div className="quick-column" key={index}>
                    {column.map((key) => <FieldInput key={key} field={FIELD_BY_KEY[key]} value={state[key]} onChange={(value) => updateField(key, value)} />)}
                  </div>
                ))}
              </div>
              <div className="quick-extra">
                {EXTRA_QUICK_FIELDS.map((key) =>
                  key === 'sef_school_year' ? (
                    <YearSelect key={key} value={state[key]} onChange={(value) => updateField(key, value)} />
                  ) : (
                    <FieldInput key={key} field={FIELD_BY_KEY[key]} value={state[key]} onChange={(value) => updateField(key, value)} />
                  ),
                )}
              </div>
              <div className="wide-field">
                <FieldInput field={FIELD_BY_KEY.sef_internal_notes} value={state.sef_internal_notes} onChange={(value) => updateField('sef_internal_notes', value)} />
              </div>
            </section>
          )}

          {activeTab === 'program' && (
            <section className="panel-card program-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">2. Programme & prix</p>
                  <h2>Sessions vendues et prix manuels</h2>
                </div>
                <div className="program-total">
                  <span>{pricedSessionCount} session{pricedSessionCount > 1 ? 's' : ''}</span>
                  <strong>{totalSessionPrice.toFixed(2)} $</strong>
                </div>
              </div>

              <div className="program-grid">
                <FieldInput field={FIELD_BY_KEY.sef_program} value={state.sef_program} onChange={(value) => updateField('sef_program', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_group_target} value={state.sef_group_target} onChange={(value) => updateField('sef_group_target', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_grade_range} value={state.sef_grade_range} onChange={(value) => updateField('sef_grade_range', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_weeks} value={state.sef_weeks} onChange={(value) => updateField('sef_weeks', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_day_of_week} value={state.sef_day_of_week} onChange={(value) => updateField('sef_day_of_week', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_start_time} value={state.sef_start_time} onChange={(value) => updateField('sef_start_time', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_end_time} value={state.sef_end_time} onChange={(value) => updateField('sef_end_time', value)} />
                <FieldInput field={FIELD_BY_KEY.sef_room} value={state.sef_room} onChange={(value) => updateField('sef_room', value)} />
              </div>

              <div className="session-tabs roomy">
                {SESSION_NUMBERS.map((session) => (
                  <button key={session} type="button" className={activeSession === session ? 'active' : ''} onClick={() => setActiveSession(session)}>
                    Session {session}
                  </button>
                ))}
              </div>

              <div className="session-pricing-grid">
                {SESSION_NUMBERS.map((session) => {
                  const themeKey = `sef_s${session}_theme` as FieldKey;
                  const priceKey = `sef_s${session}_price` as FieldKey;
                  const price = Number(state[priceKey]) || 0;
                  return (
                    <article className={`session-price-card ${activeSession === session ? 'active' : ''}`} key={session}>
                      <button type="button" className="session-card-header" onClick={() => setActiveSession(session)}>
                        <strong>Session {session}</strong>
                        <span>{price > 0 ? `${price.toFixed(2)} $` : 'Prix à saisir'}</span>
                      </button>
                      <FieldInput field={FIELD_BY_KEY[themeKey]} value={state[themeKey]} onChange={(value) => updateField(themeKey, value)} />
                      <FieldInput field={FIELD_BY_KEY[priceKey]} value={state[priceKey]} onChange={(value) => updateField(priceKey, value)} />
                    </article>
                  );
                })}
              </div>

              <div className="course-planner">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Cours rapides</p>
                    <h2>Session {activeSession}</h2>
                  </div>
                  {visibleCourseCount < 12 && (
                    <button type="button" onClick={() => setCourseSlots((current) => ({ ...current, [activeSession]: Math.min(12, current[activeSession] + 1) }))}>
                      <Plus size={17} />Ajouter cours
                    </button>
                  )}
                </div>
                <div className="course-grid">
                  {Array.from({ length: visibleCourseCount }, (_, index) => {
                    const courseIndex = index + 1;
                    return (
                      <button
                        key={courseIndex}
                        type="button"
                        className={`course-chip ${selectedDateTarget?.kind === 'course' && selectedDateTarget.index === courseIndex ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab('dates');
                          setSelectedDateTarget({ kind: 'course', id: `course_${courseIndex}`, session: activeSession, index: courseIndex });
                        }}
                      >
                        Cours {courseIndex}<span>{activeCourseDates[index] ?? 'Date à choisir'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'dates' && (
            <section className="planning-board refined" aria-label="Dates et calendrier">
              <div className="planning-sidebar">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">3. Dates importantes</p>
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
                  <input
                    type="date"
                    value={selectedMilestone?.date ?? ''}
                    onChange={(event) => updateSelectedMilestoneDate(event.target.value)}
                  />
                </div>
                <div className="milestone-list">
                  {visibleMilestones.map((milestone) => {
                    const target = toDateTarget(milestone, activeSession);
                    return (
                      <div key={milestone.id} className={`milestone-row ${milestone.tone} ${selectedMilestone?.id === milestone.id ? 'selected' : ''}`}>
                        <button type="button" className="milestone-main" onClick={() => setSelectedDateTarget(target)}>
                          <span className="milestone-tone" />
                          <strong>{milestone.label}</strong>
                          <em>{milestone.status}</em>
                        </button>
                        <input
                          type="date"
                          value={milestone.date ?? ''}
                          onChange={(event) => updateMilestoneDate(milestone, event.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <CalendarPanel
                calendarMonths={calendarMonths}
                milestoneDates={milestoneDates}
                selectedMilestone={selectedMilestone}
                onDateSelect={updateSelectedMilestoneDate}
                yearLabel={formatSchoolYearRange(calendarMonths)}
              />
            </section>
          )}

          {activeTab === 'summary' && (
            <section className="panel-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">4. Résumé & validation</p>
                  <h2>{validation.status}</h2>
                </div>
                <button type="button" onClick={() => window.print()}><Printer size={18} />Imprimer</button>
              </div>
              <section className="validation-panel" aria-label="Validation opérationnelle">
                <div className="score-ring" style={{ '--score': validation.score } as CSSProperties}>
                  <strong>{validation.score}%</strong>
                  <span>{validation.status}</span>
                </div>
                <div>
                  <p>{validation.alerts.length ? `${validation.alerts.length} alerte(s) à régler.` : 'La proposition est prête à présenter.'}</p>
                </div>
                {validation.alerts.length > 0 && (
                  <div className="alerts">
                    {validation.alerts.map((alert) => <div key={alert.message} className={`alert ${alert.level}`}><AlertTriangle size={17} />{alert.message}</div>)}
                  </div>
                )}
              </section>
              <div className="summary-panel embedded">
                <pre>{buildSummary(state)}</pre>
              </div>
              <details className="payload-preview">
                <summary>Payload Make webhook optionnel</summary>
                <pre>{JSON.stringify(makePayload, null, 2)}</pre>
              </details>
            </section>
          )}
        </section>

        <aside className="quick-summary-panel">
          <h2>Résumé rapide</h2>
          <dl>
            <dt>École</dt><dd>{valueOrDash(state.sef_school_name)}</dd>
            <dt>Contact</dt><dd>{valueOrDash(state.sef_contact_name)}</dd>
            <dt>Sessions vendues</dt><dd>{pricedSessionCount || '-'}</dd>
            <dt>Total sessions</dt><dd>{totalSessionPrice.toFixed(2)} $</dd>
            <dt>Statut</dt><dd>{valueOrDash(state.sef_status)}</dd>
          </dl>
          <div className="sync-checks">
            <span className={context.cardId ? 'ok' : ''}><CheckCircle2 size={15} />Carte</span>
            <span className={context.boardId ? 'ok' : ''}><CheckCircle2 size={15} />Board</span>
            <span className={Object.keys(mapping).length >= REQUIRED_MAPPING_COUNT ? 'ok' : ''}><CheckCircle2 size={15} />Champs SEF</span>
          </div>
          <p className="auto-sync-note"><RefreshCcw size={16} />{message}</p>
        </aside>
      </div>

      <footer className="lab-actiondock" aria-label="Actions rapides">
        {context.boardId && !context.cardId && (
          <button type="button" className="primary-action" onClick={createTrelloCardFromBoard}>
            <Plus size={18} />Créer carte Trello
          </button>
        )}
        <button type="button" onClick={() => window.print()}><Printer size={18} />Imprimer</button>
        <strong>{hasTrelloContext ? 'Trello sync' : 'Mode local'}</strong>
      </footer>
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

function CalendarPanel({
  calendarMonths,
  milestoneDates,
  selectedMilestone,
  onDateSelect,
  yearLabel,
}: {
  calendarMonths: ReturnType<typeof generateSchoolCalendarMonths>;
  milestoneDates: Array<{ date: string; tone: MilestoneTone; label: string }>;
  selectedMilestone: { date: string | null; tone: MilestoneTone } | undefined;
  onDateSelect: (date: string) => void;
  yearLabel: string;
}) {
  return (
    <div className="calendar-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Calendrier 12 mois</p>
          <h2>{yearLabel}</h2>
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
            onDateSelect={onDateSelect}
          />
        ))}
      </div>
    </div>
  );
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatSchoolYearRange(months: ReturnType<typeof generateSchoolCalendarMonths>): string {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return '-';
  return `Août ${first.year} à juillet ${last.year}`;
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

function YearSelect({ value, onChange }: { value: LabValue; onChange: (value: LabValue) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
  return (
    <label className="field" htmlFor="field-sef_school_year">
      <span>Année civile</span>
      <select id="field-sef_school_year" value={String(value ?? currentYear)} onChange={(event) => onChange(event.target.value)}>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
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

function chooseBestSavedState(sources: SavedStateSource[]): { label: string; state: LabState } | null {
  const ranked = sources
    .filter((source): source is SavedStateSource & { state: LabState } => Boolean(source.state))
    .map((source) => ({ ...source, score: scoreSavedState(source.state), savedAtMs: source.savedAt ? Date.parse(source.savedAt) || 0 : 0 }))
    .filter((source) => source.score > 0)
    .sort((left, right) => right.score - left.score || right.savedAtMs - left.savedAtMs);

  return ranked[0] ? { label: ranked[0].label, state: ranked[0].state } : null;
}

function scoreSavedState(savedState: LabState): number {
  const technicalKeys = new Set<FieldKey>(TECHNICAL_FIELD_KEYS);
  const visibleKeys = new Set<FieldKey>(VISIBLE_TRELLO_FIELD_REGISTRY.map((field) => field.key as FieldKey));
  return (Object.entries(savedState) as Array<[FieldKey, LabValue]>).reduce((score, [key, value]) => {
    if (technicalKeys.has(key) || value === null || value === '' || value === false) return score;
    if (PRIORITY_FIELD_KEYS.includes(key)) return score + 5;
    if (visibleKeys.has(key)) return score + 2;
    return score + 1;
  }, 0);
}

function localDraftKey(boardId: string, cardId: string): string {
  return `${LOCAL_DRAFT_PREFIX}${boardId}:${cardId}`;
}

function readLocalDraft(boardId: string, cardId: string): SavedStateSource | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey(boardId, cardId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: Partial<LabState> };
    const stateFromDraft = parseSavedState(parsed.state);
    return stateFromDraft ? { label: 'brouillon local', state: stateFromDraft, savedAt: parsed.savedAt ?? null } : null;
  } catch {
    return null;
  }
}

function saveLocalDraft(boardId: string | null, cardId: string | null, stateToSave: LabState): void {
  if (!boardId || !cardId) return;
  try {
    window.localStorage.setItem(localDraftKey(boardId, cardId), JSON.stringify({ savedAt: new Date().toISOString(), state: stateToSave }));
  } catch {
    // Local draft is best-effort only.
  }
}

function isRateLimitError(message: string): boolean {
  return message.includes('429') || message.includes('RATE_LIMIT') || message.includes('API_TOKEN_LIMIT_EXCEEDED');
}

async function readTrelloContext(): Promise<TrelloContext> {
  const params = new URLSearchParams(window.location.search);
  const paramBoardId = params.get('boardId');
  const paramCardId = params.get('cardId');
  const paramCardName = params.get('cardName');
  if (paramBoardId && paramCardId) {
    return { boardId: paramBoardId, cardId: paramCardId, cardName: paramCardName ?? 'Carte Lab Reactor' };
  }
  if (paramBoardId) {
    return { boardId: paramBoardId, cardId: null, cardName: 'Mode tableau' };
  }

  const t = window.TrelloPowerUp?.iframe?.(TRELLO_IFRAME_OPTIONS);
  if (!t) return { boardId: null, cardId: null, cardName: 'Carte locale' };
  const signedContext = readSignedContext(t);
  try {
    const [board, card] = await Promise.all([t.board('id'), t.card('id', 'name')]);
    const boardData = board as { id?: string };
    const cardData = card as { id?: string; name?: string };
    return {
      boardId: boardData.id ?? signedContext.boardId,
      cardId: cardData.id ?? signedContext.cardId,
      cardName: cardData.name ?? paramCardName ?? 'Carte Trello',
    };
  } catch {
    try {
      const board = await t.board('id');
      const boardData = board as { id?: string };
      return { boardId: boardData.id ?? signedContext.boardId, cardId: signedContext.cardId, cardName: paramCardName ?? 'Mode tableau' };
    } catch {
      return { boardId: signedContext.boardId, cardId: signedContext.cardId, cardName: paramCardName ?? 'Carte locale' };
    }
  }
}

function readSignedContext(t: { getContext?: () => unknown }): { boardId: string | null; cardId: string | null } {
  try {
    const context = t.getContext?.() as { board?: string; card?: string } | undefined;
    return {
      boardId: typeof context?.board === 'string' ? context.board : null,
      cardId: typeof context?.card === 'string' ? context.card : null,
    };
  } catch {
    return { boardId: null, cardId: null };
  }
}

async function readPowerUpSnapshot(): Promise<PowerUpSnapshot | null> {
  const t = window.TrelloPowerUp?.iframe?.(TRELLO_IFRAME_OPTIONS);
  if (!t) return null;

  const [boardResult, cardResult] = await Promise.allSettled([
    t.board('customFields'),
    t.card('desc', 'customFieldItems'),
  ]);
  const board = boardResult.status === 'fulfilled' ? boardResult.value as { customFields?: TrelloCustomField[] } : {};
  const card = cardResult.status === 'fulfilled' ? cardResult.value as { desc?: string; customFieldItems?: TrelloCustomFieldItem[] } : {};

  return {
    fields: Array.isArray(board.customFields) ? board.customFields : [],
    items: Array.isArray(card.customFieldItems) ? card.customFieldItems : [],
    desc: typeof card.desc === 'string' ? card.desc : null,
  };
}

function readPayloadBackupFromItems(fields: TrelloCustomField[], items: TrelloCustomFieldItem[]): SavedStateSource | null {
  if (!fields.length) return null;
  const payloadField = fields.find((field) => field.name === LAB_REACTOR_PAYLOAD_FIELD_NAME);
  if (!payloadField) return null;
  const item = items.find((candidate) => candidate.idCustomField === payloadField.id);
  const parsed = parseSavedStateSource(item?.value?.text);
  return parsed ? { label: 'payload Trello', ...parsed } : null;
}

async function readPayloadBackupFromField(boardId: string, cardId: string): Promise<SavedStateSource | null> {
  const parsed = parseSavedStateSource(await readLabPayloadField(boardId, cardId));
  return parsed ? { label: 'payload Trello', ...parsed } : null;
}

function readVisibleCustomFieldState(fields: TrelloCustomField[], items: TrelloCustomFieldItem[]): LabState | null {
  if (!fields.length) return null;
  return mapTrelloToLabState(fields, items);
}

async function readDescriptionBackup(cardId: string): Promise<SavedStateSource | null> {
  try {
    const value = await readLabPayloadFromDescription(cardId);
    return readDescriptionBackupFromText(value);
  } catch {
    return null;
  }
}

function readDescriptionBackupFromText(value: string | null): SavedStateSource | null {
  const payload = value?.includes('LAB_REACTOR_PAYLOAD_START') ? extractLabPayloadFromDescription(value) : value;
  const parsed = parseSavedStateSource(payload);
  return parsed ? { label: 'description Trello', ...parsed } : null;
}

async function saveDurableState(_boardId: string, cardId: string, stateToSave: LabState): Promise<void> {
  const serialized = JSON.stringify({ savedAt: new Date().toISOString(), state: stateToSave });
  const writes: Array<Promise<unknown>> = [
    writeLabPayloadField(_boardId, cardId, serialized),
  ];
  const results = await Promise.allSettled(writes);
  if (results.every((result) => result.status === 'rejected')) {
    const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason;
    throw firstError instanceof Error ? firstError : new Error('Impossible de sauvegarder dans Trello.');
  }
  void removeLabPayloadFromDescription(cardId).catch(() => undefined);
}

function parseSavedState(value: unknown): LabState | null {
  return parseSavedStateSource(value)?.state ?? null;
}

function parseSavedStateSource(value: unknown): { state: LabState; savedAt?: string | null } | null {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    if ('state' in parsed && parsed.state && typeof parsed.state === 'object') {
      return {
        state: createEmptyLabState(parsed.state as Partial<LabState>),
        savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
      };
    }

    return {
      state: createEmptyLabState(parsed as Partial<LabState>),
      savedAt: typeof (parsed as Partial<LabState>).sef_last_synced_at === 'string' ? String((parsed as Partial<LabState>).sef_last_synced_at) : null,
    };
  } catch {
    return null;
  }
}

function toDateTarget(milestone: { id: string; fieldKey?: FieldKey; courseIndex?: number } | undefined, session: SessionNumber): DateTarget | null {
  if (!milestone) return null;
  if (milestone.fieldKey) return { kind: 'field', id: milestone.id, key: milestone.fieldKey };
  if (milestone.courseIndex) return { kind: 'course', id: milestone.id, session, index: milestone.courseIndex };
  return null;
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
