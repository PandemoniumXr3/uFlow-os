import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import { SUPPORT_EMAIL } from '@/constants/support';
import { buildFeedbackMessage, type FeedbackCategory, type FeedbackContext } from './buildFeedbackMessage';

export type { FeedbackCategory, FeedbackContext };

/** Reads the same version/build values configured in app.json — no new native dependency. */
export function getFeedbackContext(route?: string): FeedbackContext {
  const config = Constants.expoConfig;
  const buildNumber = Platform.OS === 'ios' ? config?.ios?.buildNumber : Platform.OS === 'android' ? String(config?.android?.versionCode ?? '') : undefined;
  return {
    appVersion: config?.version,
    buildNumber,
    platform: Platform.OS,
    route,
  };
}

export interface SendFeedbackResult {
  success: boolean;
  method: 'mail' | 'clipboard' | 'unavailable';
}

/**
 * Opens the mail composer prefilled with subject/body via a mailto: URL — the same "review before
 * sending" behavior as any mailto link, no backend and no new native dependency. Falls back to
 * copying the address + message to the clipboard if no mail client is available.
 */
export async function sendFeedback(category: FeedbackCategory, context: FeedbackContext, errorMessage?: string): Promise<SendFeedbackResult> {
  const { subject, body } = buildFeedbackMessage(category, context, errorMessage);
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      return { success: true, method: 'mail' };
    }
  } catch {
    // fall through to clipboard fallback below
  }

  try {
    await Clipboard.setStringAsync(`To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n${body}`);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'unavailable' };
  }
}
