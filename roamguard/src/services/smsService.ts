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

// ─── 2factor.in credentials ───────────────────────────────────────────────────
const TWOFACTOR_API_KEY = '92223c66-07d3-11f1-a6b2-0200cd936042';

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
  toNumber:     string,
  message:      string,
  templateName: string,
): Promise<{ success: boolean; error?: string }> {
  // Ensure number has India country code prefix
  const formattedNumber = toNumber.startsWith('91') ? toNumber : `91${toNumber}`;

  const url  = `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`;
  const body = new URLSearchParams({
    From:         'ROAMGD',
    To:           formattedNumber,
    TemplateName: templateName,
    MSG:          message,
  });

  try {
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const json = await res.json();
    if (json.Status === 'Success') return { success: true };
    return { success: false, error: json.Details ?? 'Unknown error' };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ─── Main send function ───────────────────────────────────────────────────────
export async function sendAutoReplySMS(
  toNumber:     string,
  message:      string,
  templateName: string,
): Promise<SendResult> {
  // Dedupe guard
  const lastSent = recentReplies.get(toNumber);
  if (lastSent && Date.now() - lastSent < DEDUPE_MS) {
    return { success: false, method: 'skipped', error: 'dedupe' };
  }

  let success = false;
  let method: SendResult['method'] = 'unavailable';
  let error: string | undefined;

  // ── Try 2factor.in first ──
  const result = await sendViaTwoFactor(toNumber, message, templateName);
  success = result.success;
  method  = 'twofactor';
  error   = result.error;

  if (!success) {
    // ── Fallback: expo-sms ──
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      try {
        const { result: smsResult } = await SMS.sendSMSAsync([toNumber], message);
        success = smsResult !== 'cancelled';
        method  = Platform.OS === 'ios' ? 'compose_sheet' : 'direct';
        error   = undefined;
      } catch (err: any) {
        return { success: false, method: 'unavailable', error: err?.message };
      }
    } else {
      return { success: false, method: 'unavailable', error: 'SMS not available' };
    }
  }

  if (success) {
    recentReplies.set(toNumber, Date.now());
  }

  return { success, method, error };
}

export function clearDedupeCache() {
  recentReplies.clear();
}
