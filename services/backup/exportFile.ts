import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ExportDeliveryMethod = 'download' | 'share' | 'clipboard';

export interface ExportDeliveryResult {
  method: ExportDeliveryMethod;
  success: boolean;
  error?: string;
}

/**
 * Delivers an export file the best way available for the current platform,
 * falling back to clipboard if that fails — this app never claims
 * encryption or guaranteed delivery, just "here's your data, in the most
 * reliable form this platform offers." Web downloads via a plain Blob +
 * temporary `<a>` (no dependency needed there); native writes the file to
 * the cache directory and opens the OS share sheet.
 */
export async function deliverExportFile(json: string, filename: string): Promise<ExportDeliveryResult> {
  if (Platform.OS === 'web') {
    return deliverViaWebDownload(json, filename);
  }
  return deliverViaNativeShare(json, filename);
}

async function deliverViaWebDownload(json: string, filename: string): Promise<ExportDeliveryResult> {
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { method: 'download', success: true };
  } catch (error) {
    return tryClipboardFallback(json, error);
  }
}

async function deliverViaNativeShare(json: string, filename: string): Promise<ExportDeliveryResult> {
  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return tryClipboardFallback(json, new Error('share_sheet_unavailable'));
    }
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: filename });
    return { method: 'share', success: true };
  } catch (error) {
    return tryClipboardFallback(json, error);
  }
}

async function tryClipboardFallback(json: string, originalError: unknown): Promise<ExportDeliveryResult> {
  try {
    await Clipboard.setStringAsync(json);
    return { method: 'clipboard', success: true };
  } catch {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    return { method: 'clipboard', success: false, error: message };
  }
}
