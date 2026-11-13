import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Download,
  Focus,
  Heart,
  ListChecks,
  MessageCirclePlus,
  MessagesSquare,
  Printer,
  Shapes,
  Sparkles,
  Sprout,
  Timer,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { buildReport } from './assessment';
import type { Correction, Dimension, EvidenceLine, ReportSection } from './assessment';
import { canUseRoutine, formatReflectionWindow } from './model';
import type { Session } from './model';
import './Profile.css';

type ProfileProps = {
  session: Session;
  onCorrection: (value: Correction) => void;
  onReview: () => void;
  onEditSource: (sourceId: string) => void;
  onContinue: () => void;
  onExport: (format: 'text' | 'json') => void;
  onExit: () => void;
};

type CorrectionDraft = Correction & { title: string };

const cardStyle = {
  personality: { Icon: Compass, tone: 'lavender' },
  focus: { Icon: Focus, tone: 'sage' },
  reasoning: { Icon: Shapes, tone: 'peach' },
  pace: { Icon: Timer, tone: 'blue' },
  motivation: { Icon: Heart, tone: 'peach' },
  management: { Icon: ListChecks, tone: 'sage' },
  confidence: { Icon: Sprout, tone: 'lavender' },
  interaction: { Icon: MessagesSquare, tone: 'blue' },
} satisfies Record<Dimension, { Icon: LucideIcon; tone: 'sage' | 'peach' | 'lavender' | 'blue' }>;

