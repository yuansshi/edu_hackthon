import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Compass,
  Download,
  Flower2,
  Headphones,
  Heart,
  Lightbulb,
  LockKeyhole,
  Map,
  MessageCircle,
  Pause,
  PencilLine,
  Puzzle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sprout,
  Volume2,
  X,
} from 'lucide-react';
import { questions, buildReport, toggleChoice } from './assessment';
import type { Answer, Correction, Question } from './assessment';
import { createActivity } from './activityModel';
import type { ActivityId, ActivityRecord } from './activityModel';
import { Activities } from './Activities';
import { Profile } from './Profile';
import { DiscoveryArt } from './DiscoveryArt';
import {
  canUseRoutine,
  createSession,
  FOCUS_MINUTES,
  formatReflectionWindow,
  PAUSE_MINUTES,
  recordActivity,
  recordAnswer,
  recordCorrection,
  restoreSession,
  STORAGE_KEY,
} from './model';
import type { Routine, Session } from './model';
import { createTeachingProfile } from './handoff';
import { LessonPreview } from './LessonPreview';
import { createCombinedDemo } from './combinedDemo';
import type { CombinedDemoKind } from './combinedDemo';
import './App.css';
import './App-pages.css';
import './App-responsive.css';
import './CombinedDemo.css';

const combinedRehearsal = new URLSearchParams(window.location.search).get('demo') === 'combined';

type Screen =
  | { kind: 'home' }
  | { kind: 'questions'; index: number; returnToReport: boolean }
  | { kind: 'hub' }
  | { kind: 'activity'; id: ActivityId; returnToReport: boolean }
  | { kind: 'report' }
  | { kind: 'routine' }
  | { kind: 'lesson' };
