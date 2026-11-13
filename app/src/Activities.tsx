import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  Flower2,
  Lightbulb,
  ListChecks,
  MoveRight,
  RotateCcw,
  Shapes,
  Sparkles,
} from 'lucide-react';
import {
  BORROW_STEPS,
  CODE_ITEMS,
  DESIGN_REQUIREMENTS,
  HINTS,
  MATCH_NUMBERS,
  PAIRS,
  RETURN_STEPS,
  SORT_ITEMS,
  sortLabel,
} from './activityModel';
import type {
  ActivityRecord,
  CodeWork,
  DesignRecord,
  DesignWork,
  FocusRecord,
  Reflections,
  RulesRecord,
  SortingWork,
} from './activityModel';
import './Activities.css';

type Props = {
  activity: ActivityRecord;
  onChange: (value: ActivityRecord) => void;
  onExit: () => void;
  onComplete: () => void;
};
type Hint = { id: string; text: string };
type ReflectionQuestion = {
  field: keyof Reflections;
  question: string;
  options: string[];
  max?: number;
};
const UNCERTAIN = ['Depends', 'Not sure', 'Prefer to skip'];
const STANDALONE = new Set([
  ...UNCERTAIN,
  'Depends on the example',
  'Depends on the part',
  'Nothing helped yet',
  'Nothing extra for now',
  'Keep it as it is',
  'I did not notice this happen',
]);
const REFLECTIONS: Record<ActivityRecord['id'], ReflectionQuestion[]> = {
  rules: [
    {
      field: 'r1',
      question: 'How sure do you feel about using this rule now?',
      options: [
        'Very sure',
        'A little sure',
        'Not sure',
        'Depends on the example',
        'Prefer to skip',
      ],
      max: 1,
    },
    {
      field: 'r2',
      question: 'What helped, if anything?',
      options: [
        'The rule line',
        'The examples',
        'A hint',
        'Pointing at shapes',
        'My own way',
        'Nothing helped yet',
        ...UNCERTAIN,
      ],
    },
    {
      field: 'r3',
      question: 'For another new rule, what would you try first?',
      options: [
        'Try with the rule visible',
        'Do one example with the adult',
        'Ask for a different explanation',
        'Another way',
        ...UNCERTAIN,
      ],
      max: 1,
    },
  ],
  design: [
    {
      field: 'r1',
      question: 'What helped you begin?',
      options: [
        'Reading all the directions',
        'Choosing one first step',
        'Talking about a plan',
        'Starting and checking as I went',
        'Adult help',
        'Another way',
        ...UNCERTAIN,
      ],
    },
    {
      field: 'r2',
      question: 'Would you want anything different for a task with more steps?',
      options: [
        'A short checklist',
        'Someone to read it aloud',
        'A first example',
        'Time to make a plan',
        'A check-in partway through',
        'Nothing extra for now',
        'Another choice',
        ...UNCERTAIN,
      ],
      max: 2,
    },
    {
      field: 'r3',
      question: 'If one part needed changing, what would you like to do?',
      options: [
        'Change it myself',
        'Talk through a clue',
        'Do the change with the adult',
        'Take a break first',
        'Another choice',
        ...UNCERTAIN,
      ],
      max: 1,
    },
  ],
  focus: [
    {
      field: 'r1',
      question: 'How was it to stay with this small activity today?',
      options: [
        'Mostly easy',
        'Mixed',
        'Mostly hard',
        'Depends on the part',
        'Not sure',
        'Prefer to skip',
      ],
      max: 1,
    },
    {
      field: 'r2',
      question: 'If you lost your place or your mind wandered, what did you do?',
      options: [
        'Looked back at the sample',
        'Used a place marker',
        'Asked for help',
        'Took a break',
        'Another way',
        'I did not notice this happen',
        ...UNCERTAIN,
      ],
    },
    {
      field: 'r3',
      question: 'What would you change next time?',
      options: [
        'A quieter place',
        'Room to move',
        'Fewer pairs visible',
        'Someone nearby',
        'Another support',
        'Keep it as it is',
        ...UNCERTAIN,
      ],
      max: 2,
    },
  ],
};
const INFO = {
  rules: {
    kicker: 'EXPLORE A NEW RULE',
    title: 'A different way to think',
    description: 'Play with shapes, keep the rules in sight, and choose how you want to work.',
    icon: Shapes,
  },
  design: {
    kicker: 'MAKE SOMETHING USEFUL',
    title: 'You’re the guide designer',
    description: 'Turn a few notes into a borrowing guide that someone else could follow.',
    icon: ListChecks,
  },
  focus: {
    kicker: 'NOTICE WHAT HELPS',
    title: 'Find your kind of focus',
    description: 'Find matching pairs with a setup you choose. There’s no hurry.',
    icon: Flower2,
  },
};

