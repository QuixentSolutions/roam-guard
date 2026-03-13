import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Switch, StyleSheet,
  TouchableOpacity, Alert, Platform, RefreshControl,
  PermissionsAndroid, StatusBar,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../src/constants/theme';
import { loadSettings, saveSetting, getReplyLog, ReplyLogEntry, AppSettings } from '../src/services/storage';
import { getNetworkStatus, NetworkStatus } from '../src/services/networkService';
import { useCallDetection } from '../src/hooks/useCallDetection';

const DEFAULT_NS: NetworkStatus = {
  isRoaming: false, isOutOfCoverage: false, shouldAutoReply: false,
  label: 'Home network', detail: 'Auto-reply is inactive here',
};

const TRIGGER_LABELS: Record<string, { icon: string; label: string }> = {
  roaming:           { icon: '✈️', label: 'Roaming — on ring' },
  roaming_missed:    { icon: '✈️', label: 'Roaming — missed' },
  no_coverage_missed:{ icon: '📵', label: 'No coverage — missed' },
};

export default function HomeScreen() {
  const [settings,   setSettings]   = useState<AppSettings | null>(null);
  const [netStatus,  setNetStatus]  = useState<NetworkStatus>(DEFAULT_NS);
  const [log,        setLog]        = useState<ReplyLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, ns, l] = await Promise.all([
      loadSettings(), getNetworkStatus(), getReplyLog(),
    ]);
    setSettings(s);
    setNetStatus(ns);
    setLog(l);
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const iv = setInterval(async () => setNetStatus(await getNetworkStatus()), 30_000);
    return () => clearInterval(iv);
  }, [load]));

  // Native call detection hook
  useCallDetection(async (event) => {
    const fresh = await getReplyLog();
    setLog(fresh);
  });

  const handleToggle = async (val: boolean) => {
    if (val && Platform.OS === 'android') {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
      ]);
      const ok =
        grants['android.permission.READ_PHONE_STATE'] === 'granted' &&
        grants['android.permission.SEND_SMS']         === 'granted';
      if (!ok) {
        Alert.alert(
          'Permissions needed',
          'RoamGuard needs Phone State and Send SMS permissions to work.\n\nPlease grant them in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    await saveSetting('enabled', val);
    setSettings(s => s ? { ...s, enabled: val } : s);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todayCount = log.filter(
    e => new Date(e.timestamp).toDateString() === new Date().toDateString()
  ).length;

  if (!settings) return null;

  const netColor = netStatus.isRoaming
    ? { text: Colors.green800, bg: Colors.green50, dot: Colors.green600 }
    : netStatus.isOutOfCoverage
    ? { text: Colors.amber800, bg: Colors.amber50, dot: Colors.amber600 }
    : { text: Colors.text2, bg: Colors.surface2, dot: Colors.border2 };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green600} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>RoamGuard</Text>
          <Text style={styles.appSub}>Auto-reply when abroad or out of coverage</Text>
        </View>

        {/* Network status pill */}
        <View style={[styles.netPill, { backgroundColor: netColor.bg }]}>
          <View style={[styles.netDot, { backgroundColor: netColor.dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.netLabel, { color: netColor.text }]}>{netStatus.label}</Text>
            <Text style={[styles.netDetail, { color: netColor.text }]}>{netStatus.detail}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Text style={[styles.refreshText, { color: netColor.text }]}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Main toggle card */}
        <View style={[styles.toggleCard, settings.enabled && styles.toggleCardOn]}>
          <Text style={[styles.toggleEyebrow, settings.enabled && styles.toggleEyebrowOn]}>
            {settings.enabled ? 'ENABLED' : 'DISABLED'}
          </Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleTitle, settings.enabled && styles.toggleTitleOn]}>
                Auto-SMS Reply
              </Text>
              <Text style={[styles.toggleSub, settings.enabled && styles.toggleSubOn]}>
                {settings.enabled
                  ? netStatus.shouldAutoReply
                    ? '🟢 Armed — triggers active right now'
                    : '⏳ Ready — waiting for roaming or no signal'
                  : 'Turn on before you leave home'}
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggle}
              trackColor={{ false: Colors.border2, true: Colors.green200 }}
              thumbColor={settings.enabled ? Colors.green600 : '#f4f4f4'}
              ios_backgroundColor={Colors.border2}
            />
          </View>
        </View>

        {/* Trigger conditions */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>SMS fires when</Text>
          {[
            { active: netStatus.isRoaming,       dot: Colors.green600, amber: false, text: 'SIM is roaming on a foreign network' },
            { active: netStatus.isOutOfCoverage,  dot: Colors.amber600, amber: true,  text: 'Phone has no cellular coverage' },
            { active: true,                        dot: Colors.border2,  amber: false, text: 'Call is missed (or roaming call rings)', always: true },
          ].map((c, i) => (
            <View key={i} style={[styles.condRow, i < 2 && styles.condBorder]}>
              <View style={[styles.condDot, { backgroundColor: c.active ? c.dot : Colors.border }]} />
              <Text style={styles.condText}>{c.text}</Text>
              {c.active && !c.always && (
                <View style={[styles.activeBadge, { backgroundColor: c.amber ? Colors.amber50 : Colors.green50 }]}>
                  <Text style={[styles.activeBadgeText, { color: c.amber ? Colors.amber800 : Colors.green800 }]}>
                    Now
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, Shadow.card]}>
            <Text style={styles.statNum}>{todayCount}</Text>
            <Text style={styles.statLabel}>Replies today</Text>
          </View>
          <View style={[styles.statCard, Shadow.card]}>
            <Text style={styles.statNum}>{log.length}</Text>
            <Text style={styles.statLabel}>Total replies</Text>
          </View>
        </View>

        {/* Message preview */}
        <Text style={styles.sectionLabel}>Auto-reply message</Text>
        <View style={[styles.msgCard, Shadow.card]}>
          <Text style={styles.msgEyebrow}>CALLERS RECEIVE</Text>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {settings.message || 'No message set — go to Settings'}
            </Text>
          </View>
        </View>

        {/* Activity log */}
        <Text style={styles.sectionLabel}>Recent activity</Text>
        <View style={[styles.card, Shadow.card]}>
          {log.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No replies sent yet</Text>
              <Text style={styles.emptySub}>Enable above and travel — replies appear here</Text>
            </View>
          ) : (
            log.slice(0, 15).map((entry, i) => {
              const t = TRIGGER_LABELS[entry.trigger] ?? { icon: '✉️', label: entry.trigger };
              return (
                <View key={entry.id} style={[styles.logRow, i < Math.min(log.length, 15) - 1 && styles.logBorder]}>
                  <View style={styles.logIcon}><Text style={{ fontSize: 16 }}>{t.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logNum}>{entry.number}</Text>
                    <Text style={styles.logMeta}>
                      {new Date(entry.timestamp).toLocaleString()} · {t.label}
                    </Text>
                  </View>
                  <View style={styles.sentBadge}><Text style={styles.sentBadgeText}>Sent</Text></View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  appSub:  { fontSize: 13, color: Colors.text3, marginTop: 3 },

  netPill: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, padding: 14, marginBottom: 16 },
  netDot:  { width: 9, height: 9, borderRadius: 5 },
  netLabel:  { fontSize: 13, fontWeight: '600' },
  netDetail: { fontSize: 11, marginTop: 1, opacity: 0.75 },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 18, fontWeight: '600' },

  toggleCard: {
    backgroundColor: Colors.surface2, borderRadius: Radius.xl,
    padding: 20, marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
  },
  toggleCardOn: { backgroundColor: Colors.green50, borderColor: Colors.green200 },
  toggleEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: Colors.text3, marginBottom: 10 },
  toggleEyebrowOn: { color: Colors.green800 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 19, fontWeight: '700', color: Colors.text },
  toggleTitleOn: { color: Colors.green900 },
  toggleSub: { fontSize: 12, color: Colors.text3, marginTop: 4, lineHeight: 17 },
  toggleSubOn: { color: Colors.green800 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: 16 },
  cardHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: Colors.text3, textTransform: 'uppercase', padding: 14, paddingBottom: 8 },
  condRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  condBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  condDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  condText: { flex: 1, fontSize: 13, color: Colors.text2 },
  activeBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  activeBadgeText: { fontSize: 10, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, borderWidth: 0.5, borderColor: Colors.border },
  statNum:  { fontSize: 28, fontWeight: '700', color: Colors.text },
  statLabel:{ fontSize: 11, color: Colors.text3, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: Colors.text3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 },

  msgCard:    { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: Colors.border },
  msgEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: Colors.text3, marginBottom: 8 },
  bubble:     { backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 12 },
  bubbleText: { fontSize: 13, color: Colors.text, lineHeight: 19 },

  empty:      { padding: 30, alignItems: 'center' },
  emptyIcon:  { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  emptySub:   { fontSize: 12, color: Colors.text3, marginTop: 4, textAlign: 'center', lineHeight: 17 },

  logRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  logBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  logIcon:   { width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  logNum:    { fontSize: 13, fontWeight: '600', color: Colors.text },
  logMeta:   { fontSize: 11, color: Colors.text3, marginTop: 2 },
  sentBadge: { backgroundColor: Colors.green50, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sentBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.green800 },
});
