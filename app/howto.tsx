import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Platform, StatusBar,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../src/constants/theme';

const FLOW_STEPS = [
  { icon: '✈️', title: 'Before you travel', desc: 'Open RoamGuard, pick your trigger mode in Settings, and flip the main toggle ON. The app runs silently in the background.' },
  { icon: '📞', title: 'Someone calls you', desc: 'An incoming cellular call arrives on your number while you are abroad or out of coverage.' },
  { icon: '🔍', title: 'Conditions checked', desc: 'RoamGuard instantly checks: Is the SIM roaming? Is there no coverage? Was the call missed or answered?' },
  { icon: '✉️', title: 'SMS sent automatically', desc: 'If conditions match your chosen trigger mode, an SMS is sent to the caller\'s number with your custom message.' },
  { icon: '💬', title: 'They WhatsApp you', desc: 'The caller reads your message and contacts you on WhatsApp — free for both of you, no roaming charges.' },
];

const ANDROID_PERMS = [
  { icon: '📞', name: 'Read Phone State',         why: 'Detects incoming call events',          required: true  },
  { icon: '📋', name: 'Read Call Log',             why: 'Gets the caller\'s phone number',       required: true  },
  { icon: '✉️', name: 'Send SMS',                  why: 'Fallback SMS if internet unavailable',  required: true  },
  { icon: '🔔', name: 'Foreground Service',        why: 'Keeps the listener alive in background',required: true  },
  { icon: '⚡', name: 'Receive Boot Completed',    why: 'Restarts listener after phone reboot',  required: false },
];


export default function HowToScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
        <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + insets.bottom + 20 }]}>

        <View style={styles.header}>
          <Text style={styles.title}>How it works</Text>
          <Text style={styles.subtitle}>Setup, flow & permissions</Text>
        </View>

        {/* ── Call flow ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>The flow</Text>
        <View style={styles.card}>
          {FLOW_STEPS.map((step, i) => (
            <View key={i} style={[styles.stepRow, i < FLOW_STEPS.length - 1 && styles.rowDivider]}>
              <View style={styles.stepNumWrap}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Trigger modes quick ref ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Trigger mode reference</Text>
        <View style={styles.card}>
          {[
            { mode: 'Roaming — every call',       fires: 'On ring, whether answered or not' },
            { mode: 'Roaming — missed only',       fires: 'Only when unanswered while roaming' },
            { mode: 'No coverage — missed only',   fires: 'Only missed calls, no signal' },
            { mode: 'Both (recommended)',           fires: 'Every roaming call + missed no-signal calls' },
          ].map((r, i, arr) => (
            <View key={i} style={[styles.tableRow, i < arr.length - 1 && styles.rowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableMode}>{r.mode}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableFires}>{r.fires}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Android permissions ────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Android permissions</Text>
        <View style={styles.card}>
          {ANDROID_PERMS.map((p, i) => (
            <View key={i} style={[styles.permRow, i < ANDROID_PERMS.length - 1 && styles.rowDivider]}>
              <View style={styles.permIcon}><Text style={{ fontSize: 16 }}>{p.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permName}>{p.name}</Text>
                <Text style={styles.permWhy}>{p.why}</Text>
              </View>
              <View style={[styles.permBadge, p.required ? styles.permBadgeReq : styles.permBadgeOpt]}>
                <Text style={[styles.permBadgeText, p.required ? styles.permBadgeTextReq : styles.permBadgeTextOpt]}>
                  {p.required ? 'Required' : 'Optional'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── iOS note ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>iOS note</Text>
        <View style={styles.iosCard}>
          <Text style={styles.iosHeading}>ℹ️  SMS sent via cloud on iOS</Text>
          <Text style={styles.iosBody}>
            RoamGuard uses the 2factor.in cloud API to send SMS — so no compose sheet or manual confirmation is needed on iOS. The message is sent silently in the background, just like Android.
          </Text>
        </View>

        {/* ── Built with (hidden) ─────────────────────────────────────────
        <Text style={styles.sectionLabel}>Built with</Text>
        <View style={styles.card}>
          {[
            ['Expo SDK 51',           'Cross-platform framework'],
            ['expo-cellular',         'Roaming detection'],
            ['expo-network',          'Coverage detection'],
            ['2factor.in API',        'Cloud SMS delivery'],
            ['expo-sms',              'Fallback SMS (no internet)'],
            ['expo-router',           'Navigation'],
            ['AsyncStorage',          'Local settings storage'],
            ['Expo Modules API',      'Native call listener (Kotlin)'],
          ].map(([name, desc], i, arr) => (
            <View key={i} style={[styles.techRow, i < arr.length - 1 && styles.rowDivider]}>
              <Text style={styles.techName}>{name}</Text>
              <Text style={styles.techDesc}>{desc}</Text>
            </View>
          ))}
        </View>
        ─────────────────────────────────────────────────────────────── */}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  root:    { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header:   { marginBottom: 20 },
  title:    { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.text3, marginTop: 3 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: Colors.text3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: 20 },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },

  stepRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  stepNumWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.green600, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepNum:     { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepIconWrap:{ width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle:   { fontSize: 14, fontWeight: '600', color: Colors.text },
  stepDesc:    { fontSize: 12, color: Colors.text3, marginTop: 3, lineHeight: 17 },

  tableRow:  { flexDirection: 'row', padding: 12, gap: 8 },
  tableMode: { fontSize: 13, fontWeight: '500', color: Colors.text },
  tableFires:{ fontSize: 12, color: Colors.text3, lineHeight: 17 },

  permRow:     { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  permIcon:    { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  permName:    { fontSize: 13, fontWeight: '500', color: Colors.text },
  permWhy:     { fontSize: 11, color: Colors.text3, marginTop: 2 },
  permBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  permBadgeReq:    { backgroundColor: Colors.green50 },
  permBadgeOpt:    { backgroundColor: Colors.surface2 },
  permBadgeText:    { fontSize: 10, fontWeight: '700' },
  permBadgeTextReq: { color: Colors.green800 },
  permBadgeTextOpt: { color: Colors.text3 },

  iosCard:    { backgroundColor: Colors.amber50, borderRadius: Radius.lg, padding: 16, borderWidth: 0.5, borderColor: Colors.amber600 + '66', marginBottom: 20 },
  iosHeading: { fontSize: 14, fontWeight: '700', color: Colors.amber800, marginBottom: 8 },
  iosBody:    { fontSize: 13, color: Colors.amber800, lineHeight: 19, marginBottom: 12 },
  iosList:    { gap: 10 },
  iosStep:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  iosNum:     { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.amber600, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  iosNumText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  iosStepText:{ flex: 1, fontSize: 12, color: Colors.amber800, lineHeight: 18 },
  iosLink:    { marginTop: 14 },
  iosLinkText:{ fontSize: 13, fontWeight: '700', color: Colors.amber600 },

  techRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  techName: { fontSize: 13, fontWeight: '500', color: Colors.text },
  techDesc: { fontSize: 12, color: Colors.text3 },
});
