import { useEffect, useRef, useState } from 'react';
import type { TeachingProfile } from './handoff';
import { readTutorContext, startTutorSession } from './tutorSession';
import type { TutorContext } from './tutorSession';
import './TutorLaunch.css';

type Connection =
  | { kind: 'checking' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; processingMode: TutorContext['processingMode'] }
  | { kind: 'starting'; processingMode: TutorContext['processingMode'] }
  | { kind: 'error'; processingMode: TutorContext['processingMode']; message: string };

export function TutorLaunch({ profile }: { profile: TeachingProfile }) {
  const [connection, setConnection] = useState<Connection>({ kind: 'checking' });
  const launchController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!window.location.pathname.startsWith('/discovery/')) {
      setConnection({ kind: 'unavailable' });
      return;
    }
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
    void readTutorContext(fetch, signal)
      .then((context) => {
        if (!signal.aborted)
          setConnection({ kind: 'ready', processingMode: context.processingMode });
      })
      .catch(() => {
        if (!controller.signal.aborted) setConnection({ kind: 'unavailable' });
      });
    return () => {
      controller.abort();
      launchController.current?.abort();
    };
  }, []);

  if (
    connection.kind === 'checking' ||
    connection.kind === 'unavailable' ||
    profile.routine?.acceptedRevision !== profile.revision
  )
    return null;

  async function launch() {
    if (connection.kind !== 'ready' && connection.kind !== 'error') return;
    const processingMode = connection.processingMode;
    const controller = new AbortController();
    launchController.current = controller;
    setConnection({ kind: 'starting', processingMode });
    try {
      await startTutorSession(profile, fetch, controller.signal);
      if (!controller.signal.aborted) window.location.assign('/?from=discovery');
    } catch (error) {
      if (controller.signal.aborted) return;
      setConnection({
        kind: 'error',
        processingMode,
        message:
          error instanceof Error
            ? error.message
            : 'The tutor could not connect. Your Discovery choices are still here.',
      });
    }
  }

  return (
    <section className="tutor-launch" aria-label="Continue with your plan">
      <div>
        <span className="eyebrow">YOUR PLAN → TUTORING</span>
        <h2>Use your plan with Pip.</h2>
        <p>
          Your chosen pace and supports carry into a new math session. Starting clears the current
          tutoring practice. Only your nickname, grade and chosen arrangement go to the tutor.
        </p>
        <p className="small-copy">
          {connection.processingMode === 'live'
            ? 'Tutoring checks use OpenAI after you send your work. Voice starts off.'
            : 'This server uses prepared processing. Live voice is unavailable.'}
        </p>
        {connection.kind === 'error' && <p role="alert">{connection.message}</p>}
      </div>
      <button
        className="btn btn-primary"
        disabled={connection.kind === 'starting'}
        onClick={() => void launch()}
      >
        {connection.kind === 'starting' ? 'Starting your session…' : 'Start a new tutoring session'}
      </button>
    </section>
  );
}
