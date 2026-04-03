/**
 * useCallDetection.ts
 *
 * Expo SDK call detection approach:
 *
 * ANDROID:
 *   expo-cellular + expo-background-fetch poll phone state.
 *   For real-time call detection, a bare workflow Expo module is needed
 *   (RoamGuardNativeModule) that wraps TelephonyManager.
 *   We provide the full implementation for the native module below.
 *   In managed Expo workflow, we use Background Fetch + Notifications as
 *   a fallback to prompt the user.
 *
 * iOS:
 *   CallKit integration via CXCallObserver gives real call state.
 *   expo-av audio session changes also signal call state.
 *
 * This hook handles the JS/React side. The native module (see
 * modules/RoamGuardModule) handles the actual TelephonyManager listening.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, AppStateStatus, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { loadSettings, addCallLogEntry } from '../services/storage';
import { getNetworkStatus } from '../services/networkService';
import { sendAutoReplySMS, enqueueSMS, drainSMSQueue } from '../services/smsService';
import { TriggerMode } from '../services/storage';

// The native module is registered by the Expo Module (modules/RoamGuardModule)
const { RoamGuardModule } = NativeModules;

export interface CallEvent {
  number:  string;
  state:   'ringing' | 'answered' | 'missed';
  trigger: string;
}

export function useCallDetection(onCallEvent?: (event: CallEvent) => void) {
  const appState = useRef(AppState.currentState);

  const handleMissedCall = useCallback(async (number: string, trigger: string) => {
    console.log(`[useCallDetection] Missed call from ${number}, trigger: ${trigger}`);
    const settings = await loadSettings();
    if (!settings.enabled) {
      console.log('[useCallDetection] App disabled, skipping');
      await addCallLogEntry({ number, state: 'missed', status: 'failed', trigger, error: 'App disabled' });
      Alert.alert('⛔ Skipped', 'App is disabled');
      return;
    }

    console.log(`[useCallDetection] Attempting to send SMS to ${number}`);
    const result = await sendAutoReplySMS(number, settings.message, settings.templateName);

    if (result.success) {
      console.log(`[useCallDetection] SMS sent successfully to ${number}`);
      await addCallLogEntry({ number, state: 'missed', status: 'sent', trigger });
      Alert.alert('✅ SMS Sent', `Auto-reply sent to ${number}`);
    } else if (result.method === 'skipped') {
      console.log(`[useCallDetection] SMS skipped (dedupe) for ${number}`);
      await addCallLogEntry({ number, state: 'missed', status: 'skipped', trigger });
      Alert.alert('⏭ Skipped', `Already sent to ${number} within 5 mins`);
    } else {
      // SMS failed — enqueue for later delivery
      console.log(`[useCallDetection] SMS failed for ${number}, enqueueing: ${result.error}`);
      await enqueueSMS(number, settings.message, settings.templateName);
      await addCallLogEntry({ number, state: 'missed', status: 'queued', trigger, error: result.error });
      Alert.alert('❌ SMS Queued', `Will send to ${number} when online`);
    }
    onCallEvent?.({ number, state: 'missed', trigger });
  }, [onCallEvent]);

  const handleRingingCall = useCallback(async (number: string) => {
    Alert.alert('📳 Call Ringing', `From: ${number}`);
    const settings = await loadSettings();
    if (!settings.enabled) { Alert.alert('⛔ Skipped', 'App is disabled'); return; }

    const net = await getNetworkStatus();
    const mode: TriggerMode = settings.triggerMode;
    Alert.alert('🌐 Network Check', `Roaming: ${net.isRoaming}\nMode: ${mode}`);

    const shouldFireOnRing =
      (mode === 'roaming_ring' || mode === 'both') && net.isRoaming;

    if (shouldFireOnRing) {
      console.log(`[useCallDetection] Ringing call from ${number}, sending SMS`);
      Alert.alert('📤 Sending SMS...', `To: ${number}`);
      const result = await sendAutoReplySMS(number, settings.message, settings.templateName);

      if (result.success) {
        console.log(`[useCallDetection] SMS sent successfully to ${number}`);
        await addCallLogEntry({ number, state: 'ringing', status: 'sent', trigger: 'roaming' });
        Alert.alert('✅ SMS Sent', `Auto-reply sent to ${number}`);
      } else if (result.method === 'skipped') {
        console.log(`[useCallDetection] SMS skipped (dedupe) for ${number}`);
        await addCallLogEntry({ number, state: 'ringing', status: 'skipped', trigger: 'roaming' });
        Alert.alert('⏭ Skipped', `Already sent to ${number} within 5 mins`);
      } else {
        // SMS failed — enqueue for later delivery
        console.log(`[useCallDetection] SMS failed for ${number}, enqueueing: ${result.error}`);
        await enqueueSMS(number, settings.message, settings.templateName);
        await addCallLogEntry({ number, state: 'ringing', status: 'queued', trigger: 'roaming', error: result.error });
        Alert.alert('❌ SMS Queued', `Will send to ${number} when online`);
      }
      onCallEvent?.({ number, state: 'ringing', trigger: 'roaming' });
    } else {
      console.log(`[useCallDetection] Conditions not met for ${number}: roaming=${net.isRoaming}, mode=${mode}`);
      await addCallLogEntry({ number, state: 'ringing', status: 'failed', trigger: `mode=${mode}`, error: 'Conditions not met' });
      Alert.alert('⏭ No SMS', `Conditions not met\nRoaming: ${net.isRoaming} | Mode: ${mode}`);
    }
  }, [onCallEvent]);

  useEffect(() => {
    if (!RoamGuardModule) {
      console.warn('[RoamGuard] Native module not available — using background fetch fallback');
      return;
    }

    // Subscribe to native call state events
    const emitter = new NativeEventEmitter(RoamGuardModule);

    const ringSub = emitter.addListener('onCallRinging', async ({ number }: { number: string }) => {
      await handleRingingCall(number);
    });

    const missSub = emitter.addListener('onCallMissed', async ({ number, trigger }: { number: string; trigger: string }) => {
      await handleMissedCall(number, trigger);
    });

    // Tell the native module to start listening
    Alert.alert('🟢 RoamGuard Active', 'Native call listener started');
    RoamGuardModule.startListening?.();

    return () => {
      ringSub.remove();
      missSub.remove();
      RoamGuardModule.stopListening?.();
    };
  }, [handleRingingCall, handleMissedCall]);

  // App state listener — re-check network when app comes to foreground
  // and drain any queued SMS messages
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'active' && appState.current !== 'active') {
        // App foregrounded — drain SMS queue and refresh network status
        console.log('[useCallDetection] App foregrounded — draining SMS queue');
        const sentCount = await drainSMSQueue();
        if (sentCount > 0) {
          Alert.alert('📤 SMS Queue Drained', `${sentCount} queued message(s) sent`);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}
