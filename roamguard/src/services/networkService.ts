/**
 * networkService.ts
 * Uses expo-cellular v7 + expo-network v7 — no backend.
 */

import * as Cellular from 'expo-cellular';
import * as Network  from 'expo-network';

export interface NetworkStatus {
  isRoaming:       boolean;
  isOutOfCoverage: boolean;
  shouldAutoReply: boolean;
  label:           string;
  detail:          string;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  let isRoaming       = false;
  let isOutOfCoverage = false;

  try {
    // expo-cellular v6+ — isRoamingAsync()
    isRoaming = (await Cellular.isRoamingAsync()) ?? false;
  } catch {
    // Simulator or permission not granted
  }

  try {
    const netState = await Network.getNetworkStateAsync();

    if (
      !netState.isConnected ||
      netState.type === Network.NetworkStateType.NONE
    ) {
      // Double-check cellular generation to distinguish "no SIM/airplane"
      // from "no internet but has signal" (e.g. hotel wifi with no data)
      try {
        const gen = await Cellular.getCellularGenerationAsync();
        if (gen === Cellular.CellularGeneration.UNKNOWN) {
          isOutOfCoverage = true;
        }
      } catch {
        isOutOfCoverage = !netState.isConnected;
      }
    }
  } catch {
    // ignore
  }

  const shouldAutoReply = isRoaming || isOutOfCoverage;

  const label = isRoaming
    ? 'Roaming abroad'
    : isOutOfCoverage
    ? 'No coverage'
    : 'Home network';

  const detail = isRoaming
    ? 'SMS fires when someone calls you'
    : isOutOfCoverage
    ? 'SMS fires on missed calls'
    : 'Auto-reply is inactive here';

  return { isRoaming, isOutOfCoverage, shouldAutoReply, label, detail };
}
