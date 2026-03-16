import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const K = {
  ENABLED:      '@rg/enabled',
  MESSAGE:      '@rg/message',
  TRIGGER_MODE: '@rg/trigger_mode',
  SKIP_CONTACTS:'@rg/skip_contacts',
  LOG_REPLIES:  '@rg/log_replies',
  REPLY_LOG:    '@rg/reply_log',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type TriggerMode =
  | 'roaming_ring'        // SMS on every call while roaming
  | 'roaming_missed'      // SMS only on missed calls while roaming
  | 'no_coverage_missed'  // SMS only on missed calls when no signal
  | 'both';               // roaming_ring + no_coverage_missed (default)

export interface ReplyLogEntry {
  id:        string;
  number:    string;
  timestamp: number;
  message:   string;
  trigger:   string;
}

export interface AppSettings {
  enabled:      boolean;
  message:      string;
  triggerMode:  TriggerMode;
  skipContacts: boolean;
  logReplies:   boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_MESSAGE =
  "Hi! I'm currently abroad. To avoid roaming charges, please reach me on WhatsApp instead. Thank you!";

export const DEFAULT_SETTINGS: AppSettings = {
  enabled:      false,
  message:      DEFAULT_MESSAGE,
  triggerMode:  'both',
  skipContacts: false,
  logReplies:   true,
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function loadSettings(): Promise<AppSettings> {
  const [enabled, message, triggerMode, skipContacts, logReplies] =
    await AsyncStorage.multiGet([
      K.ENABLED, K.MESSAGE, K.TRIGGER_MODE, K.SKIP_CONTACTS, K.LOG_REPLIES,
    ]);

  return {
    enabled:      enabled[1]      === 'true',
    message:      message[1]      ?? DEFAULT_MESSAGE,
    triggerMode:  (triggerMode[1] as TriggerMode) ?? 'both',
    skipContacts: skipContacts[1] === 'true',
    logReplies:   logReplies[1]   !== 'false',
  };
}

export async function saveSetting(
  key: keyof AppSettings,
  value: string | boolean
): Promise<void> {
  const map: Record<keyof AppSettings, string> = {
    enabled:      K.ENABLED,
    message:      K.MESSAGE,
    triggerMode:  K.TRIGGER_MODE,
    skipContacts: K.SKIP_CONTACTS,
    logReplies:   K.LOG_REPLIES,
  };
  await AsyncStorage.setItem(map[key], String(value));
}

// ─── Reply Log ────────────────────────────────────────────────────────────────
export async function getReplyLog(): Promise<ReplyLogEntry[]> {
  const raw = await AsyncStorage.getItem(K.REPLY_LOG);
  return raw ? JSON.parse(raw) : [];
}

export async function addReplyLogEntry(entry: ReplyLogEntry): Promise<void> {
  const log  = await getReplyLog();
  const next = [entry, ...log].slice(0, 100);
  await AsyncStorage.setItem(K.REPLY_LOG, JSON.stringify(next));
}

export async function clearReplyLog(): Promise<void> {
  await AsyncStorage.removeItem(K.REPLY_LOG);
}
