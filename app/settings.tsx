import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Platform, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../src/constants/theme';
import { loadSettings, saveSetting, TriggerMode } from '../src/services/storage';
import AdBanner from '../src/components/AdBanner';

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
    desc:  'SMS sent the moment your phone rings abroad, whether you answer or not.',
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
    desc:  'SMS fires on every roaming call, and on missed calls when out of coverage.',
    tag:   'Recommended',
    tagColor: Colors.blue600,
    tagBg:    Colors.blue50,
  },
];

// ─── Message presets ──────────────────────────────────────────────────────────
const PRESETS = [
  {
    icon:         '💬',
    label:        'Short & direct',
    text:         "I am currently unavailable. Please contact me on WhatsApp. Thank you!-QUIXENT DELIVERABLES PRIVATE LIMITED",
    templateName: 'AUTOREPLY MESSAGE',
  },
  {
    icon:         '✈️',
    label:        'Mentions roaming fees',
    text:         "Hi! I'm currently abroad. To avoid roaming charges, please reach me on WhatsApp instead. Thank you!-QUIXENT DELIVERABLES PRIVATE LIMITED",
    templateName: 'Mentions roaming fees',
  },
  {
    icon:         '🌍',
    label:        'With timezone note',
    text:         "I'm travelling internationally and may be in a different timezone. Please contact me via WhatsApp and I'll reply as soon as I can!-QUIXENT DELIVERABLES PRIVATE LIMITED",
    templateName: 'With timezone note',
  },
];

export default function SettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [templateName, setTemplateName] = useState('AUTOREPLY MESSAGE');
  const [triggerMode,  setTriggerMode]  = useState<TriggerMode>('both');

  useFocusEffect(useCallback(() => {
    (async () => {
      const s = await loadSettings();
      setTemplateName(s.templateName);
      setTriggerMode(s.triggerMode);
    })();
  }, []));

  const handleMode = async (id: TriggerMode) => {
    setTriggerMode(id);
    await saveSetting('triggerMode', id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* Top Ad Banner */}
      <AdBanner position="top" />
      
        <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customise your auto-reply</Text>
          </View>
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
                activeOpacity={0.7}
              >
                {/* Radio */}
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>

                {/* Icon bubble */}
                <View style={[styles.modeIcon, selected && styles.modeIconOn]}>
                  <Text style={{ fontSize: 17 }}>{mode.icon}</Text>
                </View>

                {/* Text */}
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

        {/* ── Middle Ad Banner ───────────────────────────────────────────── */}
        <AdBanner position="middle" />

        {/* ── Presets ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Quick presets</Text>
        <View style={styles.card}>
          {PRESETS.map((p, i) => {
            const selected = templateName === p.templateName;
            return (
            <TouchableOpacity
              key={i}
              style={[styles.presetRow, i < PRESETS.length - 1 && styles.rowDivider, selected && styles.presetRowSelected]}
              onPress={async () => {
                setTemplateName(p.templateName);
                await saveSetting('message', p.text);
                await saveSetting('templateName', p.templateName);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <View style={[styles.presetIcon, selected && styles.modeIconOn]}>
                <Text style={{ fontSize: 17 }}>{p.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetLabel, selected && styles.modeTitleOn]}>{p.label}</Text>
                <Text style={styles.presetText}>{p.text}</Text>
              </View>
            </TouchableOpacity>
            );
          })}
        </View>



        {/* ── iOS note ───────────────────────────────────────────────────── */}
        {Platform.OS === 'ios' && (
          <View style={styles.iosNote}>
            <Text style={styles.iosTitle}>⚠️  iOS limitation</Text>
            <Text style={styles.iosBody}>
              Apple restricts silent background SMS. On iOS, the Messages compose sheet will appear for you to confirm sending. For fully automatic replies, set up a Siri Shortcut — see the "How it works" tab.
            </Text>
          </View>
        )}

      </ScrollView>
      
      {/* Bottom Ad Banner */}
      <AdBanner position="bottom" />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  root:    { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  logo:     { width: 68, height: 68, borderRadius: 16, overflow: 'hidden' },
  title:    { fontSize: 21, fontWeight: '800', color: Colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: Colors.text3, marginTop: 3, lineHeight: 17 },

  // ── Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    color: Colors.text3, textTransform: 'uppercase',
    marginBottom: 8, paddingLeft: 4,
  },

  // ── Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 24,
    ...Shadow.card,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },

  // ── Trigger mode rows
  modeRow:         { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  modeRowSelected: { backgroundColor: '#F6FCF0' },
  radio:    {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  radioOn:  { borderColor: Colors.green600 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green600 },
  modeIcon:    {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modeIconOn:  { backgroundColor: Colors.green50 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  modeTitle:    { fontSize: 14, fontWeight: '500', color: Colors.text2 },
  modeTitleOn:  { color: Colors.text, fontWeight: '600' },
  modeTag:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  modeTagText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  modeDesc:     { fontSize: 12, color: Colors.text3, lineHeight: 18 },

  // ── Message editor
  editor:    { padding: 16, fontSize: 14, color: Colors.text, lineHeight: 22, minHeight: 120 },
  editorBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  charCount:   { fontSize: 11, color: Colors.text3 },
  charWarn:    { color: Colors.red },
  saveBtn:     {
    backgroundColor: Colors.green600, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  savedBadge:  { fontSize: 12, fontWeight: '600', color: Colors.green600 },

  // ── Presets
  presetRow:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  presetRowSelected: { backgroundColor: Colors.green50 },
  presetIcon:  {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  presetLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  presetText:  { fontSize: 11, color: Colors.text3, marginTop: 2 },

  // ── Behaviour toggles
  switchRow:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  switchTitle: { fontSize: 14, fontWeight: '500', color: Colors.text },
  switchSub:   { fontSize: 12, color: Colors.text3, marginTop: 2 },

  // ── iOS note
  iosNote:  {
    backgroundColor: Colors.amber50, borderRadius: Radius.md,
    padding: 16, borderWidth: 1, borderColor: Colors.amber600 + '40',
  },
  iosTitle: { fontSize: 13, fontWeight: '700', color: Colors.amber800, marginBottom: 6 },
  iosBody:  { fontSize: 12, color: Colors.amber800, lineHeight: 19 },

  // ── Ad banner
  adBanner: {
    height: 52, backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    ...Shadow.card,
  },
  adLabel: { fontSize: 11, color: Colors.text3, letterSpacing: 0.6 },
});
