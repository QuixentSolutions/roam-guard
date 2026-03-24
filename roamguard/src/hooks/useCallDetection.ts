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
import { loadSettings } from '../services/storage';
import { getNetworkStatus } from '../services/networkService';
import { sendAutoReplySMS } from '../services/smsService';
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
    Alert.alert('📞 Missed Call', `From: ${number}\nTrigger: ${trigger}`);
    const settings = await loadSettings();
    if (!settings.enabled) { Alert.alert('⛔ Skipped', 'App is disabled'); return; }

    Alert.alert('📤 Sending SMS...', `To: ${number}`);
    const result = await sendAutoReplySMS(number, settings.message, settings.templateName);

    if (result.success) {
      Alert.alert('✅ SMS Sent', `Auto-reply sent to ${number}`);
    } else if (result.method === 'skipped') {
      Alert.alert('⏭ Skipped', `Already sent to ${number} within 5 mins`);
    } else {
      Alert.alert('❌ SMS Failed', result.error ?? 'Unknown error');
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
      Alert.alert('📤 Sending SMS...', `To: ${number}`);
      const result = await sendAutoReplySMS(number, settings.message, settings.templateName);

      if (result.success) {
        Alert.alert('✅ SMS Sent', `Auto-reply sent to ${number}`);
      } else if (result.method === 'skipped') {
        Alert.alert('⏭ Skipped', `Already sent to ${number} within 5 mins`);
      } else {
        Alert.alert('❌ SMS Failed', result.error ?? 'Unknown error');
      }
      onCallEvent?.({ number, state: 'ringing', trigger: 'roaming' });
    } else {
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
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && appState.current !== 'active') {
        // App foregrounded — refresh network status
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);
}
