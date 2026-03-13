/**
 * smsService.ts
 *
 * Sends SMS via 2factor.in API (preferred) or expo-sms fallback.
 *
 * 2factor.in: HTTP API — works on both Android and iOS, no UI prompt.
 * expo-sms:   Android direct send / iOS compose sheet (fallback).
 */

import * as SMS from 'expo-sms';
import { Platform } from 'react-native';
import { addReplyLogEntry, type ReplyLogEntry } from './storage';

// In-memory dedupe: number → last sent timestamp (5 min window)
const recentReplies = new Map<string, number>();
const DEDUPE_MS = 5 * 60 * 1000;

export interface SendResult {
  success: boolean;
  method:  'twofactor' | 'direct' | 'compose_sheet' | 'skipped' | 'unavailable';
  error?:  string;
}

// ─── 2factor.in API ───────────────────────────────────────────────────────────
async function sendViaTwoFactor(
  apiKey:   string,
  toNumber: string,
  message:  string,
): Promise<{ success: boolean; error?: string }> {
  const encoded = encodeURIComponent(message);
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${toNumber}/${encoded}`;
  try {
    const res  = await fetch(url);
    const json = await res.json();
    if (json.Status === 'Success') return { success: true };
    return { success: false, error: json.Details ?? 'Unknown error' };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ─── Main send function ───────────────────────────────────────────────────────
export async function sendAutoReplySMS(
  toNumber:        string,
  message:         string,
  trigger:         string,
  logReplies:      boolean = true,
  twoFactorApiKey: string  = '',
): Promise<SendResult> {
  // Dedupe guard
  const lastSent = recentReplies.get(toNumber);
  if (lastSent && Date.now() - lastSent < DEDUPE_MS) {
    return { success: false, method: 'skipped', error: 'dedupe' };
  }

  let success = false;
  let method: SendResult['method'] = 'unavailable';
  let error: string | undefined;

  if (twoFactorApiKey.trim()) {
    // ── Try 2factor.in first ──
    const result = await sendViaTwoFactor(twoFactorApiKey.trim(), toNumber, message);
    success = result.success;
    method  = 'twofactor';
    error   = result.error;
  } else {
    // ── Fallback: expo-sms ──
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, method: 'unavailable', error: 'SMS not available' };
    }
    try {
      const { result } = await SMS.sendSMSAsync([toNumber], message);
      success = result !== 'cancelled';
      method  = Platform.OS === 'ios' ? 'compose_sheet' : 'direct';
    } catch (err: any) {
      return { success: false, method: 'unavailable', error: err?.message };
    }
  }

  if (success) {
    recentReplies.set(toNumber, Date.now());
    if (logReplies) {
      const entry: ReplyLogEntry = {
        id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        number:    toNumber,
        timestamp: Date.now(),
        message,
        trigger,
      };
      await addReplyLogEntry(entry);
    }
  }

  return { success, method, error };
}

export function clearDedupeCache() {
  recentReplies.clear();
}
