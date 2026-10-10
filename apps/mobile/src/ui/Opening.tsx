import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { assets } from './assets';
export function Opening({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    const timer = setTimeout(() => setReady(true), 950);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [opacity]);
  return ready ? children : <View style={{ flex: 1, backgroundColor: '#FBF8F2' }}><Animated.Image source={assets.splash} resizeMode="contain" style={{ width: '100%', height: '100%', opacity }} /></View>;
}
