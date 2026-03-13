import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Colors } from '../src/constants/theme';

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return <Text style={{ fontSize: 20, opacity: active ? 1 : 0.4 }}>{emoji}</Text>;
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.green600,
        tabBarInactiveTintColor: Colors.text3,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
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