export function Activities({ activity, onChange, onExit, onComplete }: Props) {
  const [finishing, setFinishing] = useState(false);
  const info = INFO[activity.id];
  const Icon = info.icon;
  const update = (next: ActivityRecord) => onChange({ ...next, status: 'working' });
  const saveSnapshot = (showFeedback: boolean) => {
    const next = snapshot(activity, showFeedback);
    update(next);
  };
  const finish = () => {
    onChange({ ...snapshot(activity, activity.showFeedback), status: 'complete' });
    onComplete();
  };
  return (
    <div className={`activity-page activity-${activity.id}`}>
      <button type="button" className="activity-back" onClick={onExit}>
        <ArrowLeft size={17} /> Back to my discoveries
      </button>
      <header className="activity-heading">
        <div>
          <span className="activity-kicker">{info.kicker}</span>
          <h1 id="screen-title" tabIndex={-1}>
            {info.title}
          </h1>
          <p>{info.description}</p>
        </div>
        <span className="activity-heading-icon">
          <Icon size={39} strokeWidth={1.4} />
        </span>
      </header>
      <div className="activity-permission">
        <Sparkles size={17} />
        <span>
          Help, a break, or a different choice are always available. This is a small activity, not a
          grade.
        </span>
      </div>
      <details className="activity-access">
        <summary>
          Choose how to answer <span>optional</span>
        </summary>
        <label className="activity-field">
          My response method
          <select
            value={activity.responseMethod}
            onChange={(event) => update({ ...activity, responseMethod: event.target.value })}
          >
            <option value="">Choose if you’d like</option>
            <option>Using the on-screen choices</option>
            <option>Speaking while an adult records my exact answer</option>
            <option>Pointing while an adult records my choice</option>
            <option>Using another accessible method</option>
          </select>
        </label>
        <p>
          You can ask someone to read the directions or record exactly what you say. Shapes are
          named circle, triangle, and square.
        </p>
      </details>
      {activity.id === 'rules' ? (
        <RulesActivity record={activity} onChange={update} />
      ) : activity.id === 'design' ? (
        <DesignActivity record={activity} onChange={update} />
      ) : (
        <FocusActivity record={activity} onChange={update} />
      )}
      <ReflectionPanel record={activity} onChange={update} />
      {finishing && (
        <section className="activity-finish-prompt" aria-live="polite">
          <span className="activity-kicker">YOUR CHOICE</span>
          <h2>
            {activity.id === 'rules'
              ? 'Shall we check the rule together?'
              : activity.id === 'design'
                ? 'Would you like to check whether your card matches the directions, leave it as it is, or stop here?'
                : 'Would you like to check your matches, leave them as they are, or stop here?'}
          </h2>
          <p>Your first submitted work is saved. You can make changes without losing it.</p>
          <div className="activity-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                saveSnapshot(true);
                setFinishing(false);
              }}
            >
              <Eye size={17} /> Check together
            </button>
            <button type="button" className="btn btn-primary" onClick={finish}>
              Save & finish <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="activity-text-button"
              onClick={() => {
                onChange({ ...activity, status: 'working' });
                onExit();
              }}
            >
              Stop here & return later
            </button>
          </div>
        </section>
      )}
      <footer className="activity-footer">
        <button
          type="button"
          className="activity-text-button"
          onClick={() => {
            onChange({ ...activity, status: 'skipped' });
            onComplete();
          }}
        >
          Skip this activity
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            saveSnapshot(false);
            setFinishing(true);
          }}
        >
          I’m ready to finish <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}

function snapshot(activity: ActivityRecord, showFeedback: boolean): ActivityRecord {
  if (activity.id === 'rules') {
    const work = {
      mode: activity.mode,
      sorting: activity.sorting,
      code: activity.code,
      explanationSort: activity.explanationSort,
      explanationCode: activity.explanationCode,
      explanationStrip: activity.explanationStrip,
    };
    const last = activity.submissions.at(-1);
    return {
      ...activity,
      showFeedback,
      submissions:
        last && JSON.stringify(last) === JSON.stringify(work)
          ? activity.submissions
          : appendSnapshot(activity.submissions, work),
    };
  }
  const work = activity.id === 'design' ? activity.work : activity.decisions;
  const last = activity.submissions.at(-1);
  if (activity.id === 'design')
    return {
      ...activity,
      showFeedback,
      submissions:
        JSON.stringify(last) === JSON.stringify(work)
          ? activity.submissions
          : appendSnapshot(activity.submissions, activity.work),
    };
  return {
    ...activity,
    showFeedback,
    submissions:
      JSON.stringify(last) === JSON.stringify(work)
        ? activity.submissions
        : appendSnapshot(activity.submissions, activity.decisions),
  };
}

function appendSnapshot<T>(previous: T[], next: T): T[] {
  const first = previous[0];
  return previous.length < 100 || first === undefined
    ? [...previous, next]
    : [first, ...previous.slice(-98), next];
}

function HintPanel({
  hints,
  log,
  onHint,
  children,
}: {
  hints: { label: string; hint: Hint }[];
  log: { id: string; text: string }[];
  onHint: (hint: Hint) => void;
  children?: React.ReactNode;
}) {
  const latest = log.at(-1);
  return (
    <aside className="activity-hint-panel">
      <div className="activity-hint-title">
        <Lightbulb size={20} />
        <div>
          <strong>A little help, if you want it</strong>
          <p>You don’t need to try alone first.</p>
        </div>
      </div>
      {children}
      <div className="activity-actions">
        {hints.map(({ label, hint }) => (
          <button
            type="button"
            className="activity-hint-button"
            key={hint.id}
            onClick={() => onHint(hint)}
          >
            <CircleHelp size={16} />
            {label}
          </button>
        ))}
      </div>
      {latest && (
        <p className="activity-hint-message" role="status">
          {latest.text}
        </p>
      )}
    </aside>
  );
}

