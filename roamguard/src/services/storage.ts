import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const K = {
  ENABLED:       '@rg/enabled',
  MESSAGE:       '@rg/message',
  TEMPLATE_NAME: '@rg/template_name',
  TRIGGER_MODE:  '@rg/trigger_mode',
  SKIP_CONTACTS: '@rg/skip_contacts',
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

