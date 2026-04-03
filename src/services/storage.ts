import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const K = {
  ENABLED:       '@rg/enabled',
  MESSAGE:       '@rg/message',
  TEMPLATE_NAME: '@rg/template_name',
  TRIGGER_MODE:  '@rg/trigger_mode',
  SKIP_CONTACTS: '@rg/skip_contacts',
  SMS_QUEUE:     '@rg/sms_queue',
  CALL_LOG:      '@rg/call_log',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type TriggerMode =
  | 'roaming_ring'        // SMS on every call while roaming
  | 'roaming_missed'      // SMS only on missed calls while roaming
  | 'no_coverage_missed'  // SMS only on missed calls when no signal
  | 'both';               // roaming_ring + no_coverage_missed (default)

export interface AppSettings {
  enabled:      boolean;
  message:      string;
  templateName: string;
  triggerMode:  TriggerMode;
  skipContacts: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_MESSAGE =
  "I am currently unavailable. Please contact me on WhatsApp. Thank you!-QUIXENT DELIVERABLES PRIVATE LIMITED";

export const DEFAULT_TEMPLATE_NAME = 'AUTOREPLY MESSAGE';

export const DEFAULT_SETTINGS: AppSettings = {
  enabled:      false,
  message:      DEFAULT_MESSAGE,
  templateName: DEFAULT_TEMPLATE_NAME,
  triggerMode:  'both',
  skipContacts: false,
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function loadSettings(): Promise<AppSettings> {
  const [enabled, message, templateName, triggerMode, skipContacts] =
    await AsyncStorage.multiGet([
      K.ENABLED, K.MESSAGE, K.TEMPLATE_NAME, K.TRIGGER_MODE, K.SKIP_CONTACTS,
    ]);

  return {
    enabled:      enabled[1]      === 'true',
    message:      message[1]      ?? DEFAULT_MESSAGE,
    templateName: templateName[1] ?? DEFAULT_TEMPLATE_NAME,
    triggerMode:  (triggerMode[1] as TriggerMode) ?? 'both',
    skipContacts: skipContacts[1] === 'true',
  };
}

export async function saveSetting(
  key: keyof AppSettings,
  value: string | boolean
): Promise<void> {
  const map: Record<keyof AppSettings, string> = {
    enabled:      K.ENABLED,
    message:      K.MESSAGE,
    templateName: K.TEMPLATE_NAME,
    triggerMode:  K.TRIGGER_MODE,
    skipContacts: K.SKIP_CONTACTS,
  };
  await AsyncStorage.setItem(map[key], String(value));
}

// ─── Call Log ───────────────────────────────────────────────────────────────────
export type CallStatus = 'sent' | 'queued' | 'failed' | 'skipped';

export interface CallLogEntry {
  id:         string;
  number:     string;
  state:      'ringing' | 'missed';
  status:     CallStatus;
  trigger:    string;
  timestamp:  number;
  error?:     string;
}

/**
 * Add a new entry to the call log.
 * Keeps only the last 100 entries.
 */
export async function addCallLogEntry(entry: Omit<CallLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(K.CALL_LOG);
    const log: CallLogEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: CallLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add to beginning of array (most recent first)
    log.unshift(newEntry);

    // Keep only last 100 entries
    const trimmed = log.slice(0, 100);

    await AsyncStorage.setItem(K.CALL_LOG, JSON.stringify(trimmed));
    console.log(`[CallLog] Added entry for ${entry.number}, status: ${entry.status}`);
  } catch (err) {
    console.error('[CallLog] Failed to add entry:', err);
  }
}

/**
 * Get the call log (most recent first).
 */
export async function getCallLog(): Promise<CallLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(K.CALL_LOG);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Clear the call log.
 */
export async function clearCallLog(): Promise<void> {
  await AsyncStorage.removeItem(K.CALL_LOG);
}


