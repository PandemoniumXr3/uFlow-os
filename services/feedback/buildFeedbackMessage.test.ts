import { describe, expect, it } from 'vitest';

import { buildFeedbackMessage, type FeedbackContext } from './buildFeedbackMessage';

const context: FeedbackContext = { appVersion: '1.0.0', buildNumber: '1', platform: 'ios', route: '/settings' };

describe('buildFeedbackMessage', () => {
  it('labels each category correctly', () => {
    expect(buildFeedbackMessage('bug', context).subject).toBe('uFlow Bug report');
    expect(buildFeedbackMessage('suggestion', context).subject).toBe('uFlow Suggestion');
    expect(buildFeedbackMessage('general', context).subject).toBe('uFlow General feedback');
  });

  it('includes app version, build, platform, and route in the body', () => {
    const { body } = buildFeedbackMessage('bug', context);
    expect(body).toContain('App version: 1.0.0');
    expect(body).toContain('Build: 1');
    expect(body).toContain('Platform: ios');
    expect(body).toContain('Screen: /settings');
  });

  it('omits the screen line when no route is given', () => {
    const { body } = buildFeedbackMessage('general', { ...context, route: undefined });
    expect(body).not.toContain('Screen:');
  });

  it('falls back to "unknown" for missing version/build', () => {
    const { body } = buildFeedbackMessage('general', { platform: 'android' });
    expect(body).toContain('App version: unknown');
    expect(body).toContain('Build: unknown');
  });

  it('includes a short error message only when explicitly provided', () => {
    const withError = buildFeedbackMessage('bug', context, 'Cannot read properties of undefined');
    expect(withError.body).toContain('Error: Cannot read properties of undefined');

    const withoutError = buildFeedbackMessage('bug', context);
    expect(withoutError.body).not.toContain('Error:');
  });

  it('never includes food data, backup content, or anything beyond version/build/platform/route/error', () => {
    const { body } = buildFeedbackMessage('bug', context, 'boom');
    const allowedLines = new Set(['', '---', 'App version: 1.0.0', 'Build: 1', 'Platform: ios', 'Screen: /settings', 'Error: boom']);
    for (const line of body.split('\n')) {
      expect(allowedLines.has(line)).toBe(true);
    }
  });
});
