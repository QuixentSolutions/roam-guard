import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch, Platform,
  NativeModules, StatusBar, Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../src/constants/theme';
import { loadSettings, saveSetting, TriggerMode } from '../src/services/storage';

// ─── Trigger mode options ─────────────────────────────────────────────────────
const TRIGGER_MODES: {
  id: TriggerMode;
  icon: string;
  title: string;
  desc: string;
  tag?: string;
  tagColor?: string;
  tagBg?: string;
}[] = [
  {
    id:    'roaming_ring',
    icon:  '✈️',
    title: 'Roaming — every call',
    desc:  'SMS sent the moment your phone rings abroad, whether you answer or not. Caller is notified immediately.',
    tag:   'Most useful abroad',
    tagColor: Colors.green800,
    tagBg:    Colors.green50,
  },
  {
    id:    'roaming_missed',
    icon:  '📵',
    title: 'Roaming — missed calls only',
    desc:  'SMS sent only when you miss a call while on a foreign network.',
  },
  {
    id:    'no_coverage_missed',
    icon:  '🚫',
    title: 'No coverage — missed calls only',
    desc:  'SMS sent when you miss a call because you have no signal.',
  },
  {
    id:    'both',
    icon:  '🌍',
    title: 'Both — roaming + no coverage',
    desc:  'SMS fires on every roaming call, and on missed calls when out of coverage. Best overall protection.',
    tag:   'Recommended',
    tagColor: Colors.blue600,
    tagBg:    Colors.blue50,
  },
];

// ─── Message presets ──────────────────────────────────────────────────────────
const PRESETS = [
  {
    icon:  '💬',
    label: 'Short & direct',
    text:  "I'm abroad — please WhatsApp me instead of calling. Thanks!",
  },
  {
    icon:  '✈️',
    label: 'Mentions roaming fees',
    text:  "Hi! I'm currently abroad. To avoid roaming charges, please reach me on WhatsApp instead. Thank you!",
  },
  {
    icon:  '🌍',
    label: 'With timezone note',
    text:  "I'm travelling internationally and may be in a different timezone. Please contact me via WhatsApp and I'll reply as soon as I can!",
  },
];

