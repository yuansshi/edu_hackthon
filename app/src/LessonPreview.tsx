import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Coffee, Eye, RotateCcw, Sprout, Timer } from 'lucide-react';
import type { TeachingProfile } from './handoff';
import { designLesson } from './lessonDesign';
import { createLessonPractice } from './lessonPractice.mjs';
import './LessonPreview.css';

type Stage = 'plan' | 'practice' | 'feedback' | 'teaching' | 'trade' | 'fresh' | 'evidence';
type LessonPreviewProps = { profile: TeachingProfile; onBack: () => void };

function stageNumber(stage: Stage): number {
  switch (stage) {
    case 'plan':
      return 0;
    case 'practice':
    case 'feedback':
      return 1;
    case 'teaching':
    case 'trade':
      return 2;
    case 'fresh':
      return 3;
    case 'evidence':
      return 4;
  }
}

function Blocks({ tens, ones }: { tens: number; ones: number }) {
  return (
    <div className="lp-blocks" role="img" aria-label={`${tens} tens and ${ones} ones`}>
      <span className="lp-tens" aria-hidden="true">
        {Array.from({ length: tens }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <span className="lp-ones" aria-hidden="true">
        {Array.from({ length: ones }, (_, index) => (
          <i key={index} />
        ))}
      </span>
    </div>
  );
}

export function LessonPreview({ profile, onBack }: LessonPreviewProps) {
  const design = useMemo(() => designLesson(profile), [profile]);
  const visualStart = design.approach === 'guided';
  const math = useMemo(() => createLessonPractice({ initialSupport: visualStart }), [visualStart]);
  const [stage, setStage] = useState<Stage>('plan');
  const [paused, setPaused] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentStep = stageNumber(stage);
  const name = design.learner || 'you';
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [stage]);

  const title =
    stage === 'plan'
      ? 'A lesson with you in mind'
      : stage === 'fresh'
        ? 'A new problem to try'
        : stage === 'evidence'
          ? 'The work tells the story'
          : 'Tens, ones, and equal trades';

  return (
    <div className="lesson-preview page-width">
      <div className="lp-toolbar">
        <button type="button" className="lp-text-button" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Back to my routine
        </button>
        <span className="lp-preview-note">Lesson interaction preview</span>
        <button
          type="button"
          className="lp-text-button"
          onClick={() => setPaused((value) => !value)}
        >
          <Coffee size={17} aria-hidden="true" /> {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <ol className="lp-progress" aria-label="Lesson progress">
        {['Your plan', 'Show the thinking', 'Try some help', 'A fresh check', 'The evidence'].map(
          (step, index) => (
            <li key={step} aria-current={index === currentStep ? 'step' : undefined}>
              <span>
                {index < currentStep ? <Check size={13} aria-hidden="true" /> : index + 1}
              </span>
              {step}
            </li>
          ),
        )}
      </ol>
      <header className="lp-heading">
        <div>
          <p className="lp-kicker">Discovery profile → lesson design</p>
          <h1 id="screen-title" ref={heading} tabIndex={-1}>
            {title}
          </h1>
          <p>
            {stage === 'plan'
              ? `For ${name}, starting with the choices in your reviewed profile.`
              : design.opening}
          </p>
        </div>
        <div className="lp-goal">
          <Sprout size={23} aria-hidden="true" />
          <span>
            Today’s math goal<strong>10 ones = 1 ten</strong>
          </span>
        </div>
      </header>

      {paused ? (
        <section className="lp-pause" aria-label="Lesson paused">
          <Coffee size={36} aria-hidden="true" />
          <h2>Take the time you need</h2>
          <p>Your place stays here. There’s no countdown.</p>
          <button type="button" className="lp-primary" onClick={() => setPaused(false)}>
            Ready to continue
          </button>
        </section>
      ) : stage === 'plan' ? (
        <section className="lp-plan-layout" aria-label="Personalized lesson plan">
          <div className="lp-personal-plan">
            <span className="lp-small-label">The invitation</span>
            <h2>“{design.opening}”</h2>
            <div className="lp-plan-row">
              <Eye size={20} aria-hidden="true" />
              <div>
                <h3>How we’ll begin</h3>
                <p>
                  {visualStart
                    ? 'A picture of the tens and ones, with one step at a time.'
                    : design.approach === 'challenge'
                      ? 'A concise problem first, with a visual explanation available when you choose help.'
                      : 'A clear invitation, with a choice to explore a visual explanation.'}
                </p>
              </div>
            </div>
            <div className="lp-plan-row">
              <Timer size={20} aria-hidden="true" />
              <div>
                <h3>Room for your pace</h3>
                <p>{design.pacing}</p>
              </div>
            </div>
            <div className="lp-plan-row">
              <Sprout size={20} aria-hidden="true" />
              <div>
                <h3>Encouragement</h3>
                <p>{design.encouragement}</p>
              </div>
            </div>
            {design.supportLabels.length > 0 && (
              <div className="lp-supports" aria-label="Chosen supports">
                {design.supportLabels.map((support) => (
                  <span key={support}>{support}</span>
                ))}
              </div>
            )}
            <button type="button" className="lp-primary" onClick={() => setStage('practice')}>
              Start this lesson <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
          <aside className="lp-plan-aside">
            <div className="lp-math-note">
              <span>Foundational review</span>
              <strong>27 + 18</strong>
              <p>
                We’ll explore how regrouping keeps the amount the same, then try a fresh problem.
              </p>
            </div>
            <p className="lp-readiness">
              The math goal is selected for this demonstration. Your profile changes the
              interaction; it does not decide your math level.
            </p>
            <details className="lp-rationale">
              <summary>Why this lesson design?</summary>
              {design.rationale.map((reason, index) => (
                <div className="lp-reason" key={`${reason.title}-${index}`}>
                  <h3>{reason.title}</h3>
                  <p>{reason.detail}</p>
                  {reason.sourceIds.length > 0 && (
                    <small>Profile sources: {reason.sourceIds.join(', ')}</small>
                  )}
                </div>
              ))}
              <small>
                Based on reviewed profile revision {design.sourceRevision}. You can return to your
                profile to change what fits.
              </small>
            </details>
          </aside>
        </section>
      ) : stage === 'evidence' ? (
        <section className="lp-evidence-layout" aria-label="Prepared lesson evidence">
          <div className="lp-evidence-history">
            <article>
              <span className="lp-history-dot lp-coral" />
              <div>
                <small>Practice · 27 + 18</small>
                <h2>The new ten was left out</h2>
                <p>{math.practice.explanation}</p>
                <strong>Support needed</strong>
              </div>
            </article>
            <article>
              <span className="lp-history-dot lp-lime" />
              <div>
                <small>Worked teaching · 27 + 18</small>
                <h2>The exchange was shown with help</h2>
                <p>3 tens + 15 ones became 4 tens + 5 ones. The answer stayed 45.</p>
                <strong>
                  {math.afterHelp.needActive
                    ? 'Fresh check still needed'
                    : 'Review the prepared evidence'}
                </strong>
              </div>
            </article>
            <article>
              <span className="lp-history-dot lp-green" />
              <div>
                <small>Fresh prepared check · 36 + 27</small>
                <h2>The same idea on a new problem</h2>
                <p>{math.fresh.explanation}</p>
                <strong>
                  {math.afterFresh.independentShown
                    ? 'Shown on this prepared check'
                    : 'More evidence needed'}
                </strong>
              </div>
            </article>
          </div>
          <aside className="lp-evidence-conclusion">
            <span className="lp-small-label">Math rules applied to prepared evidence</span>
            <h2>
              {math.afterFresh.needActive
                ? 'The need stays visible'
                : 'The need clears. The history stays.'}
            </h2>
            <p>
              The teaching approach came from the profile. The mathematical finding came from the
              work.
            </p>
            <dl>
              <div>
                <dt>Current need</dt>
                <dd>{math.afterFresh.needActive ? 'Still active' : 'Cleared on this example'}</dd>
              </div>
              <div>
                <dt>Later review</dt>
                <dd>
                  {math.afterFresh.laterReviewPending ? 'Still pending' : 'Not established here'}
                </dd>
              </div>
            </dl>
            <p className="lp-small">
              This shows current evidence in a prepared scenario, not lasting mastery.
            </p>
            <button type="button" className="lp-primary" onClick={() => setStage('plan')}>
              <RotateCcw size={17} aria-hidden="true" /> Replay this lesson
            </button>
            <button type="button" className="lp-secondary" onClick={onBack}>
              Back to my routine
            </button>
          </aside>
        </section>
      ) : (
        <section
          className="lp-workspace"
          aria-label={stage === 'fresh' ? 'Fresh prepared check' : 'Regrouping practice'}
        >
          <div className="lp-board">
            <div className="lp-board-heading">
              <span>
                {stage === 'fresh'
                  ? 'A fresh problem'
                  : stage === 'teaching' || stage === 'trade'
                    ? 'Worked teaching'
                    : 'Practice'}
              </span>
              <span>{stage === 'fresh' ? 'No worked example on this task' : 'Tens and ones'}</span>
            </div>
            <div className="lp-equation">
              {stage === 'fresh' ? '36 + 27' : '27 + 18'} <span>=</span>{' '}
              <strong>{stage === 'trade' ? '45' : '?'}</strong>
            </div>
            {stage === 'teaching' || stage === 'trade' ? (
              <>
                <Blocks tens={stage === 'trade' ? 4 : 3} ones={stage === 'trade' ? 5 : 15} />
                <p className="lp-board-caption">
                  {stage === 'trade' ? '4 tens and 5 ones' : '3 tens and 15 ones'}
                </p>
              </>
            ) : visualStart && stage !== 'fresh' ? (
              <>
                <div className="lp-number-pair">
                  <div>
                    <Blocks tens={2} ones={7} />
                    <span>2 tens + 7 ones</span>
                  </div>
                  <b>+</b>
                  <div>
                    <Blocks tens={1} ones={8} />
                    <span>1 ten + 8 ones</span>
                  </div>
                </div>
                <p className="lp-board-caption">Start with the ones, then look at the tens.</p>
              </>
            ) : (
              <div className="lp-open-space">
                <p>
                  {stage === 'fresh'
                    ? 'A new set of numbers. The same equal-trade idea.'
                    : 'Think of a strategy. You can explore a visual explanation when you choose help.'}
                </p>
              </div>
            )}
            <div className="lp-board-footnote">
              {stage === 'fresh'
                ? 'The response is revealed when you check the prepared example.'
                : 'A teacher-selected review task; visual support is available.'}
            </div>
          </div>
          <div className="lp-response">
            {stage === 'practice' || stage === 'feedback' ? (
              <>
                <span className="lp-small-label">Prepared learner response</span>
                <blockquote>{math.practice.explanation}</blockquote>
                {stage === 'practice' ? (
                  <button type="button" className="lp-primary" onClick={() => setStage('feedback')}>
                    Check this sample <ArrowRight size={18} aria-hidden="true" />
                  </button>
                ) : (
                  <div className="lp-feedback">
                    <span className="lp-result-dot" />
                    <h2>A ten went missing</h2>
                    <p>
                      The explanation keeps five ones but drops the new ten. Let’s make the exchange
                      visible.
                    </p>
                    <button
                      type="button"
                      className="lp-primary"
                      onClick={() => setStage('teaching')}
                    >
                      Show the teaching step <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            ) : stage === 'teaching' || stage === 'trade' ? (
              <>
                <span className="lp-small-label">Worked help · practice is now assisted</span>
                <h2>
                  {stage === 'trade'
                    ? 'Same amount, new arrangement'
                    : 'Ten ones can become one ten'}
                </h2>
                <p className="lp-teaching-copy">{math.teachingSteps[stage === 'trade' ? 3 : 2]}</p>
                <div className="lp-trade-statement">
                  {stage === 'trade' ? '4 tens + 5 ones = 45' : '3 tens + 15 ones = 45'}
                </div>
                <p className="lp-small">
                  {stage === 'trade'
                    ? 'This correction used help. A fresh problem is the next check.'
                    : 'The amount stays the same when ten ones become one ten.'}
                </p>
                <button
                  type="button"
                  className="lp-primary"
                  onClick={() => setStage(stage === 'trade' ? 'fresh' : 'trade')}
                >
                  {stage === 'trade' ? 'Try the fresh problem' : 'Trade 10 ones for 1 ten'}{' '}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <span className="lp-small-label">Prepared independent-response example</span>
                <h2>A fresh check comes after helped practice</h2>
                <p>
                  We’ll reveal the prepared learner explanation and let the same math rules check
                  the evidence.
                </p>
                <button type="button" className="lp-primary" onClick={() => setStage('evidence')}>
                  Check the prepared response <ArrowRight size={18} aria-hidden="true" />
                </button>
                <p className="lp-small">
                  No hints or worked decomposition are shown on this fresh task.
                </p>
              </>
            )}
          </div>
        </section>
      )}
      <footer className="lp-disclosure">
        <strong>Lesson interaction preview.</strong> Profile choices shape the plan; math responses
        are prepared and use the existing math rules. Freshness and independence are prepared
        assumptions. This walkthrough does not submit work for live assessment. Handwriting
        assessment remains in development.
      </footer>
    </div>
  );
}
