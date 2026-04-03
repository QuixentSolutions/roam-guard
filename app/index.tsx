import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Switch, StyleSheet,
  TouchableOpacity, Alert, Platform, RefreshControl,
  PermissionsAndroid, Image, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../src/constants/theme';
import { loadSettings, saveSetting, AppSettings, getCallLog, CallLogEntry } from '../src/services/storage';
import { getNetworkStatus, NetworkStatus } from '../src/services/networkService';
import { useCallDetection } from '../src/hooks/useCallDetection';
import AdBanner from '../src/components/AdBanner';

const DEFAULT_NS: NetworkStatus = {
  isRoaming: false, isOutOfCoverage: false, isAirplane: false, noSim: false, shouldAutoReply: false,
  label: 'Home network', detail: 'Auto-reply is inactive here',
};

// Get screen dimensions for responsive layout
const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [settings,   setSettings]   = useState<AppSettings | null>(null);
  const [netStatus,  setNetStatus]  = useState<NetworkStatus>(DEFAULT_NS);
  const [callLog,    setCallLog]    = useState<CallLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, ns, log] = await Promise.all([
      loadSettings(), getNetworkStatus(), getCallLog(),
    ]);
    setSettings(s);
    setNetStatus(ns);
    setCallLog(log);
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    const iv = setInterval(async () => setNetStatus(await getNetworkStatus()), 30_000);
    return () => clearInterval(iv);
  }, [load]));

  // Request READ_CALL_LOG on startup so incoming number is available
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG, {
        title: 'Call Log Permission',
        message: 'RoamGuard needs call log access to read the caller\'s number and send them an auto-reply SMS.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
    }
  }, []);

  // Listen for call events and refresh call log
  const handleCallEvent = useCallback(() => {
    // Refresh call log when a call event occurs
    getCallLog().then(setCallLog);
  }, []);

  useCallDetection(handleCallEvent);

  const handleToggle = async (val: boolean) => {
    if (val && Platform.OS === 'android') {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      ]);
      const ok =
        grants['android.permission.READ_PHONE_STATE'] === 'granted' &&
        grants['android.permission.SEND_SMS']         === 'granted' &&
        grants['android.permission.READ_CALL_LOG']    === 'granted';
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

  if (!settings) return null;

  const netColor = netStatus.isRoaming
    ? { text: Colors.green800, bg: Colors.green50, dot: Colors.green600, border: Colors.green200 }
    : netStatus.isOutOfCoverage
    ? { text: Colors.amber800, bg: Colors.amber50, dot: Colors.amber600, border: Colors.amber400 + '66' }
    : { text: Colors.text2,   bg: Colors.surface2, dot: Colors.border2, border: Colors.border };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* Top Ad Banner */}
      <AdBanner position="top" />
      
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green600} />}
      >
        {/* Main Content Container */}
        <View style={styles.mainContent}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>RoamGuard</Text>
            <Text style={styles.appSub}>Auto-reply when abroad or out of coverage</Text>
          </View>
        </View>

        {/* ── Network status pill ────────────────────────────────────────── */}
        <View style={[styles.netPill, { backgroundColor: netColor.bg, borderColor: netColor.border }]}>
          <View style={[styles.netDot, { backgroundColor: netColor.dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.netLabel, { color: netColor.text }]}>{netStatus.label}</Text>
            <Text style={[styles.netDetail, { color: netColor.text }]}>{netStatus.detail}</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.6}>
            <Text style={[styles.refreshText, { color: netColor.text }]}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* ── Middle Ad Banner ───────────────────────────────────────────── */}
        <AdBanner position="middle" />

        {/* ── Main toggle card ───────────────────────────────────────────── */}
        <View style={[styles.toggleCard, settings.enabled && styles.toggleCardOn]}>
          <View style={styles.toggleEyebrowRow}>
            <View style={[styles.statusDot, { backgroundColor: settings.enabled ? Colors.green600 : Colors.border2 }]} />
            <Text style={[styles.toggleEyebrow, settings.enabled && styles.toggleEyebrowOn]}>
              {settings.enabled ? 'ENABLED' : 'DISABLED'}
            </Text>
          </View>
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
              thumbColor={settings.enabled ? Colors.green600 : '#fff'}
              ios_backgroundColor={Colors.border2}
            />
          </View>
        </View>

        {/* ── Trigger conditions ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>SMS fires when</Text>
          {[
            { active: netStatus.isRoaming,      dot: Colors.green600, amber: false, text: 'SIM is roaming on a foreign network' },
            { active: netStatus.isOutOfCoverage, dot: Colors.amber600, amber: true,  text: 'Phone has no cellular coverage' },
            { active: true,                       dot: Colors.border2,  amber: false, text: 'Call is missed (or roaming call rings)', always: true },
          ].map((c, i) => (
            <View key={i} style={[styles.condRow, i < 2 && styles.rowDivider]}>
              <View style={[styles.condDot, { backgroundColor: c.active ? c.dot : Colors.border }]} />
              <Text style={styles.condText}>{c.text}</Text>
              {c.active && !c.always && (
                <View style={[styles.nowBadge, { backgroundColor: c.amber ? Colors.amber50 : Colors.green50 }]}>
                  <Text style={[styles.nowBadgeText, { color: c.amber ? Colors.amber800 : Colors.green800 }]}>
                    Now
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Message preview ────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Auto-reply message</Text>
        <View style={styles.msgCard}>
          <Text style={styles.msgEyebrow}>CALLERS RECEIVE</Text>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {settings.message || 'No message set — go to Settings'}
            </Text>
          </View>
        </View>

        {/* ── Call Log ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Recent Calls</Text>
        <View style={styles.card}>
          {callLog.length === 0 ? (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogText}>No calls yet</Text>
            </View>
          ) : (
            callLog.slice(0, 10).map((entry, index) => {
              const statusConfig = getStatusConfig(entry.status);
              const timeAgo = getTimeAgo(entry.timestamp);

              return (
                <View key={entry.id} style={[styles.logRow, index > 0 && styles.logDivider]}>
                  <View style={styles.logLeft}>
                    <View style={[styles.logStatusDot, { backgroundColor: statusConfig.color }]} />
                    <View style={styles.logInfo}>
                      <Text style={styles.logNumber}>{formatNumber(entry.number)}</Text>
                      <Text style={styles.logMeta}>
                        {entry.state === 'ringing' ? '📳 Ringing' : '📞 Missed'} • {entry.trigger}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.logRight}>
                    <View style={[styles.logStatusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.logStatusText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>{timeAgo}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
        </View>
      </ScrollView>
      
      {/* Bottom Ad Banner */}
      <AdBanner position="bottom" />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  root:    { flex: 1 },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  // Responsive main content container
  mainContent: {
    flex: 1,
    // Ensure content takes available space with much smaller banners
    maxWidth: '100%',
    minWidth: 0,
    // Add some padding to prevent content from touching side banners
    marginHorizontal: 10,
  },
  content: { padding: 20, paddingBottom: 100 },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 20, marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  logo:    { width: 68, height: 68, borderRadius: 16, overflow: 'hidden' },
  appName: { fontSize: 21, fontWeight: '800', color: Colors.text, letterSpacing: -0.4 },
  appSub:  { fontSize: 12, color: Colors.text3, marginTop: 3, lineHeight: 17 },

  // ── Network pill
  netPill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.lg, padding: 14,
    borderWidth: 1, marginBottom: 16,
    ...Shadow.card,
  },
  netDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  netLabel:  { fontSize: 14, fontWeight: '600' },
  netDetail: { fontSize: 12, marginTop: 1, opacity: 0.8 },
  refreshBtn:  { padding: 6 },
  refreshText: { fontSize: 20, fontWeight: '500' },

  // ── Toggle card
  toggleCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  toggleCardOn: { backgroundColor: Colors.green50, borderColor: Colors.green200 },
  toggleEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  toggleEyebrow:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: Colors.text3 },
  toggleEyebrowOn: { color: Colors.green800 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center' },
  toggleTitle:  { fontSize: 17, fontWeight: '700', color: Colors.text },
  toggleTitleOn:{ color: Colors.green900 },
  toggleSub:    { fontSize: 12, color: Colors.text3, marginTop: 4, lineHeight: 18 },
  toggleSubOn:  { color: Colors.green800 },

  // ── Card
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: 24,
    ...Shadow.card,
  },
  rowDivider:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  cardHeading: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    color: Colors.text3, textTransform: 'uppercase',
    padding: 16, paddingBottom: 10,
  },
  condRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  condDot:  { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  condText: { flex: 1, fontSize: 13, color: Colors.text2 },
  nowBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  nowBadgeText: { fontSize: 11, fontWeight: '700' },

  // ── Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    color: Colors.text3, textTransform: 'uppercase',
    marginBottom: 8, paddingLeft: 4,
  },

  // ── Message preview
  msgCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  msgEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: Colors.text3, marginBottom: 10 },
  bubble:     { backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: 14 },
  bubbleText: { fontSize: 13, color: Colors.text, lineHeight: 20 },

  // ── Call Log
  emptyLog: {
    padding: 24, alignItems: 'center',
  },
  emptyLogText: { fontSize: 13, color: Colors.text3, fontStyle: 'italic' },
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  logDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  logLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12,
  },
  logStatusDot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
  logInfo: { flex: 1 },
  logNumber: { fontSize: 14, fontWeight: '600', color: Colors.text },
  logMeta: { fontSize: 11, color: Colors.text3, marginTop: 2 },
  logRight: {
    alignItems: 'flex-end', gap: 4,
  },
  logStatusBadge: {
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  logStatusText: { fontSize: 10, fontWeight: '700' },
  logTime: { fontSize: 10, color: Colors.text3 },


});

// ─── Helper Functions ───────────────────────────────────────────────────────────
function getStatusConfig(status: string) {
  switch (status) {
    case 'sent':
      return { label: '✅ Sent', color: Colors.green600, bg: Colors.green50 };
    case 'queued':
      return { label: '⏳ Queued', color: Colors.amber600, bg: Colors.amber50 };
    case 'skipped':
      return { label: '⏭ Skipped', color: Colors.blue600, bg: Colors.blue50 };
    case 'failed':
      return { label: '❌ Failed', color: Colors.red, bg: '#FFE5E5' }; // Light red bg
    default:
      return { label: 'Unknown', color: Colors.text3, bg: Colors.surface2 };
  }
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatNumber(number: string): string {
  // Format phone number for display
  if (number.length > 10) {
    return `+${number.slice(0, 2)} ${number.slice(2)}`;
  }
  return number;
}