export default function SettingsScreen() {
  const [draft,           setDraft]           = useState('');
  const [saved,           setSaved]           = useState('');
  const [triggerMode,     setTriggerMode]     = useState<TriggerMode>('both');
  const [skipContacts,    setSkipContacts]    = useState(false);
  const [logReplies,      setLogReplies]      = useState(true);
  const [twoFactorApiKey, setTwoFactorApiKey] = useState('');
  const [apiKeySaved,     setApiKeySaved]     = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const s = await loadSettings();
      setDraft(s.message);
      setSaved(s.message);
      setTriggerMode(s.triggerMode);
      setSkipContacts(s.skipContacts);
      setLogReplies(s.logReplies);
      setTwoFactorApiKey(s.twoFactorApiKey ?? '');
      setApiKeySaved(true);
    })();
  }, []));

  const handleSave = async () => {
    if (!draft.trim()) {
      Alert.alert('Empty message', 'Please write a message before saving.');
      return;
    }
    await saveSetting('message', draft.trim());
    // Sync to native module if available
    NativeModules.RoamGuardModule?.saveMessage?.(draft.trim());
    setSaved(draft.trim());
    Alert.alert('Saved ✓', 'Your auto-reply message has been updated.');
  };

  const handleMode = async (id: TriggerMode) => {
    setTriggerMode(id);
    await saveSetting('triggerMode', id);
    NativeModules.RoamGuardModule?.setTriggerMode?.(id);
  };

  const handleSkip = async (val: boolean) => {
    setSkipContacts(val);
    await saveSetting('skipContacts', val);
  };

  const handleLog = async (val: boolean) => {
    setLogReplies(val);
    await saveSetting('logReplies', val);
  };

  const handleSaveApiKey = async () => {
    await saveSetting('twoFactorApiKey', twoFactorApiKey.trim());
    setApiKeySaved(true);
    Alert.alert('Saved ✓', twoFactorApiKey.trim() ? 'SMS will be sent via 2factor.in.' : 'API key cleared. Using device SMS.');
  };

  const charCount = draft.length;
  const isDirty   = draft.trim() !== saved.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customise your auto-reply</Text>
        </View>

        {/* ── Google Ad Banner (top) ──────────────────────────────────────── */}
        <View style={styles.adBanner}>
          <Text style={styles.adLabel}>Advertisement</Text>
        </View>

        {/* ── Trigger mode selector ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>When to send auto-reply SMS</Text>
        <View style={styles.card}>
          {TRIGGER_MODES.map((mode, i) => {
            const selected = triggerMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeRow,
                  i < TRIGGER_MODES.length - 1 && styles.rowDivider,
                  selected && styles.modeRowSelected,
                ]}
                onPress={() => handleMode(mode.id)}
                activeOpacity={0.65}
              >
                {/* Radio */}
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>

                {/* Icon */}
                <View style={[styles.modeIcon, selected && styles.modeIconOn]}>
                  <Text style={{ fontSize: 18 }}>{mode.icon}</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={styles.modeTitleRow}>
                    <Text style={[styles.modeTitle, selected && styles.modeTitleOn]}>
                      {mode.title}
                    </Text>
                    {mode.tag && (
                      <View style={[styles.modeTag, { backgroundColor: mode.tagBg }]}>
                        <Text style={[styles.modeTagText, { color: mode.tagColor }]}>
                          {mode.tag}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeDesc}>{mode.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Message editor ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Your message</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.editor}
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Type your auto-reply message here..."
            placeholderTextColor={Colors.text3}
            textAlignVertical="top"
            maxLength={320}
          />
          <View style={styles.editorBar}>
            <Text style={[styles.charCount, charCount > 280 && styles.charWarn]}>
              {charCount}/320{charCount > 160 ? ' · 2 SMS parts' : ' · 1 SMS'}
            </Text>
            {isDirty && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!isDirty && <Text style={styles.savedNote}>✓ Message saved</Text>}

        {/* ── Presets ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Quick presets</Text>
        <View style={styles.card}>
          {PRESETS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.presetRow, i < PRESETS.length - 1 && styles.rowDivider]}
              onPress={() => setDraft(p.text)}
              activeOpacity={0.65}
            >
              <View style={styles.presetIcon}><Text style={{ fontSize: 17 }}>{p.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.presetLabel}>{p.label}</Text>
                <Text style={styles.presetText} numberOfLines={1}>{p.text}</Text>
              </View>
              <Text style={styles.useBtn}>Use</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Behaviour toggles ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Behaviour</Text>
        <View style={styles.card}>
          <View style={[styles.switchRow, styles.rowDivider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Skip saved contacts</Text>
              <Text style={styles.switchSub}>Only auto-reply to unknown numbers</Text>
            </View>
            <Switch
              value={skipContacts}
              onValueChange={handleSkip}
              trackColor={{ false: Colors.border2, true: Colors.green200 }}
              thumbColor={skipContacts ? Colors.green600 : '#f4f4f4'}
              ios_backgroundColor={Colors.border2}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Keep reply history</Text>
              <Text style={styles.switchSub}>Log all auto-replies sent</Text>
            </View>
            <Switch
              value={logReplies}
              onValueChange={handleLog}
              trackColor={{ false: Colors.border2, true: Colors.green200 }}
              thumbColor={logReplies ? Colors.green600 : '#f4f4f4'}
              ios_backgroundColor={Colors.border2}
            />
          </View>
        </View>

        {/* ── 2factor.in API Key ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>SMS Provider</Text>
        <View style={styles.card}>
          <View style={styles.apiKeyRow}>
            <View style={styles.apiKeyIconWrap}>
              <Text style={{ fontSize: 18 }}>📡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.apiKeyTitle}>2factor.in API Key</Text>
              <Text style={styles.apiKeySub}>Leave empty to use device SMS</Text>
            </View>
          </View>
          <View style={styles.apiKeyInputRow}>
            <TextInput
              style={styles.apiKeyInput}
              value={twoFactorApiKey}
              onChangeText={(v) => { setTwoFactorApiKey(v); setApiKeySaved(false); }}
              placeholder="Paste your API key here"
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            {!apiKeySaved && (
              <TouchableOpacity style={styles.apiKeySaveBtn} onPress={handleSaveApiKey}>
                <Text style={styles.apiKeySaveBtnText}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
          {apiKeySaved && twoFactorApiKey.trim() !== '' && (
            <Text style={styles.apiKeyActive}>✓ Active — SMS via 2factor.in</Text>
          )}
        </View>

        {/* ── Google Ad Banner (bottom) ─────────────────────────────────── */}
        <View style={styles.adBanner}>
          <Text style={styles.adLabel}>Advertisement</Text>
        </View>

        {/* iOS note */}
        {Platform.OS === 'ios' && (
          <View style={styles.iosNote}>
            <Text style={styles.iosTitle}>⚠️  iOS limitation</Text>
            <Text style={styles.iosBody}>
              Apple restricts silent background SMS. On iOS, the Messages compose sheet will appear for you to confirm sending. For fully automatic replies, set up a Siri Shortcut — see the "How it works" tab.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  root:    { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  header:   { marginBottom: 20 },
  title:    { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.text3, marginTop: 3 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    color: Colors.text3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: 20,
  },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },

  // Mode selector
  modeRow:         { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  modeRowSelected: { backgroundColor: '#FAFFF7' },
  radio:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  radioOn:  { borderColor: Colors.green600 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green600 },
  modeIcon:   { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modeIconOn: { backgroundColor: Colors.green50 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  modeTitle:   { fontSize: 14, fontWeight: '500', color: Colors.text2 },
  modeTitleOn: { color: Colors.text, fontWeight: '600' },
  modeTag:     { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  modeTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  modeDesc:    { fontSize: 12, color: Colors.text3, lineHeight: 17 },

  // Message editor
  editor:   { padding: 14, fontSize: 14, color: Colors.text, lineHeight: 22, minHeight: 110 },
  editorBar:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: Colors.border, paddingHorizontal: 14, paddingVertical: 8 },
  charCount:{ fontSize: 11, color: Colors.text3 },
  charWarn: { color: Colors.red },
  saveBtn:  { backgroundColor: Colors.green600, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  savedNote:   { fontSize: 12, color: Colors.green600, marginTop: -14, marginBottom: 20, paddingLeft: 2 },

  // Presets
  presetRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  presetIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  presetLabel:{ fontSize: 14, fontWeight: '500', color: Colors.text },
  presetText: { fontSize: 11, color: Colors.text3, marginTop: 2 },
  useBtn:     { fontSize: 13, fontWeight: '700', color: Colors.green600 },

  // Behaviour toggles
  switchRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  switchTitle: { fontSize: 14, fontWeight: '500', color: Colors.text },
  switchSub:   { fontSize: 11, color: Colors.text3, marginTop: 2 },

  // iOS note
  iosNote: { backgroundColor: Colors.amber50, borderRadius: Radius.md, padding: 14, borderWidth: 0.5, borderColor: Colors.amber600 + '55' },
  iosTitle:{ fontSize: 13, fontWeight: '700', color: Colors.amber800, marginBottom: 6 },
  iosBody: { fontSize: 12, color: Colors.amber800, lineHeight: 18 },

  // Logo
  logo: { width: 64, height: 64, marginBottom: 8 },

  // 2factor.in API key
  apiKeyRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  apiKeyIconWrap:  { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  apiKeyTitle:     { fontSize: 14, fontWeight: '500', color: Colors.text },
  apiKeySub:       { fontSize: 11, color: Colors.text3, marginTop: 2 },
  apiKeyInputRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  apiKeyInput:     { flex: 1, fontSize: 13, color: Colors.text, borderWidth: 0.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Colors.bg },
  apiKeySaveBtn:   { backgroundColor: Colors.green600, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  apiKeySaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  apiKeyActive:    { fontSize: 11, color: Colors.green600, paddingHorizontal: 14, paddingBottom: 10 },

  // Google Ad banners
  adBanner: { height: 50, backgroundColor: Colors.surface2, borderRadius: Radius.sm, borderWidth: 0.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  adLabel:  { fontSize: 11, color: Colors.text3, letterSpacing: 0.5 },
});
