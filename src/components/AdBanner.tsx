import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Platform } from 'react-native';

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Calculate responsive ad sizes - using banner size for all positions
  const getResponsiveAdSize = (position: 'top' | 'bottom' | 'left' | 'right' | 'middle') => {
    return 'banner'; // 320x50 - Google AdMob standard banner size
  };

// Only import AdMobBanner for native platforms
let AdMobBanner: any = null;
if (Platform.OS !== 'web') {
  try {
    AdMobBanner = require('expo-ads-admob').AdMobBanner;
  } catch (e) {
    console.warn('[AdBanner] AdMobBanner not available');
  }
}

interface AdBannerProps {
  position: 'top' | 'bottom' | 'left' | 'right' | 'middle';
  adUnitId?: string;
}

const { width, height } = Dimensions.get('window');

export default function AdBanner({ position, adUnitId = 'ca-app-pub-3940256099942544/6300978111' }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Ad size based on position with responsive sizes
  const getAdSize = () => {
    return getResponsiveAdSize(position);
  };

  // Style based on position
  const getAdStyle = () => {
    switch (position) {
      case 'top':
        return [styles.ad, styles.topAd];
      case 'bottom':
        return [styles.ad, styles.bottomAd];
      case 'left':
        return [styles.ad, styles.leftAd];
      case 'right':
        return [styles.ad, styles.rightAd];
      case 'middle':
        return [styles.ad, styles.middleAd];
      default:
        return [styles.ad];
    }
  };

  const handleAdLoaded = () => {
    console.log(`Ad loaded for ${position} position`);
    setIsVisible(true);
  };

  const handleAdFailedToLoad = (error: any) => {
    console.log(`Ad failed to load for ${position}:`, error);
    setIsVisible(false);
  };

  const handleAdPress = () => {
    console.log(`Ad clicked for ${position} position`);
  };

  // Show ads in production mode (remove development restrictions)
  if (Platform.OS === 'web') {
    return (
      <View style={[getAdStyle(), styles.testAd]}>
        <View style={styles.testAdContent}>
          <View style={styles.testAdDot} />
          <View style={styles.testAdTextContainer}>
            <Text style={styles.testAdText}>AdMob Banner</Text>
            <Text style={styles.testAdSubText}>{position}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!isVisible || !AdMobBanner) {
    return null;
  }

  return (
    <View style={getAdStyle()}>
      <AdMobBanner
        adUnitID={adUnitId}
        bannerSize={getAdSize() as any}
        onDidFailToReceiveAdWithError={handleAdFailedToLoad}
        servePersonalizedAds={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ad: {
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  topAd: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50, // Standard banner height for top banner
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomAd: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50, // Standard banner height for bottom banner
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAd: {
    position: 'absolute',
    top: 40, // Moved down 40px from top
    left: 0,
    width: 80, // Small square width for side banners
    height: 80, // Small square height for side banners
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightAd: {
    position: 'absolute',
    top: 40, // Moved down 40px from top
    right: 0,
    width: 80, // Small square width for side banners
    height: 80, // Small square height for side banners
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleAd: {
    alignSelf: 'center',
    width: '100%',
    height: 50, // Standard banner height for middle banner
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  // Test ad styles (for development)
  testAd: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testAdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  testAdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  testAdTextContainer: {
    alignItems: 'flex-start',
  },
  testAdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  testAdSubText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});