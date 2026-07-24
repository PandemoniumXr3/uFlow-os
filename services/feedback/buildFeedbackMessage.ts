export type FeedbackCategory = 'bug' | 'suggestion' | 'general';

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: 'Bug report',
  suggestion: 'Suggestion',
  general: 'General feedback',
};

export interface FeedbackContext {
  appVersion?: string;
  buildNumber?: string;
  platform: string;
  route?: string;
}

/**
 * Builds the mailto subject/body. Never includes food data, backup contents, or anything the user
 * didn't type themselves — just enough technical context (version/build/platform/route, and an
 * optional short, single-line error message) for the report to be actionable. Pure and React
 * Native-free so it can be unit tested directly (see this codebase's other services/*).
 */
export function buildFeedbackMessage(category: FeedbackCategory, context: FeedbackContext, errorMessage?: string): { subject: string; body: string } {
  const subject = `uFlow ${CATEGORY_LABEL[category]}`;
  const lines = [
    '',
    '',
    '---',
    `App version: ${context.appVersion ?? 'unknown'}`,
    `Build: ${context.buildNumber ?? 'unknown'}`,
    `Platform: ${context.platform}`,
  ];
  if (context.route) lines.push(`Screen: ${context.route}`);
  if (errorMessage) lines.push(`Error: ${errorMessage}`);
  return { subject, body: lines.join('\n') };
}
