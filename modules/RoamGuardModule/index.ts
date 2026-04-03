/**
 * modules/RoamGuardModule/index.ts
 *
 * Expo Native Module wrapping Android TelephonyManager for real-time
 * call state detection. Built with the Expo Modules API.
 *
 * After running `expo prebuild`, place the native source files in:
 *   android/app/src/main/java/expo/modules/roamguard/
 *
 * The module emits two events to JS:
 *   - onCallRinging  { number: string }
 *   - onCallMissed   { number: string, trigger: string }
 */

import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';

// The native module object
const RoamGuardNative = NativeModulesProxy.RoamGuardModule;

export type CallRingingEvent = { number: string };
export type CallMissedEvent  = { number: string; trigger: string };

type RoamGuardEvents = {
  onCallRinging: (event: CallRingingEvent) => void;
  onCallMissed:  (event: CallMissedEvent)  => void;
};

const emitter = new EventEmitter<RoamGuardEvents>(RoamGuardNative as any);

/** Start the native phone state listener (call once on app boot) */
export function startListening(): void {
  RoamGuardNative?.startListening();
}

/** Stop the native listener (call on cleanup) */
export function stopListening(): void {
  RoamGuardNative?.stopListening();
}

/** Persist the trigger mode to native SharedPreferences */
export function setTriggerMode(mode: string): void {
  RoamGuardNative?.setTriggerMode(mode);
}

/** Subscribe to ringing events */
export function addCallRingingListener(
  listener: (event: CallRingingEvent) => void
): EventSubscription {
  return emitter.addListener('onCallRinging', listener);
}

/** Subscribe to missed call events */
export function addCallMissedListener(
  listener: (event: CallMissedEvent) => void
): EventSubscription {
  return emitter.addListener('onCallMissed', listener);
}

export default RoamGuardNative;
