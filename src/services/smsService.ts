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
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── 2factor.in credentials ───────────────────────────────────────────────────
const TWOFACTOR_API_KEY = '92223c66-07d3-11f1-a6b2-0200cd936042';

// Persistent dedupe: number → last sent timestamp (5 min window)
const DEDUPE_MS = 5 * 60 * 1000;
const DEDUPE_KEY = '@rg/dedupe_cache';

// Load dedupe cache from storage on module init
let dedupeCache = new Map<string, number>();
let dedupeInitialized = false;

async function loadDedupeCache(): Promise<void> {
  if (dedupeInitialized) return;
  try {
    const raw = await AsyncStorage.getItem(DEDUPE_KEY);
    if (raw) {
      const entries: [string, number][] = JSON.parse(raw);
      dedupeCache = new Map(entries);
    }
  } catch (err) {
    console.error('[Dedupe] Failed to load cache:', err);
  }
  dedupeInitialized = true;
}

async function saveDedupeCache(): Promise<void> {
  try {
    const entries: [string, number][] = Array.from(dedupeCache.entries());
    await AsyncStorage.setItem(DEDUPE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('[Dedupe] Failed to save cache:', err);
  }
}

// Clean expired entries from dedupe cache
function cleanupDedupeCache(): void {
  const now = Date.now();
  for (const [number, timestamp] of dedupeCache.entries()) {
    if (now - timestamp > DEDUPE_MS) {
      dedupeCache.delete(number);
    }
  }
}

// ─── Persistent SMS Queue ─────────────────────────────────────────────────────
const SMS_QUEUE_KEY = '@rg/sms_queue';

export interface QueuedSMS {
  toNumber:     string;
  message:      string;
  templateName: string;
  queuedAt:     number;
  attempts:     number;
}

/**
 * Enqueue an SMS to be sent later (when app comes to foreground / network is available).
 */
export async function enqueueSMS(
  toNumber:     string,
  message:      string,
  templateName: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SMS_QUEUE_KEY);
    const queue: QueuedSMS[] = raw ? JSON.parse(raw) : [];

    // Check for duplicates in queue
    const exists = queue.some(item => item.toNumber === toNumber);
    if (exists) return; // Already queued

    queue.push({ toNumber, message, templateName, queuedAt: Date.now(), attempts: 0 });

    // Keep only last 50 queued messages to prevent storage bloat
    const trimmed = queue.slice(-50);

    await AsyncStorage.setItem(SMS_QUEUE_KEY, JSON.stringify(trimmed));
    console.log(`[SMSQueue] Enqueued SMS to ${toNumber}, queue size: ${trimmed.length}`);
  } catch (err) {
    console.error('[SMSQueue] Failed to enqueue SMS:', err);
  }
}

/**
 * Drain the SMS queue — attempt to send all queued messages.
 * Returns the number of successfully sent messages.
 */
export async function drainSMSQueue(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SMS_QUEUE_KEY);
    if (!raw) return 0;

    const queue: QueuedSMS[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    let sentCount = 0;
    const failed: QueuedSMS[] = [];

    for (const item of queue) {
      // Max 3 attempts per message
      if (item.attempts >= 3) {
        console.log(`[SMSQueue] Skipping ${item.toNumber} — max attempts reached`);
        continue;
      }

      const result = await sendAutoReplySMS(item.toNumber, item.message, item.templateName);

      if (result.success) {
        sentCount++;
        console.log(`[SMSQueue] Sent queued SMS to ${item.toNumber}`);
      } else if (result.method === 'skipped') {
        sentCount++; // Dedupe counts as "handled"
        console.log(`[SMSQueue] Skipped duplicate to ${item.toNumber}`);
      } else {
        // Increment attempts and keep in queue
        failed.push({ ...item, attempts: item.attempts + 1 });
        console.log(`[SMSQueue] Failed to send to ${item.toNumber}: ${result.error}`);
      }
    }

    // Save remaining failed messages back to queue
    await AsyncStorage.setItem(SMS_QUEUE_KEY, JSON.stringify(failed));

    console.log(`[SMSQueue] Drained: ${sentCount} sent, ${failed.length} remaining`);
    return sentCount;
  } catch (err) {
    console.error('[SMSQueue] Failed to drain queue:', err);
    return 0;
  }
}

/**
 * Get the current queue size (for debugging/UI).
 */
export async function getQueueSize(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SMS_QUEUE_KEY);
    if (!raw) return 0;
    const queue: QueuedSMS[] = JSON.parse(raw);
    return queue.length;
  } catch {
    return 0;
  }
}

/**
 * Clear the SMS queue (for testing or user action).
 */
export async function clearSMSQueue(): Promise<void> {
  await AsyncStorage.removeItem(SMS_QUEUE_KEY);
}

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
  // Load dedupe cache if not already loaded
  await loadDedupeCache();
  cleanupDedupeCache();

  // Dedupe guard — check persistent cache
  const lastSent = dedupeCache.get(toNumber);
  if (lastSent && Date.now() - lastSent < DEDUPE_MS) {
    console.log(`[SMS] Skipped duplicate to ${toNumber} (sent ${Math.floor((Date.now() - lastSent) / 1000)}s ago)`);
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
    dedupeCache.set(toNumber, Date.now());
    await saveDedupeCache();
    console.log(`[SMS] Updated dedupe cache for ${toNumber}`);
  }

  return { success, method, error };
}

export async function clearDedupeCache() {
  dedupeCache.clear();
  await AsyncStorage.removeItem(DEDUPE_KEY);
  console.log('[Dedupe] Cache cleared');
}
