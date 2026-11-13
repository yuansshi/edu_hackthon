export function analyzeMathCoach(problem, transcript) {
  if (problem !== '27 + 18' || typeof transcript !== 'string' || Array.from(transcript).length > 4000) {
    throw new TypeError('Invalid coaching request');
  }
  if (!transcript.trim()) {
    return {
      ok: false,
      kind: 'empty',
      response: 'Can you tell me what you are trying to do with the numbers?',
      nextStep: 'Say or write the steps you are thinking about.'
    };
  }
  return {
    ok: true,
    kind: 'needs_clarification',
    focus: 'reasoning',
    response: 'Can you show me what you did with the ones and tens?',
    nextStep: 'Explain or show your steps.'
  };
}