function EvidenceList({
  title,
  items,
  emptyText,
  onEditSource,
}: {
  title: string;
  items: EvidenceLine[];
  emptyText: string;
  onEditSource: ProfileProps['onEditSource'];
}) {
  return (
    <section className="profile-evidence-group">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="profile-evidence-list">
          {items.map((item, index) => (
            <li key={`${item.sourceId}-${index}`}>
              <div className="profile-evidence-label">
                <span>{item.label}</span>
                <button
                  type="button"
                  className="profile-revisit"
                  onClick={() => onEditSource(item.sourceId)}
                  aria-label={`Revisit ${item.label}`}
                >
                  Revisit <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              </div>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-empty-line">{emptyText}</p>
      )}
    </section>
  );
}

function LearningCard({
  section,
  onEditSource,
  onAddSay,
}: {
  section: ReportSection;
  onEditSource: ProfileProps['onEditSource'];
  onAddSay: (section: ReportSection) => void;
}) {
  const { Icon, tone } = cardStyle[section.id];
  const disagreement = section.correction?.status === 'disagree';
  const sourceLabel =
    section.said.length && section.observed.length
      ? 'Your answers + activity work'
      : section.said.length
        ? 'From your answers'
        : section.observed.length
          ? 'From your activity work'
          : 'Room to discover';

  return (
    <article className={`profile-dimension profile-tone-${tone}`}>
      <details className="profile-dimension-detail">
        <summary>
          <div className="profile-card-heading">
            <span className="profile-card-icon">
              <Icon size={23} strokeWidth={1.65} aria-hidden="true" />
            </span>
            <h2>{section.title}</h2>
            <ChevronDown className="profile-card-chevron" size={20} aria-hidden="true" />
          </div>
          <p className="profile-card-summary">{section.summary}</p>
          <span className="profile-explore">
            Explore this part <ArrowRight size={13} aria-hidden="true" />
          </span>
        </summary>
        <div className="profile-card-body">
          <EvidenceList
            title="You said"
            items={section.said}
            emptyText="No answers recorded for this part yet."
            onEditSource={onEditSource}
          />
          <EvidenceList
            title="In your activity work"
            items={section.observed}
            emptyText="No activity observations recorded for this part yet."
            onEditSource={onEditSource}
          />
          <section className="profile-unknown">
            <h3>
              <CircleHelp size={15} aria-hidden="true" /> Still open
            </h3>
            <p>{section.unknown}</p>
          </section>
          {section.tryNext.length > 0 && (
            <section className="profile-try-next">
              <h3>
                <Sprout size={16} aria-hidden="true" /> Ideas to try
              </h3>
              <ul>
                {section.tryNext.map((idea, index) => (
                  <li key={index}>{idea}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </details>
      {section.correction && (
        <div className={`profile-student-note${disagreement ? ' profile-student-note-open' : ''}`}>
          <span className="profile-note-label">
            <MessageCirclePlus size={15} aria-hidden="true" />
            {disagreement ? 'You see this differently · still open' : 'Your say'}
          </span>
          {section.correction.note && <p>{section.correction.note}</p>}
          {disagreement && (
            <span className="profile-note-status">Your disagreement stays with this picture.</span>
          )}
        </div>
      )}
      <div className="profile-card-footer">
        <span>{sourceLabel}</span>
        <button type="button" className="profile-add-say" onClick={() => onAddSay(section)}>
          <MessageCirclePlus size={16} aria-hidden="true" />
          {section.correction ? 'Edit your say' : 'Add your say'}
        </button>
      </div>
    </article>
  );
}

export function Profile({
  session,
  onCorrection,
  onReview,
  onEditSource,
  onContinue,
  onExport,
  onExit,
}: ProfileProps) {
  const sections = buildReport({
    answers: session.answers,
    activities: session.activities,
    corrections: session.corrections,
  });
  const reviewed = canUseRoutine(session);
  const hasEvidence = sections.some(
    (section) => section.said.length > 0 || section.observed.length > 0,
  );
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDetailsElement>(null);
  const dialogTitleId = useId();
  const noteId = useId();

  useEffect(() => {
    if (draft && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [draft]);

  function editCorrection(section: ReportSection) {
    setDraft({
      dimension: section.id,
      title: section.title,
      note: section.correction?.note ?? '',
      status: section.correction?.status ?? 'comment',
    });
  }

  function closeCorrection() {
    dialogRef.current?.close();
    setDraft(null);
  }

  function saveCorrection(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || draft.note.length > 400) return;
    onCorrection({ dimension: draft.dimension, note: draft.note.trim(), status: draft.status });
    closeCorrection();
  }

  function exportCopy(format: 'text' | 'json') {
    onExport(format);
    if (exportRef.current) exportRef.current.open = false;
  }

  function printPicture() {
    const closed = Array.from(
      reportRef.current?.querySelectorAll<HTMLDetailsElement>(
        '.profile-dimension-detail:not([open])',
      ) ?? [],
    );
    closed.forEach((detail) => {
      detail.open = true;
    });
    const restore = () => {
      closed.forEach((detail) => {
        detail.open = false;
      });
    };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
  }

  return (
    <div className="profile-view" ref={reportRef}>
      <div className="profile-toolbar">
        <button type="button" className="profile-back" onClick={onExit}>
          <ArrowLeft size={17} aria-hidden="true" /> Back to discovery
        </button>
        <div className="profile-tools">
          <button
            type="button"
            className="btn btn-secondary profile-tool-button"
            onClick={printPicture}
          >
            <Printer size={16} aria-hidden="true" /> Print
          </button>
          <details className="profile-export" ref={exportRef}>
            <summary className="btn btn-secondary profile-tool-button">
              <Download size={16} aria-hidden="true" /> Save a copy{' '}
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div className="profile-export-options">
              <button type="button" onClick={() => exportCopy('text')}>
                <span>Text copy</span>
                <small>Easy to read and share</small>
              </button>
              <button type="button" onClick={() => exportCopy('json')}>
                <span>
                  Data copy <small className="profile-json-label">JSON</small>
                </span>
                <small>Your recorded answers and work</small>
              </button>
            </div>
          </details>
        </div>
      </div>

      <header className="profile-hero">
        <div className="profile-hero-copy">
          <span className="profile-eyebrow">
            <Sparkles size={15} aria-hidden="true" /> YOUR LEARNING PICTURE
          </span>
          <h1 id="screen-title" tabIndex={-1}>
            Your learning,
            <br />
            <span>discovered.</span>
          </h1>
          <p>
            An early picture of what you told us and tried. Open any part to see where it came from.
            You get the final say.
          </p>
          <p className="small-copy">
            Recent-habit answers cover {formatReflectionWindow(session.reflectionWindow)}. Saved
            answers keep these dates; activity work and new-activity preferences are separate. Start
            a fresh visit for a new picture.
          </p>
          <div className="profile-hero-tags" aria-label="What is in your learning picture">
            <span>
              <MessageCirclePlus size={14} aria-hidden="true" /> Your words
            </span>
            <span>
              <Shapes size={14} aria-hidden="true" /> Your activity work
            </span>
            <span>
              <Sprout size={14} aria-hidden="true" /> Room to change
            </span>
          </div>
        </div>
        <div className="profile-hero-art" aria-hidden="true">
          <div className="profile-art-orbit" />
          <div className="profile-art-tile profile-art-tile-back">
            <Shapes size={48} strokeWidth={1.25} />
          </div>
          <div className="profile-art-tile profile-art-tile-front">
            <Sparkles size={27} strokeWidth={1.3} />
            <span>
              Your voice
              <br />
              belongs here.
            </span>
            <div className="profile-art-underline" />
          </div>
          <span className="profile-art-sprout">
            <Sprout size={49} strokeWidth={1.25} />
          </span>
          <span className="profile-art-star">✦</span>
          <span className="profile-art-dot" />
        </div>
      </header>

      <section className="profile-map" aria-labelledby="profile-map-title">
        <div className="profile-map-intro">
          <div>
            <span className="profile-eyebrow">A LITTLE MORE ABOUT YOU</span>
            <h2 id="profile-map-title">Explore your learning picture.</h2>
          </div>
          <p>
            Tap a card to look closer.
            <br />
            Something missing? Add your say.
          </p>
        </div>
        {!hasEvidence && (
          <div className="profile-empty-state">
            <span className="profile-empty-icon">
              <Sprout size={25} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div>
              <h3>There’s room for your story.</h3>
              <p>
                There are no answers or activity observations to show yet. These parts can stay
                unknown, or you can go back and try something. You can still review this picture.
              </p>
            </div>
          </div>
        )}
        <div className="profile-card-grid">
          {sections.map((section) => (
            <LearningCard
              key={section.id}
              section={section}
              onEditSource={onEditSource}
              onAddSay={editCorrection}
            />
          ))}
        </div>
      </section>

      <section
        className={`profile-review${reviewed ? ' profile-review-complete' : ''}`}
        aria-labelledby="profile-review-title"
      >
        <span className="profile-review-icon">
          {reviewed ? (
            <Check size={25} aria-hidden="true" />
          ) : (
            <MessageCirclePlus size={25} aria-hidden="true" />
          )}
        </span>
        <div className="profile-review-copy">
          <span className="profile-eyebrow">YOUR VOICE COMES FIRST</span>
          <h2 id="profile-review-title">
            {reviewed ? 'You’ve reviewed this picture.' : 'Does this feel like you?'}
          </h2>
          <p>
            {reviewed
              ? 'Your notes and open questions stay with your picture. You can come back and change it whenever you want.'
              : 'Check your answers, add anything we missed, or leave a part open. Reviewing means you’ve seen it; your disagreements stay open.'}
          </p>
        </div>
        <div className="profile-review-action">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReview}
            disabled={reviewed}
          >
            {reviewed && <Check size={17} aria-hidden="true" />}
            {reviewed ? 'Reviewed' : 'I’ve reviewed this picture'}
          </button>
          <span role="status">
            {reviewed ? 'This version is ready for your next step.' : 'Unknowns are okay, too.'}
          </span>
        </div>
      </section>

      <section className="profile-next" aria-labelledby="profile-next-title">
        <div>
          <span className="profile-eyebrow">A SMALL NEXT STEP</span>
          <h2 id="profile-next-title">Make space for your kind of learning.</h2>
          <p>Choose a small routine to try, then see what you want to keep or change.</p>
        </div>
        <div className="profile-next-action">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinue}
            disabled={!reviewed}
          >
            Build my trial routine <ArrowRight size={18} aria-hidden="true" />
          </button>
          {!reviewed && <span>Review your picture above to continue.</span>}
        </div>
      </section>
      <p className="profile-footer-note">
        A picture of this visit. Always room to learn something new about you.
      </p>

      <dialog
        className="profile-correction-dialog"
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <form onSubmit={saveCorrection}>
            <div className="profile-dialog-heading">
              <span className="profile-dialog-icon">
                <MessageCirclePlus size={25} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <button
                type="button"
                className="profile-dialog-close"
                aria-label="Close your note"
                onClick={closeCorrection}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <span className="profile-eyebrow">YOUR WORDS MATTER</span>
            <h2 id={dialogTitleId}>Add your say.</h2>
            <p className="profile-dialog-section">{draft.title}</p>
            <fieldset className="profile-correction-choices">
              <legend>What would you like to say?</legend>
              <label className={draft.status === 'comment' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="profile-correction-status"
                  value="comment"
                  checked={draft.status === 'comment'}
                  onChange={() => setDraft({ ...draft, status: 'comment' })}
                />
                <span>
                  <strong>I’d like to add something</strong>
                  <small>Add a detail, an example, or a change.</small>
                </span>
              </label>
              <label className={draft.status === 'disagree' ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="profile-correction-status"
                  value="disagree"
                  checked={draft.status === 'disagree'}
                  onChange={() => setDraft({ ...draft, status: 'disagree' })}
                />
                <span>
                  <strong>This part doesn’t fit me</strong>
                  <small>Keep this part open with my view beside it.</small>
                </span>
              </label>
            </fieldset>
            <div className="profile-note-input">
              <label htmlFor={noteId}>
                Your words <span>(optional)</span>
              </label>
              <textarea
                id={noteId}
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                maxLength={400}
                rows={4}
                placeholder="What would you like us to understand?"
                aria-describedby={`${noteId}-hint ${noteId}-count`}
              />
              <div className="profile-note-input-help">
                <span id={`${noteId}-hint`}>Share only what you want to.</span>
                <span id={`${noteId}-count`}>{draft.note.length}/400</span>
              </div>
            </div>
            {draft.note.length > 400 && (
              <p className="profile-note-error">Use 400 characters or fewer to save your note.</p>
            )}
            <div className="profile-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={closeCorrection}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={draft.note.length > 400}>
                Save my say <Check size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