function RulesActivity({
  record,
  onChange,
}: {
  record: RulesRecord;
  onChange: (record: RulesRecord) => void;
}) {
  const edit = (next: RulesRecord) => onChange({ ...next, showFeedback: false });
  const check = () => {
    const next = snapshot(record, true);
    if (next.id === 'rules') onChange(next);
  };
  const chooseMode = (mode: RulesRecord['mode']) =>
    edit({ ...record, mode, currentItem: mode === 'code' ? 'LDS-A01-X1' : 'LDS-A01-P1' });
  const setSort = (
    id: keyof SortingWork,
    value: SortingWork[keyof SortingWork],
    sourceId: string,
  ) => edit({ ...record, sorting: { ...record.sorting, [id]: value }, currentItem: sourceId });
  const setCode = (id: keyof CodeWork, value: CodeWork[keyof CodeWork], sourceId: string) =>
    edit({ ...record, code: { ...record.code, [id]: value }, currentItem: sourceId });
  const modes = [
    {
      id: 'sorting',
      title: 'Same ends, different ends',
      text: 'Compare the first and last shapes.',
    },
    { id: 'code', title: 'Try a two-step code', text: 'Reverse a strip, then replace each shape.' },
  ];
  const last = record.submissions.filter((work) => work.mode === record.mode).at(-1);
  const first = record.submissions.find((work) => work.mode === record.mode);
  return (
    <>
      <div className="activity-mode-grid" aria-label="Choose your activity version">
        {modes.map((mode) => (
          <button
            type="button"
            key={mode.id}
            aria-pressed={record.mode === mode.id}
            className={`activity-mode ${record.mode === mode.id ? 'is-selected' : ''}`}
            onClick={() => {
              if (mode.id === 'sorting' || mode.id === 'code') chooseMode(mode.id);
            }}
          >
            <span className="activity-choice-dot">
              {record.mode === mode.id && <Check size={13} />}
            </span>
            <span>
              <strong>{mode.title}</strong>
              <small>{mode.text}</small>
            </span>
          </button>
        ))}
      </div>
      <p className="activity-caption">
        Both choices are welcome. You can switch or move on whenever you want.
      </p>
      {record.mode === 'sorting' ? (
        <>
          <section className="activity-rule card">
            <span className="activity-kicker">KEEP THIS RULE IN SIGHT</span>
            <h2>Look at the ends. The middle can be different.</h2>
            <div className="activity-examples">
              <div>
                <span className="activity-shapes" aria-label="circle square circle">
                  ○ □ ○
                </span>
                <strong>Same ends</strong>
                <small>Circle and circle</small>
              </div>
              <div>
                <span className="activity-shapes" aria-label="triangle circle square">
                  △ ○ □
                </span>
                <strong>Different ends</strong>
                <small>Triangle and square</small>
              </div>
            </div>
            <p>
              Put a strip in <b>Same ends</b> if its first and last shapes are the same. Put it in{' '}
              <b>Different ends</b> if they are different. The middle shapes do not change the
              choice.
            </p>
          </section>
          <section className="activity-task-section">
            <SectionLabel
              number="01"
              title="Try the rule"
              detail="Choose a box for each strip. Not sure and skip are okay."
            />
            {SORT_ITEMS.slice(0, 4).map((item) => (
              <SortRow
                key={item.id}
                item={item}
                value={record.sorting[item.id]}
                onChange={(value) => setSort(item.id, value, item.sourceId)}
              />
            ))}
          </section>
          <div className="activity-explanation card">
            <label className="activity-field">
              Pick a strip to explain <span>optional</span>
              <select
                value={record.explanationStrip}
                onChange={(event) => edit({ ...record, explanationStrip: event.target.value })}
              >
                <option value="">Choose a strip</option>
                {SORT_ITEMS.slice(0, 4).map((item) => (
                  <option key={item.id} value={item.sourceId}>
                    {item.sourceId.replace('LDS-A01-', '')}: {item.strip}
                  </option>
                ))}
              </select>
            </label>
            <label className="activity-field">
              How did you choose its box?
              <textarea
                maxLength={2000}
                rows={2}
                value={record.explanationSort}
                placeholder="You can explain, ask an adult to record your words, say ‘not sure’, or leave this blank."
                onChange={(event) => edit({ ...record, explanationSort: event.target.value })}
              />
            </label>
          </div>
          <section className="activity-task-section">
            <SectionLabel
              number="02"
              title="Try a new example"
              detail="Longer strips, same rule. You can still use the directions and ask for help."
            />
            {SORT_ITEMS.slice(4).map((item) => (
              <SortRow
                key={item.id}
                item={item}
                value={record.sorting[item.id]}
                onChange={(value) => setSort(item.id, value, item.sourceId)}
              />
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="activity-rule card">
            <span className="activity-kicker">TWO STEPS · KEEP BOTH VISIBLE</span>
            <h2>Reverse. Then replace.</h2>
            <div className="activity-two-steps">
              <div>
                <span>1</span>
                <strong>Reverse the strip</strong>
                <p>Put the shapes in the opposite order, from last to first.</p>
              </div>
              <div>
                <span>2</span>
                <strong>Replace each shape once</strong>
                <p className="activity-map">
                  ○ → △ <i>·</i> △ → □ <i>·</i> □ → ○
                </p>
                <p>Circle → triangle · triangle → square · square → circle</p>
              </div>
            </div>
            <div className="activity-worked-example">
              <b>Example</b>
              <span>○ △ □</span>
              <MoveRight size={18} />
              <span>□ △ ○</span>
              <MoveRight size={18} />
              <span>○ □ △</span>
            </div>
            <p>
              The sorting rule isn’t used here. Keep your reversed strip visible while you make the
              code.
            </p>
          </section>
          {CODE_ITEMS.map((item, index) => (
            <section key={item.id} className="activity-code-item card">
              <SectionLabel
                number={index === 2 ? 'NEW' : `0${index + 1}`}
                title={index === 2 ? 'A fresh example' : 'Make your code'}
                detail={
                  index === 2
                    ? 'Use the same two steps. All rules and help stay available.'
                    : 'Pick shapes with the menus; keyboard arrows work too.'
                }
              />
              <div className="activity-code-input">
                <span>INPUT</span>
                <strong className="activity-shapes">{item.input}</strong>
              </div>
              <ShapeSlots
                label="1. My reversed strip"
                value={record.code[item.id].reversed}
                disabled={record.code[item.id].disposition !== 'working'}
                onChange={(reversed) =>
                  setCode(item.id, { ...record.code[item.id], reversed }, item.sourceId)
                }
              />
              <ShapeSlots
                label="2. My coded strip"
                value={record.code[item.id].coded}
                disabled={record.code[item.id].disposition !== 'working'}
                onChange={(coded) =>
                  setCode(item.id, { ...record.code[item.id], coded }, item.sourceId)
                }
              />
              <div className="activity-small-choices">
                <span>Or choose:</span>
                {(['working', 'not-sure', 'skip'] satisfies CodeWork['x1']['disposition'][]).map(
                  (value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={record.code[item.id].disposition === value}
                      className="activity-chip"
                      onClick={() =>
                        setCode(
                          item.id,
                          { ...record.code[item.id], disposition: value },
                          item.sourceId,
                        )
                      }
                    >
                      {value === 'working'
                        ? 'Try this one'
                        : value === 'not-sure'
                          ? 'Not sure'
                          : 'Skip this example'}
                    </button>
                  ),
                )}
              </div>
            </section>
          ))}
          <label className="activity-field activity-explanation card">
            Choose a coded strip. How did you use both steps? How could you check one part without
            starting again?<span>Optional. Showing or explaining to an adult is welcome.</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={record.explanationCode}
              onChange={(event) => edit({ ...record, explanationCode: event.target.value })}
              placeholder="My explanation, ‘not sure’, or leave blank…"
            />
          </label>
        </>
      )}
      <HintPanel
        log={record.hints}
        hints={
          record.mode === 'sorting'
            ? [
                { label: 'Pointing hint', hint: HINTS.sortPoint },
                { label: 'Another example', hint: HINTS.sortModel },
              ]
            : [
                { label: 'Help with reversing', hint: HINTS.reverse },
                { label: 'Help with replacement', hint: HINTS.replace },
              ]
        }
        onHint={(hint) =>
          onChange({
            ...record,
            hints: [...record.hints, { ...hint, beforeItem: record.currentItem }].slice(-100),
          })
        }
      >
        <label className="activity-inline-field">
          Help for{' '}
          <select
            value={record.currentItem}
            onChange={(event) => onChange({ ...record, currentItem: event.target.value })}
          >
            {(record.mode === 'sorting' ? SORT_ITEMS : CODE_ITEMS).map((item) => (
              <option key={item.sourceId} value={item.sourceId}>
                {item.sourceId.replace('LDS-A01-', '')} ·{' '}
                {'strip' in item ? item.strip : item.input}
              </option>
            ))}
          </select>
        </label>
      </HintPanel>
      <CheckButton onClick={check} />
      {record.showFeedback && last && (
        <section className="activity-feedback" aria-live="polite">
          <h3>
            <Eye size={19} /> Let’s compare with the visible rule
          </h3>
          <p>
            This is a reference for this small game. Change anything you want, or leave your work as
            it is.
          </p>
          {record.mode === 'sorting' ? (
            <div className="activity-comparison">
              {SORT_ITEMS.map((item) => (
                <div key={item.id}>
                  <span className="activity-shapes">{item.strip}</span>
                  <span>
                    Your choice: <b>{sortLabel(last.sorting[item.id])}</b>
                  </span>
                  <span>
                    Rule reference: <b>{sortLabel(item.key)}</b>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-comparison">
              {CODE_ITEMS.map((item) => (
                <div key={item.id}>
                  <b>
                    {item.sourceId.replace('LDS-A01-', '')} · {item.input}
                  </b>
                  <span>
                    Your reversed strip:{' '}
                    {last.code[item.id].reversed.map((s) => s || '—').join(' ')}
                  </span>
                  <span>
                    Reference reversed: <b>{item.reversed}</b>
                  </span>
                  <span>
                    Your coded strip: {last.code[item.id].coded.map((s) => s || '—').join(' ')}
                  </span>
                  <span>
                    Reference coded: <b>{item.coded}</b>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="activity-caption">
            Your first submitted version is kept. Using a hint or an example is part of the record,
            without a penalty.
          </p>
          {first && (
            <details>
              <summary>See my first submitted work</summary>
              <RulesSnapshot record={first} />
            </details>
          )}
        </section>
      )}
    </>
  );
}

function SortRow({
  item,
  value,
  onChange,
}: {
  item: (typeof SORT_ITEMS)[number];
  value: SortingWork[keyof SortingWork];
  onChange: (value: SortingWork[keyof SortingWork]) => void;
}) {
  const choices: { value: SortingWork[keyof SortingWork]; label: string }[] = [
    { value: 'same', label: 'Same ends' },
    { value: 'different', label: 'Different ends' },
    { value: 'not-sure', label: 'Not sure' },
    { value: 'skip', label: 'Skip' },
  ];
  return (
    <div className="activity-sort-row">
      <span className="activity-item-id">{item.sourceId.replace('LDS-A01-', '')}</span>
      <span className="activity-shapes">{item.strip}</span>
      <div
        className="activity-small-choices"
        role="group"
        aria-label={`Choice for ${item.sourceId}: ${describeShapes(item.strip)}`}
      >
        {choices.map((choice) => (
          <button
            type="button"
            key={choice.value}
            className="activity-chip"
            aria-pressed={choice.value === value}
            onClick={() => onChange(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function describeShapes(strip: string) {
  return strip.replaceAll('○', 'circle').replaceAll('△', 'triangle').replaceAll('□', 'square');
}

function ShapeSlots({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: CodeWork['x1']['coded'];
  disabled: boolean;
  onChange: (value: CodeWork['x1']['coded']) => void;
}) {
  return (
    <fieldset className="activity-shape-slots" disabled={disabled}>
      <legend>{label}</legend>
      <div>
        {value.map((shape, index) => (
          <select
            aria-label={`${label}, position ${index + 1}`}
            key={index}
            value={shape}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (next === '' || next === '○' || next === '△' || next === '□')
                onChange(value.map((previous, position) => (position === index ? next : previous)));
            }}
          >
            <option value="">—</option>
            <option value="○">○ circle</option>
            <option value="△">△ triangle</option>
            <option value="□">□ square</option>
          </select>
        ))}
      </div>
    </fieldset>
  );
}

function RulesSnapshot({ record }: { record: RulesRecord['submissions'][number] }) {
  return (
    <div className="activity-original">
      {record.mode === 'sorting'
        ? SORT_ITEMS.map((item) => (
            <p key={item.id}>
              {item.sourceId.replace('LDS-A01-', '')}: {item.strip} →{' '}
              {sortLabel(record.sorting[item.id])}
            </p>
          ))
        : CODE_ITEMS.map((item) => (
            <p key={item.id}>
              {item.sourceId.replace('LDS-A01-', '')}: reversed{' '}
              {record.code[item.id].reversed.map((s) => s || '—').join(' ')}; coded{' '}
              {record.code[item.id].coded.map((s) => s || '—').join(' ')}
            </p>
          ))}
      <p>{record.mode === 'sorting' ? record.explanationSort : record.explanationCode}</p>
    </div>
  );
}

function DesignActivity({
  record,
  onChange,
}: {
  record: DesignRecord;
  onChange: (record: DesignRecord) => void;
}) {
  const [activeRequirement, setActiveRequirement] = useState(0);
  const edit = (work: DesignWork) => onChange({ ...record, work, showFeedback: false });
  const check = () => {
    const next = snapshot(record, true);
    if (next.id === 'design') onChange(next);
  };
  const work = record.work;
  const submitted = record.submissions.at(-1);
  return (
    <>
      <section className="activity-design-brief card">
        <span className="activity-kicker">YOUR BRIEF</span>
        <h2>A guide for shared supplies</h2>
        <p>
          Imagine people share a box of supplies. Help them borrow and return things. A <b>log</b>{' '}
          is a list of names and borrowed items. You don’t need to use a real person’s name.
        </p>
        <ol>
          {DESIGN_REQUIREMENTS.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ol>
      </section>
      <div className="activity-design-workspace">
        <aside className="activity-source-notes">
          <span className="activity-kicker">SOURCE NOTES</span>
          <h3>These aren’t in step order.</h3>
          <ul>
            <li>Take an item only after writing it in the log.</li>
            <li>Cross out your log entry after putting the item in the return box.</li>
            <li>Choose an item before writing in the log.</li>
            <li>Put the item in the return box.</li>
            <li>Write your name and the chosen item in the log.</li>
          </ul>
          <p>Use the arrows beside each step to arrange your guide. There’s no need to drag.</p>
        </aside>
        <section className="activity-guide-editor card">
          <span className="activity-kicker">MY GUIDE</span>
          <label className="activity-field">
            Give your guide a title <span>up to 5 words</span>
            <input
              maxLength={100}
              value={work.title}
              placeholder="What will you call it?"
              onChange={(event) => edit({ ...work, title: event.target.value })}
            />
          </label>
          <div className="activity-guide-section-title">
            <span className="activity-guide-symbol">{work.symbol || '◇'}</span>
            <h3>BORROW</h3>
          </div>
          <StepOrder
            ids={work.borrow}
            labels={BORROW_STEPS}
            onChange={(borrow) => edit({ ...work, borrow })}
            label="BORROW"
          />
          <label className="activity-field activity-help-message">
            A message near BORROW
            <input
              value={work.helpMessage}
              maxLength={200}
              onChange={(event) => edit({ ...work, helpMessage: event.target.value })}
              placeholder="Add the message from the brief…"
            />
          </label>
          <button
            type="button"
            className="activity-text-button"
            onClick={() => edit({ ...work, helpMessage: 'Ask if an item is missing.' })}
          >
            Use “Ask if an item is missing.”
          </button>
          <div className="activity-guide-section-title">
            <h3>RETURN</h3>
          </div>
          <StepOrder
            ids={work.returnSteps}
            labels={RETURN_STEPS}
            onChange={(returnSteps) => edit({ ...work, returnSteps })}
            label="RETURN"
          />
          <div className="activity-symbol-controls">
            <label className="activity-field">
              A symbol beside BORROW
              <select
                value={work.symbol}
                onChange={(event) => edit({ ...work, symbol: event.target.value })}
              >
                <option value="">Choose a symbol</option>
                <option value="→">→ Arrow</option>
                <option value="☆">☆ Star</option>
                <option value="○">○ Circle</option>
                <option value="□">□ Square</option>
              </select>
            </label>
            <label className="activity-field">
              My symbol means
              <input
                maxLength={200}
                value={work.symbolMeaning}
                placeholder="Tell a reader what it means"
                onChange={(event) => edit({ ...work, symbolMeaning: event.target.value })}
              />
            </label>
          </div>
        </section>
      </div>
      <section className="activity-self-check card">
        <SectionLabel
          number="YOUR SAY"
          title="Want to compare your guide with the brief?"
          detail="This checklist is optional. A ‘want to change’ choice doesn’t mean you have to change it."
        />
        {DESIGN_REQUIREMENTS.map((requirement, index) => (
          <div className="activity-checklist-row" key={requirement}>
            <span>
              <b>{index + 1}.</b> {requirement}
            </span>
            <div className="activity-small-choices">
              {(['fits', 'change', 'not-sure', 'skip'] satisfies DesignWork['selfCheck']).map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    className="activity-chip"
                    aria-pressed={work.selfCheck[index] === value}
                    onClick={() => {
                      setActiveRequirement(index);
                      edit({
                        ...work,
                        selfCheck: work.selfCheck.map((previous, position) =>
                          position === index ? value : previous,
                        ),
                      });
                    }}
                  >
                    {value === 'fits'
                      ? 'Fits'
                      : value === 'change'
                        ? 'Want to change'
                        : value === 'not-sure'
                          ? 'Not sure'
                          : 'Skip'}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </section>
      <HintPanel
        log={record.hints}
        hints={[
          { label: 'Plan the guide', hint: HINTS.plan },
          { label: 'Think about order', hint: HINTS.order },
          { label: 'Check one requirement', hint: HINTS.check },
        ]}
        onHint={(hint) =>
          onChange({
            ...record,
            hints: [
              ...record.hints,
              { ...hint, beforeItem: `LDS-A02-XC1 requirement ${activeRequirement + 1}` },
            ].slice(-100),
          })
        }
      />
      <CheckButton onClick={check} />
      {record.showFeedback && submitted && (
        <section className="activity-feedback" aria-live="polite">
          <h3>
            <Eye size={19} /> Compare your guide with the brief
          </h3>
          <p>These are checks on this draft, not a judgment of you or your design choices.</p>
          <ul className="activity-reference-list">
            {designReference(submitted).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>
            Step reference: <b>Choose → write in log → take.</b> Then{' '}
            <b>put in return box → cross out entry.</b> Other layouts and symbols are welcome.
          </p>
          <details>
            <summary>See my first submitted guide</summary>
            {record.submissions[0] && <GuideSnapshot work={record.submissions[0]} />}
          </details>
        </section>
      )}
    </>
  );
}

function StepOrder<T extends string>({
  ids,
  labels,
  onChange,
  label,
}: {
  ids: readonly T[];
  labels: Record<T, string>;
  onChange: (ids: T[]) => void;
  label: string;
}) {
  const move = (position: number, offset: number) => {
    const next = [...ids];
    const source = next[position];
    const destination = next[position + offset];
    if (source === undefined || destination === undefined) return;
    next[position] = destination;
    next[position + offset] = source;
    onChange(next);
  };
  return (
    <ol className="activity-reorder-list">
      {ids.map((id, index) => (
        <li key={id}>
          <span className="activity-step-number">{index + 1}</span>
          <span>{labels[id]}</span>
          <div>
            <button
              type="button"
              disabled={index === 0}
              aria-label={`Move ${label} step “${labels[id]}” up`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={17} />
            </button>
            <button
              type="button"
              disabled={index === ids.length - 1}
              aria-label={`Move ${label} step “${labels[id]}” down`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={17} />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function designReference(work: DesignWork): string[] {
  const words = work.title.trim().split(/\s+/).filter(Boolean).length;
  return [
    !words
      ? 'No title entered yet; you can leave it open.'
      : words <= 5
        ? 'Your title has no more than five words, as requested.'
        : 'Your title has more than five words; the brief asks for five or fewer.',
    'Both BORROW and RETURN section labels are shown.',
    work.borrow.join(',') === 'choose,log,take'
      ? 'Your BORROW steps follow the source notes.'
      : 'Your BORROW steps are in a different order from the source notes. You can compare the “before” and “after” notes.',
    work.returnSteps.join(',') === 'return,cross'
      ? 'Your RETURN steps follow the source notes.'
      : 'The source notes say to put the item in the return box before crossing out the entry.',
    work.helpMessage.trim() === 'Ask if an item is missing.'
      ? 'The requested help message is beside BORROW.'
      : 'Compare your message near BORROW with “Ask if an item is missing.”',
    work.symbol && work.symbolMeaning.trim()
      ? `Your ${work.symbol} symbol is beside BORROW and has a stated meaning.`
      : 'A symbol and its meaning can be added, or left open.',
  ];
}

function GuideSnapshot({ work }: { work: DesignWork }) {
  return (
    <div className="activity-original">
      <h4>{work.title || 'No title entered'}</h4>
      <b>{work.symbol} BORROW</b>
      <ol>
        {work.borrow.map((id) => (
          <li key={id}>{BORROW_STEPS[id]}</li>
        ))}
      </ol>
      <p>{work.helpMessage || 'No help message entered'}</p>
      <b>RETURN</b>
      <ol>
        {work.returnSteps.map((id) => (
          <li key={id}>{RETURN_STEPS[id]}</li>
        ))}
      </ol>
      <p>Symbol meaning: {work.symbolMeaning || 'not entered'}</p>
    </div>
  );
}

const FOCUS_SUPPORTS = [
  'Show the whole page',
  'Show one row at a time',
  'Use a place marker',
  'Read the shapes aloud with an adult',
  'Another support',
  'Depends; I’ll choose as I go',
  'Not sure; show me the choices',
  'Prefer to skip this choice',
];

function FocusActivity({
  record,
  onChange,
}: {
  record: FocusRecord;
  onChange: (record: FocusRecord) => void;
}) {
  const chooseSupports = (choice: string) => {
    const exclusive = [
      'Depends; I’ll choose as I go',
      'Not sure; show me the choices',
      'Prefer to skip this choice',
    ];
    let supports = record.supports.includes(choice)
      ? record.supports.filter((value) => value !== choice)
      : exclusive.includes(choice)
        ? [choice]
        : [...record.supports.filter((value) => !exclusive.includes(value)), choice];
    if (choice === 'Show the whole page')
      supports = supports.filter((value) => value !== 'Show one row at a time');
    if (choice === 'Show one row at a time')
      supports = supports.filter((value) => value !== 'Show the whole page');
    onChange({
      ...record,
      supports,
      supportHistory: [
        ...record.supportHistory,
        { choices: supports, beforePair: (record.marker ?? record.row * 3) + 1 },
      ].slice(-100),
    });
  };
  const rows = record.supports.includes('Show one row at a time');
  const marker = record.supports.includes('Use a place marker');
  const check = () => {
    const next = snapshot(record, true);
    if (next.id === 'focus') onChange(next);
  };
  const last = record.submissions.at(-1);
  return (
    <>
      <section className="activity-support-panel card">
        <SectionLabel
          number="FIRST"
          title="Choose what you’d like available"
          detail="Change your choices anytime. Ask an adult to read aloud if that’s helpful."
        />
        <div className="activity-support-grid">
          {FOCUS_SUPPORTS.map((choice) => (
            <button
              type="button"
              key={choice}
              className="activity-support-choice"
              aria-pressed={record.supports.includes(choice)}
              onClick={() => chooseSupports(choice)}
            >
              <span className="activity-choice-dot">
                {record.supports.includes(choice) && <Check size={13} />}
              </span>
              {choice}
            </button>
          ))}
        </div>
        <p className="activity-caption">
          If a support isn’t available, you can choose another one or skip. Describe any other
          support in “My say” below.
        </p>
      </section>
      <section className="activity-matching-task">
        <div className="activity-sample">
          <div>
            <span className="activity-kicker">THE SAMPLE</span>
            <strong className="activity-shapes" aria-label="circle then triangle">
              ○ △
            </strong>
          </div>
          <p>
            Find pairs with the <b>same shapes in the same order.</b>
            <br />
            You can look back at the sample whenever you want.
          </p>
        </div>
        <p className="activity-caption">
          Choose “Match” for an exact match or “Different” for another pair. Untouched pairs stay
          “not reached”; they aren’t treated as mistakes.
        </p>
        {rows && (
          <div className="activity-row-navigation">
            <button
              type="button"
              className="activity-hint-button"
              disabled={record.row === 0}
              onClick={() => onChange({ ...record, row: Math.max(0, record.row - 1) })}
            >
              <ArrowLeft size={16} />
              Previous row
            </button>
            <span>Row {record.row + 1} of 4</span>
            <button
              type="button"
              className="activity-hint-button"
              disabled={record.row === 3}
              onClick={() => onChange({ ...record, row: Math.min(3, record.row + 1) })}
            >
              Next row
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {marker && (
          <p className="activity-marker-instruction">
            Use “Place marker here” beside a pair to keep your place. It doesn’t change your answer.
          </p>
        )}
        <div className="activity-pair-grid">
          {PAIRS.map((pair, index) =>
            !rows || Math.floor(index / 3) === record.row ? (
              <div
                key={index}
                className={`activity-pair ${record.decisions[index] === 'match' ? 'is-match' : ''} ${marker && record.marker === index ? 'has-marker' : ''}`}
              >
                <div className="activity-pair-top">
                  <span>{index + 1}.</span>
                  {marker && (
                    <button
                      type="button"
                      className="activity-marker-button"
                      aria-label={`Place marker at pair ${index + 1}`}
                      aria-pressed={record.marker === index}
                      onClick={() => onChange({ ...record, marker: index })}
                    >
                      {record.marker === index ? <MoveRight size={19} /> : 'Place marker here'}
                    </button>
                  )}
                </div>
                <span className="activity-shapes" aria-label={describeShapes(pair)}>
                  {pair}
                </span>
                <div
                  className="activity-pair-choices"
                  role="group"
                  aria-label={`Pair ${index + 1}: ${describeShapes(pair)}`}
                >
                  {(
                    ['match', 'different', 'not-sure', 'skip'] satisfies FocusRecord['decisions']
                  ).map((choice) => (
                    <button
                      type="button"
                      key={choice}
                      aria-pressed={record.decisions[index] === choice}
                      onClick={() =>
                        onChange({
                          ...record,
                          decisions: record.decisions.map((previous, position) =>
                            position === index ? choice : previous,
                          ),
                          showFeedback: false,
                        })
                      }
                    >
                      {choice === 'match'
                        ? 'Match'
                        : choice === 'different'
                          ? 'Different'
                          : choice === 'not-sure'
                            ? 'Not sure'
                            : 'Skip'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </section>
      <HintPanel
        log={record.hints}
        hints={[{ label: 'Compare a pair', hint: HINTS.match }]}
        onHint={(hint) =>
          onChange({
            ...record,
            hints: [
              ...record.hints,
              {
                ...hint,
                beforeItem: `LDS-A03-M${String((record.marker ?? record.row * 3) + 1).padStart(2, '0')}`,
              },
            ].slice(-100),
          })
        }
      />
      <CheckButton onClick={check} />
      {record.showFeedback && last && (
        <section className="activity-feedback" aria-live="polite">
          <h3>
            <Eye size={19} /> A matching reference
          </h3>
          <p>
            Pairs <b>1, 4, 6, 9, and 12</b> are circle then triangle, exactly like the sample. The
            other pairs have a different shape or order.
          </p>
          <p>
            You chose matches:{' '}
            <b>
              {last
                .flatMap((choice, index) => (choice === 'match' ? [index + 1] : []))
                .join(', ') || 'none marked'}
            </b>
            . Untouched, skipped, and not-sure pairs stay separate.
          </p>
          <p>
            One small activity can’t tell us your attention span or prove that a support caused a
            change.
          </p>
          <details>
            <summary>See my first submitted choices</summary>
            <div className="activity-original">
              {record.submissions[0]?.map((choice, index) => (
                <p key={index}>
                  {index + 1}. {PAIRS[index]} —{' '}
                  {choice === 'unreached'
                    ? 'Not reached'
                    : choice === 'match'
                      ? 'Match'
                      : choice === 'different'
                        ? 'Different'
                        : choice === 'not-sure'
                          ? 'Not sure'
                          : 'Skip'}
                  {MATCH_NUMBERS.includes(index + 1)
                    ? ' · reference: exact match'
                    : ' · reference: different'}
                </p>
              ))}
            </div>
          </details>
        </section>
      )}
    </>
  );
}

function ReflectionPanel({
  record,
  onChange,
}: {
  record: ActivityRecord;
  onChange: (record: ActivityRecord) => void;
}) {
  const set = (field: keyof Reflections, option: string, max?: number) => {
    const current = record.reflections[field];
    const next = current.includes(option)
      ? current.filter((value) => value !== option)
      : max === 1 || STANDALONE.has(option)
        ? [option]
        : [...current.filter((value) => !STANDALONE.has(value)), option];
    if (max && next.length > max) return;
    const updated = { ...record, reflections: { ...record.reflections, [field]: next } };
    onChange(updated);
  };
  return (
    <section className="activity-reflections card">
      <span className="activity-kicker">MY SAY · ALL OPTIONAL</span>
      <h2>What was it like for you?</h2>
      <p>
        Your choices tell us what to try next. You don’t have to explain or share anything private.
      </p>
      {record.id === 'rules' && (
        <label className="activity-field activity-reflection-version">
          These reflections are about
          <select
            value={record.reflectionVersion}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'sorting' || value === 'code')
                onChange({ ...record, reflectionVersion: value });
            }}
          >
            <option value="sorting">Same ends, different ends</option>
            <option value="code">The two-step code</option>
          </select>
        </label>
      )}
      {REFLECTIONS[record.id].map((question) => (
        <fieldset className="activity-reflection-question" key={question.field}>
          <legend>{question.question}</legend>
          <p>
            {question.max === 1
              ? 'Choose one.'
              : question.max === 2
                ? 'Choose up to two supports. Choose uncertainty or a no-extra-support answer on its own.'
                : 'Choose any supports or actions. Choose uncertainty or a no-help answer on its own.'}
          </p>
          <div className="activity-small-choices">
            {question.options.map((option) => (
              <button
                type="button"
                className="activity-chip"
                key={option}
                aria-pressed={record.reflections[question.field].includes(option)}
                disabled={
                  question.max !== 1 &&
                  question.max !== undefined &&
                  record.reflections[question.field].filter((value) => !STANDALONE.has(value))
                    .length >= question.max &&
                  !record.reflections[question.field].includes(option) &&
                  !STANDALONE.has(option)
                }
                onClick={() => set(question.field, option, question.max)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="activity-field">
        Anything you want to add or correct?
        <span>
          Optional. You can describe another support, leave something unknown, or ask an adult to
          record your exact words.
        </span>
        <textarea
          maxLength={2000}
          rows={2}
          value={record.note}
          onChange={(event) => onChange({ ...record, note: event.target.value })}
          placeholder="Your words belong here…"
        />
      </label>
    </section>
  );
}

function SectionLabel({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="activity-section-label">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </div>
  );
}
function CheckButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="activity-check-action">
      <button type="button" className="btn btn-secondary" onClick={onClick}>
        <RotateCcw size={17} /> Check my work, if I want
      </button>
      <span>We’ll keep your first version.</span>
    </div>
  );
}
