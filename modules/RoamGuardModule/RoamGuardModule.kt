// modules/RoamGuardModule/android/src/main/java/expo/modules/roamguard/RoamGuardModule.kt
//
// Expo Modules API — Kotlin native module
// Registers as "RoamGuardModule" in the Expo module registry.
//
// Place this file at:
//   android/app/src/main/java/expo/modules/roamguard/RoamGuardModule.kt
//
// Add to android/app/src/main/java/expo/modules/roamguard/RoamGuardPackage.kt:
//   class RoamGuardPackage : Package { override fun createModules(...) = listOf(RoamGuardModule(it)) }

package expo.modules.roamguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import android.telephony.ServiceState
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RoamGuardModule : Module() {

    private var receiver: CallStateReceiver? = null
    private val prefs: SharedPreferences
        get() = appContext.reactContext!!
            .getSharedPreferences("roamguard", Context.MODE_PRIVATE)

    override fun definition() = ModuleDefinition {

        Name("RoamGuardModule")

        // ── Events emitted to JS ──────────────────────────────────────────────
        Events("onCallRinging", "onCallMissed")

        // ── JS-callable functions ─────────────────────────────────────────────

        Function("startListening") {
            registerReceiver()
        }

        Function("stopListening") {
            unregisterReceiver()
        }

        Function("setTriggerMode") { mode: String ->
            prefs.edit().putString("trigger_mode", mode).apply()
        }

        Function("setEnabled") { enabled: Boolean ->
            prefs.edit().putBoolean("enabled", enabled).apply()
        }

        Function("setTestMode") { testMode: Boolean ->
            prefs.edit().putBoolean("test_mode", testMode).apply()
        }

        Function("saveMessage") { message: String ->
            prefs.edit().putString("message", message).apply()
        }

        Function("getNetworkStatus") {
            val ctx = appContext.reactContext!!
            val tm  = ctx.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            val roaming    = tm?.isNetworkRoaming ?: false
            val noCoverage = isOutOfCoverage(ctx, tm)
            mapOf(
                "isRoaming"       to roaming,
                "isOutOfCoverage" to noCoverage,
                "shouldAutoReply" to (roaming || noCoverage),
            )
        }

        // ── Lifecycle ─────────────────────────────────────────────────────────
        OnCreate {
            // Auto-start if was previously enabled
            if (prefs.getBoolean("enabled", false)) registerReceiver()
        }

        OnDestroy {
            unregisterReceiver()
        }
    }

    // ── Network helpers ───────────────────────────────────────────────────────

    private fun isAirplaneModeOn(context: Context): Boolean {
        return Settings.Global.getInt(
            context.contentResolver,
            Settings.Global.AIRPLANE_MODE_ON, 0
        ) != 0
    }

    private fun isOutOfCoverage(context: Context, tm: TelephonyManager?): Boolean {
        if (isAirplaneModeOn(context)) return true
        if (tm == null) return false
        if (tm.simState != TelephonyManager.SIM_STATE_READY) return false
        val state = tm.serviceState?.state ?: return false
        return state == ServiceState.STATE_OUT_OF_SERVICE ||
               state == ServiceState.STATE_EMERGENCY_ONLY
    }

    // ── BroadcastReceiver ─────────────────────────────────────────────────────

    private fun registerReceiver() {
        if (receiver != null) return
        receiver = CallStateReceiver { event, payload ->
            sendEvent(event, payload)
        }
        val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
        val ctx = appContext.reactContext ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            ctx.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver() {
        receiver?.let {
            try { appContext.reactContext?.unregisterReceiver(it) } catch (_: Exception) {}
        }
        receiver = null
    }
}

// ── Call State Machine ────────────────────────────────────────────────────────

class CallStateReceiver(
    private val emit: (event: String, payload: Map<String, Any>) -> Unit,
) : BroadcastReceiver() {

    private var lastState    = TelephonyManager.EXTRA_STATE_IDLE
    private var ringingNum: String? = null
    private var callAnswered = false
    private var smsSent      = false

    // Dedupe: 5 minutes per number
    private val recent = mutableMapOf<String, Long>()
    private val dedupeMs = 5 * 60 * 1000L

    override fun onReceive(context: Context, intent: Intent) {
        val state  = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        val prefs    = context.getSharedPreferences("roamguard", Context.MODE_PRIVATE)
        val tm       = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val mode     = prefs.getString("trigger_mode", "both") ?: "both"
        val testMode = prefs.getBoolean("test_mode", false)

        when (state) {

            TelephonyManager.EXTRA_STATE_RINGING -> {
                if (state != lastState) {
                    ringingNum   = number
                    callAnswered = false
                    smsSent      = false

                    // Ring-time trigger: roaming_ring or both
                    val ringMode = mode == "roaming_ring" || mode == "both"
                    if (ringMode && (testMode || tm?.isNetworkRoaming == true)) {
                        emit("onCallRinging", mapOf("number" to (number ?: "")))
                    }
                }
            }

            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                callAnswered = true
            }

            TelephonyManager.EXTRA_STATE_IDLE -> {
                if (lastState == TelephonyManager.EXTRA_STATE_RINGING
                    && !callAnswered
                    && ringingNum != null
                    && !smsSent) {

                    val num        = ringingNum!!
                    val roaming    = testMode || tm?.isNetworkRoaming == true
                    val noCoverage = testMode || isOutOfCoverage(context, tm)
                    val now        = System.currentTimeMillis()

                    // Dedupe
                    val last = recent[num]
                    if (last != null && now - last < dedupeMs) {
                        reset(); lastState = state; return
                    }

                    val trigger = when {
                        mode == "roaming_missed"      && roaming    -> "roaming_missed"
                        mode == "no_coverage_missed"  && noCoverage -> "no_coverage_missed"
                        mode == "both"                && roaming    -> "roaming_missed"
                        mode == "both"                && noCoverage -> "no_coverage_missed"
                        else -> null
                    }

                    if (trigger != null) {
                        emit("onCallMissed", mapOf("number" to num, "trigger" to trigger))
                        recent[num] = now
                        smsSent = true
                    }
                }
                reset()
            }
        }

        lastState = state
    }

    private fun reset() {
        ringingNum   = null
        callAnswered = false
        smsSent      = false
    }

    private fun isOutOfCoverage(context: Context, tm: TelephonyManager?): Boolean {
        val isAirplane = Settings.Global.getInt(
            context.contentResolver, Settings.Global.AIRPLANE_MODE_ON, 0
        ) != 0
        if (isAirplane) return true
        if (tm?.simState != TelephonyManager.SIM_STATE_READY) return false
        val s = tm.serviceState?.state ?: return false
        return s == ServiceState.STATE_OUT_OF_SERVICE || s == ServiceState.STATE_EMERGENCY_ONLY
    }
}