type Dialog = 'welcome' | 'pause' | 'about' | 'settings' | 'reset' | null;
function loadInitial() {
  if (combinedRehearsal) {
    return { session: createSession(), notice: '' };
  }
  try {
    return restoreSession(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {
      session: createSession(),
      notice: 'This browser can’t save a visit. You can still explore while this page stays open.',
    };
  }
}
function hasResponse(answer: Answer | undefined): boolean {
  return !!answer && (answer.kind === 'skipped' || answer.values.length > 0);
}
function downloadFile(text: string, format: 'text' | 'json') {
  const url = URL.createObjectURL(
    new Blob([text], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `my-learning-discovery.${format === 'json' ? 'json' : 'txt'}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-label={title}>
      <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}>
        <X size={21} />
      </button>
      {children}
    </dialog>
  );
}

export default function App() {
  const [initial] = useState(loadInitial);
  const [session, setSession] = useState<Session>(initial.session);
  const [notice, setNotice] = useState(initial.notice);
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [largeText, setLargeText] = useState(false);
  const answered = questions.filter((question) => hasResponse(session.answers[question.id])).length;
  const started = answered > 0 || session.activities.some((activity) => activity.status !== 'new');
  useEffect(() => {
    if (combinedRehearsal || !session.remember) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      let removed = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        removed = false;
      }
      setNotice(
        removed
          ? 'We couldn’t save this visit, so we cleared the older saved copy. Your current visit still works while this page stays open.'
          : 'This browser blocked saving and clearing. An older visit may remain. Use browser site-data settings to remove it; your current visit still works here.',
      );
      setSession((current) => ({ ...current, remember: false }));
    }
  }, [session]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.getElementById('screen-title')?.focus({ preventScroll: true });
  }, [screen.kind, screen.kind === 'questions' ? screen.index : null]);
  function remember(enabled: boolean) {
    if (combinedRehearsal) {
      setNotice('This rehearsal stays in memory. Your saved discovery visit is unchanged.');
      return;
    }
    if (!enabled) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        setNotice(
          'This browser blocked saved-data changes. Check its site-data settings to remove an older visit.',
        );
      }
    }
    setSession((current) => ({ ...current, remember: enabled }));
  }
  function begin() {
    const index = questions.findIndex((question) => !hasResponse(session.answers[question.id]));
    setScreen({ kind: 'questions', index: index === -1 ? 0 : index, returnToReport: false });
    setDialog(null);
  }
  function start() {
    if (answered === questions.length) setScreen({ kind: 'hub' });
    else if (started) begin();
    else setDialog('welcome');
  }
  function answer(id: string, value: Answer) {
    setSession((current) => recordAnswer({ session: current, id, answer: value }));
  }
  function activityChanged(activity: ActivityRecord) {
    setSession((current) => recordActivity({ session: current, activity }));
  }
  function correctionChanged(correction: Correction) {
    setSession((current) => recordCorrection({ session: current, correction }));
  }
  function nextQuestion() {
    if (screen.kind !== 'questions') return;
    if (screen.returnToReport) setScreen({ kind: 'report' });
    else if (screen.index + 1 < questions.length) setScreen({ ...screen, index: screen.index + 1 });
    else setScreen({ kind: 'hub' });
  }
  function editSource(sourceId: string) {
    const index = questions.findIndex((question) => question.id === sourceId);
    if (index !== -1) {
      setScreen({ kind: 'questions', index, returnToReport: true });
      return;
    }
    const id = sourceId.startsWith('LDS-A01')
      ? 'rules'
      : sourceId.startsWith('LDS-A02')
        ? 'design'
        : sourceId.startsWith('LDS-A03')
          ? 'focus'
          : null;
    if (id) setScreen({ kind: 'activity', id, returnToReport: true });
  }
  function readAloud(text: string) {
    if (!('speechSynthesis' in window)) {
      setNotice(
        'Read aloud isn’t available here. You can use your device’s reader or read with someone.',
      );
      return;
    }
    const voice = speechSynthesis
      .getVoices()
      .find((item) => item.localService && item.lang.startsWith('en'));
    if (!voice) {
      setNotice(
        'A local reading voice isn’t available here. You can use your device’s reader or read with someone.',
      );
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }
  function exportProfile(format: 'text' | 'json') {
    const report = buildReport({
      answers: session.answers,
      activities: session.activities,
      corrections: session.corrections,
    });
    if (format === 'json') {
      downloadFile(
        JSON.stringify(
          {
            assessment: 'Learning Strength Discovery',
            status: 'Original pilot',
            session,
            report,
            teachingProfile: canUseRoutine(session) ? createTeachingProfile(session) : null,
          },
          null,
          2,
        ),
        format,
      );
      return;
    }
    const lines = [
      'LEARNING STRENGTH DISCOVERY',
      `A first picture${session.name ? ` for ${session.name}` : ''}. These findings can change.`,
      `Recent-habit reflection window: ${formatReflectionWindow(session.reflectionWindow)}. Saved answers retain this original window; activity work and new-activity preferences are separate.`,
      '',
      ...report.flatMap((section) => [
        section.title.toUpperCase(),
        section.summary,
        ...section.said.map((line) => `You said: ${line.text} [${line.sourceId}]`),
        ...section.observed.map((line) => `In this activity: ${line.text} [${line.sourceId}]`),
        `Still open: ${section.unknown}`,
        ...section.tryNext.map((text) => `To try: ${text}`),
        section.correction ? `Your say: ${section.correction.note || 'Leave this open.'}` : '',
        '',
      ]),
    ];
    if (session.routine.acceptedRevision === session.revision && canUseRoutine(session))
      lines.push(
        'YOUR CHOSEN TRIAL',
        JSON.stringify(session.routine.choices, null, 2),
        'Times are your trial choices, not measured concentration.',
      );
    downloadFile(lines.join('\n'), format);
  }
  function clearVisit() {
    try {
      if (!combinedRehearsal) localStorage.removeItem(STORAGE_KEY);
    } catch {
      setNotice(
        'This page was reset, but the browser blocked saved-data removal. Check browser site-data settings to remove an older visit.',
      );
    }
    setSession(createSession());
    setScreen({ kind: 'home' });
    setDialog(null);
  }
  function loadExample(kind: CombinedDemoKind) {
    const example = createCombinedDemo(kind);
    setSession(example);
    setNotice(
      'Synthetic rehearsal: these prepared answers are editable; unanswered areas remain unknown.',
    );
    setDialog(null);
    setScreen({
      kind: 'questions',
      index: Math.max(
        0,
        questions.findIndex((question) => hasResponse(example.answers[question.id])),
      ),
      returnToReport: true,
    });
  }
  const lessonReady =
    canUseRoutine(session) && session.routine.acceptedRevision === session.revision;
  function openLesson() {
    if (!lessonReady) {
      setNotice(
        'Review your current discoveries and confirm your arrangement before building a lesson.',
      );
      setScreen({ kind: 'report' });
      return;
    }
    setScreen({ kind: 'lesson' });
  }
  const currentQuestion = screen.kind === 'questions' ? questions[screen.index] : undefined;
  const activeActivity =
    screen.kind === 'activity'
      ? (session.activities.find((activity) => activity.id === screen.id) ??
        createActivity(screen.id))
      : undefined;
  return (
    <div className={`app screen-${screen.kind} ${largeText ? 'large-text' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => setScreen({ kind: 'home' })}
          aria-label="Learning Strength Discovery home"
        >
          <span className="brand-icon">
            <Flower2 size={27} strokeWidth={1.7} />
          </span>
          <span>
            Learning Strength<span>Discovery</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            aria-label="Your journey"
            className={`nav-item ${screen.kind === 'home' || screen.kind === 'hub' ? 'active' : ''}`}
            onClick={() => setScreen({ kind: 'home' })}
          >
            <Map size={17} />
            <span>Your journey</span>
          </button>
          <button
            aria-label="My discoveries"
            className={`nav-item ${screen.kind === 'report' ? 'active' : ''}`}
            onClick={() => setScreen({ kind: 'report' })}
          >
            <Sprout size={17} />
            <span>My discoveries</span>
          </button>
        </nav>
        <div className="header-tools">
          <button className="grownups-link" onClick={() => setDialog('about')}>
            For grown-ups
          </button>
          <button
            className="icon-button"
            aria-label="Open settings"
            onClick={() => setDialog('settings')}
          >
            <Settings2 size={20} />
          </button>
          {screen.kind !== 'home' && (
            <button
              aria-label="Pause"
              className="pause-button"
              onClick={() => {
                if ('speechSynthesis' in window) speechSynthesis.cancel();
                setDialog('pause');
              }}
            >
              <Pause size={15} />
              <span>Pause</span>
            </button>
          )}
        </div>
      </header>
      {combinedRehearsal && (
        <section className="combined-rehearsal" aria-label="Combined rehearsal controls">
          <div>
            <strong>Smart Pants · combined preview</strong>
            <p>Explore a real Discovery question, review the profile, then build a lesson.</p>
            <small>
              Synthetic Grade 5 examples · teacher-selected foundational math review · memory only
            </small>
          </div>
          <div className="combined-rehearsal-actions">
            <button className="btn btn-secondary" onClick={() => loadExample('guided')}>
              Load Maya example
            </button>
            <button className="btn btn-secondary" onClick={() => loadExample('challenge')}>
              Load Leo example
            </button>
            <button className="text-button" onClick={clearVisit}>
              Start fresh
            </button>
          </div>
        </section>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      <main id="main-content">
        {screen.kind === 'home' && (
          <Home
            started={started}
            answered={answered}
            onStart={start}
            onHow={() => setDialog('about')}
            onExplore={() => setScreen({ kind: 'hub' })}
            onProfile={() => setScreen({ kind: 'report' })}
          />
        )}
        {screen.kind === 'hub' && (
          <Hub
            session={session}
            answered={answered}
            onQuestions={begin}
            onActivity={(id) => setScreen({ kind: 'activity', id, returnToReport: false })}
            onProfile={() => setScreen({ kind: 'report' })}
          />
        )}
        {screen.kind === 'questions' && currentQuestion && (
          <QuestionView
            question={currentQuestion}
            index={screen.index}
            reflectionDates={formatReflectionWindow(session.reflectionWindow)}
            answer={session.answers[currentQuestion.id]}
            onAnswer={(value) => answer(currentQuestion.id, value)}
            onNext={nextQuestion}
            onBack={() =>
              screen.returnToReport
                ? setScreen({ kind: 'report' })
                : screen.index
                  ? setScreen({ ...screen, index: screen.index - 1 })
                  : setScreen({ kind: 'home' })
            }
            onSkip={() => {
              answer(currentQuestion.id, { kind: 'skipped' });
              nextQuestion();
            }}
            onRead={() => readAloud(`${currentQuestion.context} ${currentQuestion.prompt}`)}
            returning={screen.returnToReport}
          />
        )}
        {screen.kind === 'activity' && activeActivity && (
          <div className="activity-shell">
            <Activities
              activity={activeActivity}
              onChange={activityChanged}
              onExit={() => setScreen(screen.returnToReport ? { kind: 'report' } : { kind: 'hub' })}
              onComplete={() =>
                setScreen(screen.returnToReport ? { kind: 'report' } : { kind: 'hub' })
              }
            />
          </div>
        )}
        {screen.kind === 'report' && (
          <Profile
            session={session}
            onCorrection={correctionChanged}
            onReview={() =>
              setSession((current) => ({ ...current, reviewedRevision: current.revision }))
            }
            onEditSource={editSource}
            onContinue={() => setScreen({ kind: 'routine' })}
            onExport={exportProfile}
            onExit={() => setScreen({ kind: 'hub' })}
          />
        )}
        {screen.kind === 'routine' && (
          <RoutineView
            session={session}
            onBack={() => setScreen({ kind: 'report' })}
            onChange={(choices) =>
              setSession((current) => ({
                ...current,
                routine: { choices, acceptedRevision: null },
              }))
            }
            onSave={() => {
              if (canUseRoutine(session))
                setSession((current) => ({
                  ...current,
                  routine: { ...current.routine, acceptedRevision: current.revision },
                }));
            }}
            onExport={() => exportProfile('text')}
            onLesson={openLesson}
          />
        )}
        {screen.kind === 'lesson' &&
          (lessonReady ? (
            <LessonPreview
              key={session.revision}
              profile={createTeachingProfile(session)}
              onBack={() => setScreen({ kind: 'routine' })}
            />
          ) : (
            <section className="page-width">
              <h1 id="screen-title" tabIndex={-1}>
                Review the current profile first.
              </h1>
              <p>
                Your choices changed. Review your discoveries and confirm your arrangement again.
              </p>
              <button className="btn btn-primary" onClick={() => setScreen({ kind: 'report' })}>
                Review my discoveries
              </button>
            </section>
          ))}
      </main>
      <footer className="site-footer">
        <span>
          <Sprout size={16} /> A little discovery, at your own pace.
        </span>
        <button onClick={() => setDialog('about')}>About this discovery</button>
        <span className="footer-pilot">Made for grades 5–8 · Pilot edition</span>
      </footer>
      {dialog === 'welcome' && (
        <Modal title="Before your discovery" onClose={() => setDialog(null)}>
          <div className="modal-emblem">
            <Compass size={32} />
          </div>
          <span className="eyebrow">A LITTLE HELLO</span>
          <h2>Make yourself at home.</h2>
          <p>
            We’ll explore what helps you learn. You can skip anything, ask for help, or take a
            break.
          </p>
          <label className="field-label" htmlFor="learner-name">
            What should we call you? <span>Optional. A nickname is fine.</span>
          </label>
          <input
            id="learner-name"
            maxLength={30}
            placeholder="Your nickname"
            value={session.name}
            onChange={(event) =>
              setSession((current) => ({ ...current, name: event.target.value }))
            }
          />
          <label className="field-label" htmlFor="learner-grade">
            Your grade <span>Optional</span>
          </label>
          <select
            id="learner-grade"
            value={session.grade}
            onChange={(event) => {
              const grade = event.target.value;
              if (
                grade === '5' ||
                grade === '6' ||
                grade === '7' ||
                grade === '8' ||
                grade === 'unspecified'
              )
                setSession((current) => ({ ...current, grade }));
            }}
          >
            <option value="unspecified">I’d rather not say</option>
            <option value="5">Grade 5</option>
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
          </select>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={session.remember}
              onChange={(event) => remember(event.target.checked)}
            />
            <span>
              Remember my visit on this browser
              <small>
                Leave this off on a shared device. Otherwise, closing or refreshing this page starts
                a new visit.
              </small>
            </span>
          </label>
          <div className="soft-note">
            <LockKeyhole size={18} />
            <span>
              No account needed. The app sends no answers to a server. Anyone using a saved browser
              visit may see it.
            </span>
          </div>
          <button className="btn btn-primary full-width" onClick={begin}>
            I’m ready to explore <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {dialog === 'pause' && (
        <Modal title="Take a breather" onClose={() => setDialog(null)}>
          <div className="modal-emblem peach">
            <Headphones size={32} />
          </div>
          <span className="eyebrow">ROOM TO BREATHE</span>
          <h2>Your discovery can wait.</h2>
          <p>Stretch, get some water, or look out the window. There’s no clock to beat.</p>
          <p className="small-copy">
            Your place stays here while this page is open.
            {session.remember
              ? ' This browser is also saving your visit.'
              : ' To come back after closing the page, you can turn on Remember in settings.'}
          </p>
          <button className="btn btn-primary full-width" onClick={() => setDialog(null)}>
            Ready when you are <ArrowRight size={18} />
          </button>
          <button
            className="text-button full-width"
            onClick={() => {
              setDialog(null);
              setScreen({ kind: 'home' });
            }}
          >
            Back to my journey
          </button>
        </Modal>
      )}
      {dialog === 'about' && (
        <Modal title="How discovery works" onClose={() => setDialog(null)}>
          <div className="modal-emblem">
            <Lightbulb size={32} />
          </div>
          <span className="eyebrow">A PICTURE, NOT A LABEL</span>
          <h2>There’s a lot to learn about learning.</h2>
          <p>
            Learning Strength Discovery is an original pilot for grades 5–8. It combines recent
            habits, choices, and small activities.
          </p>
          <ol className="how-list">
            <li>
              <span>1</span>
              <div>
                <strong>Tell us what fits.</strong>
                <p>Think about the past two weeks. “Depends” and “not sure” belong here too.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Try something new.</strong>
                <p>
                  Explore a rule, make a guide, and spot matches. Hints and breaks are always
                  available.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Have your say.</strong>
                <p>Review eight areas of learning and correct anything that doesn’t fit.</p>
              </div>
            </li>
          </ol>
          <details className="adult-details">
            <summary>For grown-ups: evidence and privacy</summary>
            <p>
              This tool has not been validated as a psychological assessment. It does not measure
              IQ, personality types, subject readiness, or attention capacity. Results separate
              reports, task actions, and unknowns. Any routine is a trial chosen with the learner.
            </p>
            <p>
              No backend, analytics, login, camera, or microphone is used. Optional remembering uses
              this browser’s local storage. Exports are files the learner chooses to download.
              Arrange participation, access support, sharing, and record handling appropriately
              before use with students.
            </p>
          </details>
          <button className="btn btn-primary full-width" onClick={() => setDialog(null)}>
            Got it <Check size={17} />
          </button>
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal title="Make it comfortable" onClose={() => setDialog(null)}>
          <span className="eyebrow">YOUR SPACE</span>
          <h2>Make it comfortable.</h2>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={largeText}
              onChange={(event) => setLargeText(event.target.checked)}
            />
            <span>
              A little bigger text<small>More room for the words.</small>
            </span>
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={session.remember}
              onChange={(event) => remember(event.target.checked)}
            />
            <span>
              Remember on this browser
              <small>
                Someone else using this browser could see your saved visit. Turn off to remove the
                saved copy.
              </small>
            </span>
          </label>
          <div className="settings-actions">
            <button className="btn btn-secondary" onClick={() => exportProfile('json')}>
              <Download size={17} /> Download my visit
            </button>
            <button className="text-button danger" onClick={() => setDialog('reset')}>
              <RotateCcw size={16} /> Clear my visit and start fresh
            </button>
          </div>
        </Modal>
      )}
      {dialog === 'reset' && (
        <Modal title="Start a fresh visit" onClose={() => setDialog(null)}>
          <h2>A fresh page?</h2>
          <p>
            This clears your answers, activities, report comments, and saved visit from this
            browser. Download your visit first if you want to keep a copy.
          </p>
          <button className="btn btn-primary full-width" onClick={clearVisit}>
            Clear this visit
          </button>
          <button className="text-button full-width" onClick={() => setDialog('settings')}>
            Keep my visit
          </button>
        </Modal>
      )}
    </div>
  );
}

function Home({
  started,
  answered,
  onStart,
  onHow,
  onExplore,
  onProfile,
}: {
  started: boolean;
  answered: number;
  onStart: () => void;
  onHow: () => void;
  onExplore: () => void;
  onProfile: () => void;
}) {
  return (
    <div className="home-page page-width">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="status-dot" /> YOUR NEXT LITTLE DISCOVERY
          </div>
          <h1 id="screen-title" tabIndex={-1}>
            A little curiosity.
            <br />A lot to{' '}
            <span className="word-discover">
              discover.
              <svg viewBox="0 0 325 18" aria-hidden="true">
                <path
                  d="M4 12C85 0 223 0 320 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p>
            What helps you focus? What sparks an idea?
            <br className="desktop-break" /> Explore the little things that make learning work for
            you.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-large" onClick={onStart}>
              {started ? 'Continue my discovery' : 'Let’s discover'}
              <ArrowRight size={20} />
            </button>
            <button className="hero-secondary" onClick={onHow}>
              How it works <ChevronRight size={16} />
            </button>
          </div>
          <div className="hero-reassurance">
            <ShieldCheck size={17} />
            <span>No grades. No timer. Room to be you.</span>
          </div>
          {started && (
            <div className="resume-note">
              <Check size={15} />
              {answered} reflections added. Pick up wherever you like.
            </div>
          )}
        </div>
        <DiscoveryArt />
      </section>
      <section className="journey-intro" aria-label="Your discovery journey">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SMALL STEPS. NEW POSSIBILITIES.</span>
            <h2>A discovery in three parts</h2>
          </div>
          <span className="soft-label">
            <Heart size={14} /> Go at your own pace
          </span>
        </div>
        <div className="journey-grid">
          <button className="journey-card card-lilac" onClick={onStart}>
            <div className="journey-top">
              <span className="step-number">01</span>
              <span className="card-symbol">
                <MessageCircle size={24} />
              </span>
            </div>
            <h3>A little about you</h3>
            <p>Tell us what learning feels like. Your honest answers belong here.</p>
            <span className="card-link">
              Meet your learning habits <ArrowRight size={17} />
            </span>
          </button>
          <button className="journey-card card-peach" onClick={onExplore}>
            <div className="journey-top">
              <span className="step-number">02</span>
              <span className="card-symbol">
                <Puzzle size={25} />
              </span>
            </div>
            <h3>A little exploring</h3>
            <p>Play with patterns, make something, and try a new way to think.</p>
            <span className="card-link">
              Choose an activity <ArrowRight size={17} />
            </span>
          </button>
          <button className="journey-card card-sage" onClick={onProfile}>
            <div className="journey-top">
              <span className="step-number">03</span>
              <span className="card-symbol">
                <Sprout size={26} />
              </span>
            </div>
            <h3>A picture of your learning</h3>
            <p>See what you’ve discovered. Add your voice. Choose what to try next.</p>
            <span className="card-link">
              Visit my discoveries <ArrowRight size={17} />
            </span>
          </button>
        </div>
      </section>
      <div className="home-bottom">
        <span className="mini-flower">
          <Flower2 size={25} />
        </span>
        <p>
          Curiosity. Focus. Motivation. And more.
          <br />
          <strong>Eight areas to explore, with your voice at the center.</strong>
        </p>
        <span className="grade-stamp">
          MADE FOR
          <br />
          <strong>GRADES 5–8</strong>
        </span>
      </div>
    </div>
  );
}

const stationCards = [
  {
    id: 'rules',
    name: 'The pattern studio',
    description: 'Meet a new rule. Try a two-step code. See what helps an idea click.',
    label: 'Patterns & new ideas',
    tone: 'lilac',
    Icon: Puzzle,
  },
  {
    id: 'design',
    name: 'Make a little guide',
    description: 'Turn a short brief into something useful. Choose a plan and check it your way.',
    label: 'Planning & support',
    tone: 'peach',
    Icon: PencilLine,
  },
  {
    id: 'focus',
    name: 'Find your focus',
    description:
      'Spot matching pairs, choose a comfortable setup, and notice what you want to try.',
    label: 'Conditions & refocusing',
    tone: 'sage',
    Icon: Compass,
  },
] satisfies {
  id: ActivityId;
  name: string;
  description: string;
  label: string;
  tone: string;
  Icon: typeof Puzzle;
}[];

function Hub({
  session,
  answered,
  onQuestions,
  onActivity,
  onProfile,
}: {
  session: Session;
  answered: number;
  onQuestions: () => void;
  onActivity: (id: ActivityId) => void;
  onProfile: () => void;
}) {
  return (
    <div className="hub-page page-width">
      <div className="page-heading">
        <span className="eyebrow">YOUR DISCOVERY SPACE</span>
        <h1 id="screen-title" tabIndex={-1}>
          Where will curiosity take you{session.name ? `, ${session.name}` : ''}?
        </h1>
        <p>Choose what you’d like to explore. You can change direction or take a break anytime.</p>
      </div>
      <button className="checkin-banner" onClick={onQuestions}>
        <span className="banner-icon">
          <MessageCircle size={27} />
        </span>
        <div>
          <span className="eyebrow">A LITTLE ABOUT YOU</span>
          <h2>
            {answered === questions.length
              ? 'Revisit your reflections'
              : answered
                ? 'Pick up your reflections'
                : 'Start with a few reflections'}
          </h2>
          <p>
            {answered} of {questions.length} prompts visited. “Not sure” and skipping are welcome
            too.
          </p>
        </div>
        <ArrowRight size={24} />
      </button>
      <div className="station-grid">
        {stationCards.map(({ id, name, description, label, tone, Icon }) => {
          const status = session.activities.find((activity) => activity.id === id)?.status ?? 'new';
          return (
            <button className={`station-card card-${tone}`} key={id} onClick={() => onActivity(id)}>
              <div className="station-card-top">
                <span className="station-icon">
                  <Icon size={31} />
                </span>
                <span className="station-status">
                  {status === 'complete'
                    ? 'Ready to revisit'
                    : status === 'working'
                      ? 'Keep exploring'
                      : status === 'skipped'
                        ? 'Skipped for now'
                        : 'Something new'}
                </span>
              </div>
              <h2>{name}</h2>
              <p>{description}</p>
              <span className="station-label">{label}</span>
              <span className="station-arrow">
                <ArrowRight size={20} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="hub-profile">
        <div>
          <Sprout size={26} />
          <span>
            <strong>Your profile can grow with you.</strong>
            <br />
            You can visit it with a little information, or a lot.
          </span>
        </div>
        <button className="btn btn-primary" onClick={onProfile}>
          See my discoveries <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

function QuestionView({
  question,
  index,
  reflectionDates,
  answer,
  onAnswer,
  onNext,
  onBack,
  onSkip,
  onRead,
  returning,
}: {
  question: Question;
  index: number;
  reflectionDates: string;
  answer: Answer | undefined;
  onAnswer: (answer: Answer) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onRead: () => void;
  returning: boolean;
}) {
  const selected = answer?.kind === 'selected' ? answer : undefined;
  const special = new Set(['depends', 'unsure', 'no-chance', 'no-opportunity']);
  const mainOptions = question.options.filter((option) => !special.has(option.value));
  const extraOptions = question.options.filter((option) => special.has(option.value));
  const choose = (value: string) => onAnswer(toggleChoice({ question, current: answer, value }));
  return (
    <div className="question-page page-width">
      <div className="question-toolbar">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={17} />
          {returning ? 'Back to my profile' : 'Back'}
        </button>
        <span>A LITTLE ABOUT YOU</span>
        <button className="text-button read-button" onClick={onRead}>
          <Volume2 size={18} /> Read aloud
        </button>
      </div>
      <div className="question-progress">
        <progress aria-label="Position in reflections" value={index + 1} max={questions.length} />
        <span>
          {index + 1} <span>of {questions.length}</span>
        </span>
      </div>
      <div className="question-layout">
        <section className="question-card">
          <span className="tag">
            <span className="status-dot" />
            {question.section}
          </span>
          <p className="question-context">{question.context}</p>
          {!['pace', 'interaction'].includes(question.dimension) && (
            <p className="small-copy">Your reflection window: {reflectionDates}</p>
          )}
          <h1 id="screen-title" tabIndex={-1}>
            {question.prompt}
          </h1>
          <p className="choice-instruction">
            {question.kind === 'multi'
              ? `Choose up to ${question.maxChoices}, or one “depends” / “not sure” answer.`
              : 'Choose the answer that feels right for you.'}
          </p>
          <div
            className={`choice-grid ${mainOptions.length > 5 ? 'compact-choices' : ''}`}
            role="group"
            aria-label="Answer choices"
          >
            {mainOptions.map((option, optionIndex) => (
              <button
                key={option.value}
                className={`choice ${selected?.values.includes(option.value) ? 'selected' : ''}`}
                aria-pressed={selected?.values.includes(option.value) ?? false}
                onClick={() => choose(option.value)}
              >
                <span className="choice-letter">
                  {selected?.values.includes(option.value) ? (
                    <Check size={18} />
                  ) : (
                    String.fromCharCode(65 + optionIndex)
                  )}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          {extraOptions.length > 0 && (
            <div className="extra-choices">
              {extraOptions.map((option) => (
                <button
                  key={option.value}
                  aria-pressed={selected?.values.includes(option.value) ?? false}
                  className={`choice-chip ${selected?.values.includes(option.value) ? 'selected' : ''}`}
                  onClick={() => choose(option.value)}
                >
                  {selected?.values.includes(option.value) && <Check size={14} />} {option.label}
                </button>
              ))}
            </div>
          )}
          {selected?.values.some((value) => value.includes('other')) && (
            <label className="other-label">
              Your own idea <span>Optional</span>
              <input
                maxLength={200}
                value={selected.other}
                placeholder="What would you like to add?"
                onChange={(event) => onAnswer({ ...selected, other: event.target.value })}
              />
            </label>
          )}
          {answer?.kind === 'skipped' && (
            <p className="small-copy">
              You skipped this before. You can leave it open or choose an answer now.
            </p>
          )}
          <div className="question-actions">
            <button className="text-button" onClick={onSkip}>
              {returning ? 'Leave this open' : 'Skip for now'}
            </button>
            <button className="btn btn-primary" disabled={!hasResponse(answer)} onClick={onNext}>
              {returning
                ? 'Back to my discoveries'
                : index + 1 === questions.length
                  ? 'Explore the activities'
                  : 'Next'}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
        <aside className="question-aside">
          <div className="aside-flower">
            <Flower2 size={49} strokeWidth={1.3} />
          </div>
          <h2>
            There’s room
            <br />
            for “it depends.”
          </h2>
          <p>
            You might feel one way in class and another at home. That’s something to notice, too.
          </p>
          <div className="aside-note">
            <Heart size={17} />
            <span>
              Your answers are yours.
              <br />
              You can always change them.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RoutineView({
  session,
  onBack,
  onChange,
  onSave,
  onExport,
  onLesson,
}: {
  session: Session;
  onBack: () => void;
  onChange: (routine: Routine) => void;
  onSave: () => void;
  onExport: () => void;
  onLesson: () => void;
}) {
  const choice = session.routine.choices;
  const ready = canUseRoutine(session);
  const report = buildReport({
    answers: session.answers,
    activities: session.activities,
    corrections: session.corrections,
  });
  const startingIdeas = report.filter(
    (section) =>
      ['focus', 'pace', 'motivation', 'management', 'confidence', 'interaction'].includes(
        section.id,
      ) && section.tryNext.length > 0,
  );
  const supports = [
    'Visible steps',
    'An example to start',
    'Hints when I ask',
    'Quiet thinking time',
    'A quick check-in',
    'A first-step plan',
  ];
  return (
    <div className="routine-page page-width">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to my discoveries
      </button>
      <div className="page-heading">
        <span className="eyebrow">A SMALL PLAN TO TRY</span>
        <h1 id="screen-title" tabIndex={-1}>
          Make some room for learning.
        </h1>
        <p>
          Your discoveries are a starting point. You choose the arrangement, and you can change it.
        </p>
      </div>
      {!ready && (
        <div className="soft-note">
          <Lightbulb size={20} />
          <div>
            Your discoveries changed. Review the current profile before choosing a routine.
            <button className="text-button" onClick={onBack}>
              Review my discoveries <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
      <div className="routine-layout">
        <section className="routine-card card">
          <h2>
            <Compass size={24} /> My starting rhythm
          </h2>
          <label className="range-label" htmlFor="daily-time">
            Time I have available <strong>{choice.minutes} minutes</strong>
          </label>
          <input
            id="daily-time"
            type="range"
            min={5}
            max={60}
            step={5}
            value={choice.minutes}
            onChange={(event) =>
              onChange({
                ...choice,
                minutes: Number(event.target.value),
                focus: Math.min(choice.focus, Number(event.target.value)),
              })
            }
          />
          <p className="small-copy">
            A window you choose, not a measured focus limit. Finishing earlier is okay.
          </p>
          <div className="rhythm-grid">
            <label>
              Try a focus block
              <select
                aria-label="Try a focus block"
                value={choice.focus}
                onChange={(event) => onChange({ ...choice, focus: Number(event.target.value) })}
              >
                {FOCUS_MINUTES.filter((minutes) => minutes <= choice.minutes).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
            <label>
              Room for a pause
              <select
                aria-label="Room for a pause"
                value={choice.pause}
                onChange={(event) => onChange({ ...choice, pause: Number(event.target.value) })}
              >
                {PAUSE_MINUTES.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="small-copy">
            These are trial ideas. A break is always available, even sooner.
          </p>
          <h2>
            <Heart size={23} /> What feels encouraging?
          </h2>
          <div className="routine-options">
            {[
              { value: 'progress', label: 'Seeing my progress' },
              { value: 'private', label: 'A quiet, specific compliment' },
              { value: 'points', label: 'Optional points or milestones' },
              { value: 'none', label: 'Just the learning itself' },
            ].map((item) => (
              <button
                key={item.value}
                aria-pressed={choice.encouragement === item.value}
                className={`choice-chip ${choice.encouragement === item.value ? 'selected' : ''}`}
                onClick={() => {
                  if (
                    item.value === 'progress' ||
                    item.value === 'private' ||
                    item.value === 'points' ||
                    item.value === 'none'
                  )
                    onChange({ ...choice, encouragement: item.value });
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <h2>
            <Lightbulb size={23} /> Support I’d like available
          </h2>
          <div className="routine-options">
            {supports.map((support) => (
              <button
                key={support}
                aria-pressed={choice.supports.includes(support)}
                className={`choice-chip ${choice.supports.includes(support) ? 'selected' : ''}`}
                onClick={() =>
                  onChange({
                    ...choice,
                    supports: choice.supports.includes(support)
                      ? choice.supports.filter((item) => item !== support)
                      : [...choice.supports, support],
                  })
                }
              >
                {choice.supports.includes(support) && <Check size={14} />} {support}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="challenge-choice">
            My preferred stretch
          </label>
          <select
            id="challenge-choice"
            value={choice.challenge}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'steady' || value === 'stretch' || value === 'choice')
                onChange({ ...choice, challenge: value });
            }}
          >
            <option value="steady">A steady start, then build up</option>
            <option value="stretch">Something to stretch me, with help nearby</option>
            <option value="choice">Let me choose as I go</option>
          </select>
          <p className="small-copy">
            This is a preference. A separate subject check helps choose actual lesson difficulty.
          </p>
          <button className="btn btn-primary full-width" disabled={!ready} onClick={onSave}>
            {session.routine.acceptedRevision === session.revision ? (
              <>
                <Check size={18} /> My trial is saved in this visit
              </>
            ) : (
              <>
                Let’s try this arrangement <ArrowRight size={18} />
              </>
            )}
          </button>
          {ready && session.routine.acceptedRevision === session.revision && (
            <div className="routine-confirmation" role="status">
              <p>
                Try it in your next learning session. Then ask: what helped, and what would I
                change?
              </p>
              <button className="text-button" onClick={onExport}>
                <Download size={17} /> Keep a copy
              </button>
              <button
                className="btn btn-primary full-width combined-lesson-launch"
                onClick={onLesson}
              >
                Build my lesson <ArrowRight size={18} />
              </button>
              <p className="small-copy">
                A customized interaction preview for a teacher-selected math review.
              </p>
            </div>
          )}
        </section>
        <aside className="routine-aside">
          <div className="mini-flower">
            <Sprout size={28} />
          </div>
          <span className="eyebrow">FROM YOUR DISCOVERIES</span>
          <h2>Ideas for your next session.</h2>
          <p className="small-copy">
            These come from your current discoveries. Choose what to try in your arrangement. The
            time settings are starting choices you can adjust.
          </p>
          {startingIdeas.length ? (
            startingIdeas.map((section) => (
              <div className="routine-fact" key={section.id}>
                <strong>{section.title}</strong>
                {section.tryNext.map((idea) => (
                  <p key={idea}>{idea}</p>
                ))}
                <details className="routine-reason">
                  <summary>Why this idea?</summary>
                  <p>{section.summary}</p>
                  {section.correction?.note && <p>Your say: {section.correction.note}</p>}
                  <button className="text-button" onClick={onBack}>
                    See the answers behind it <ArrowRight size={14} />
                  </button>
                </details>
              </div>
            ))
          ) : (
            <p>
              Some areas are still open. Choose a manageable starting arrangement and notice what
              helps during learning.
            </p>
          )}
          <div className="soft-note">
            <MessageCircle size={18} />
            <span>You can ask for a different support without needing a label or a score.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
