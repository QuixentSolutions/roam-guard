import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Colors } from '../src/constants/theme';

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <Text style={{ fontSize: active ? 24 : 20, opacity: 1 }}>
      {emoji}
    </Text>
  );
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.green600,
        tabBarInactiveTintColor: Colors.text,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border2,
          backgroundColor: Colors.surface,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="howto"
        options={{
          title: 'How it works',
          tabBarIcon: ({ focused }) => <TabIcon emoji="ℹ️" active={focused} />,
        }}
      />
    </Tabs>
  );
}
