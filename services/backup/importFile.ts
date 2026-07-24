import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Generous enough for any real uFlow backup (even thousands of recipes and
 * years of history is a few MB of JSON) while still catching an accidental
 * wrong/huge file before it locks up validation or the UI.
 */
export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export interface PickedImportFile {
  name: string;
  content: string;
  sizeBytes: number;
}

export type PickImportFileResult = { status: 'picked'; file: PickedImportFile } | { status: 'cancelled' } | { status: 'error'; code: string; message: string };

export async function pickImportFile(): Promise<PickImportFileResult> {
  if (Platform.OS === 'web') {
    return pickImportFileWeb();
  }
  return pickImportFileNative();
}

function pickImportFileWeb(): Promise<PickImportFileResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ status: 'cancelled' });
        return;
      }
      if (!file.name.toLowerCase().endsWith('.json')) {
        resolve({ status: 'error', code: 'unsupported_file_type', message: 'Please choose a .json file.' });
        return;
      }
      if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
        resolve({
          status: 'error',
          code: 'file_too_large',
          message: `This file is too large (${Math.round(file.size / 1024 / 1024)} MB). uFlow backups are expected to be well under ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
        });
        return;
      }
      try {
        const content = await file.text();
        resolve({ status: 'picked', file: { name: file.name, content, sizeBytes: file.size } });
      } catch {
        resolve({ status: 'error', code: 'read_failed', message: 'Could not read the selected file.' });
      }
    };
    // Not all browsers fire 'cancel' on <input type=file>, but Chromium-based ones do — a real cancellation
    // otherwise just never fires onchange, which the caller's own timeout/UI state already handles gracefully.
    input.oncancel = () => resolve({ status: 'cancelled' });
    input.click();
  });
}

async function pickImportFileNative(): Promise<PickImportFileResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled) return { status: 'cancelled' };
  const asset = result.assets[0];
  if (!asset) return { status: 'cancelled' };
  if (!asset.name.toLowerCase().endsWith('.json')) {
    return { status: 'error', code: 'unsupported_file_type', message: 'Please choose a .json file.' };
  }
  if (asset.size != null && asset.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return {
      status: 'error',
      code: 'file_too_large',
      message: `This file is too large. uFlow backups are expected to be well under ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    };
  }
  try {
    const content = await new File(asset.uri).text();
    return { status: 'picked', file: { name: asset.name, content, sizeBytes: asset.size ?? content.length } };
  } catch {
    return { status: 'error', code: 'read_failed', message: 'Could not read the selected file.' };
  }
}
