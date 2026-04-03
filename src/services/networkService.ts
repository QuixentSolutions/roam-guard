/**
 * networkService.ts
 * Uses expo-cellular v7 + expo-network v7 — no backend.
 */

import * as Cellular from 'expo-cellular';
import * as Network  from 'expo-network';
import { NativeModules } from 'react-native';

// ─── TEST MODE — set to false before Play Store build ─────────────────────────
export const TEST_MODE = false;

export interface NetworkStatus {
  isRoaming:       boolean;
  isOutOfCoverage: boolean;
  isAirplane:      boolean;
  noSim:           boolean;
  shouldAutoReply: boolean;
  label:           string;
  detail:          string;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  // In test mode — simulate roaming and tell native module to bypass checks
  if (TEST_MODE) {
    NativeModules.RoamGuardModule?.setTestMode?.(true);
    return {
      isRoaming: true, isOutOfCoverage: false, isAirplane: false, noSim: false, shouldAutoReply: true,
      label: 'TEST MODE — Roaming simulated', detail: 'SMS fires on every call',
    };
  }
  NativeModules.RoamGuardModule?.setTestMode?.(false);

  let isRoaming       = false;
  let isOutOfCoverage = false;
  let isAirplane      = false;
  let noSim           = false;

  try {
    // expo-cellular v6+ — isRoamingAsync()
    isRoaming = (await (Cellular as any).isRoamingAsync()) ?? false;
  } catch {
    // Simulator or permission not granted
  }

  try {
    const netState = await Network.getNetworkStateAsync();

    // Check airplane mode — expo-network v7 uses 'isAirplaneModeEnabled'
    isAirplane = (netState as any).isAirplaneModeEnabled ?? false;

    if (
      !netState.isConnected ||
      netState.type === Network.NetworkStateType.NONE
    ) {
      // Double-check cellular generation to distinguish "no SIM/airplane"
      // from "no internet but has signal" (e.g. hotel wifi with no data)
      try {
        const gen = await Cellular.getCellularGenerationAsync();
        if (gen === Cellular.CellularGeneration.UNKNOWN) {
          // Check if it's because of no SIM
          try {
            const carrierName = await Cellular.getCarrierNameAsync();
            // If carrier name is empty, likely no SIM
            noSim = !carrierName || carrierName.trim() === '';
          } catch {
            noSim = true;
          }
          isOutOfCoverage = !noSim; // If no SIM, it's not "out of coverage" per se
        }
      } catch {
        isOutOfCoverage = !netState.isConnected && !isAirplane;
      }
    }
  } catch {
    // ignore
  }

  const shouldAutoReply = isRoaming || isOutOfCoverage || noSim;

  const label = isRoaming
    ? 'Roaming abroad'
    : isAirplane
    ? 'Airplane mode'
    : noSim
    ? 'No SIM card'
    : isOutOfCoverage
    ? 'No coverage'
    : 'Home network';

  const detail = isRoaming
    ? 'SMS fires when someone calls you'
    : isAirplane
    ? 'SMS fires on missed calls'
    : noSim
    ? 'SMS fires on missed calls'
    : isOutOfCoverage
    ? 'SMS fires on missed calls'
    : 'Auto-reply is inactive here';

  return { isRoaming, isOutOfCoverage, isAirplane, noSim, shouldAutoReply, label, detail };
}
