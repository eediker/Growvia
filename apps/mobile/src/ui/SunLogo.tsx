import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

export function SunLogo({ size = 62 }: { size?: number }) {
  const face = size * 0.55;
  const eye = Math.max(3, size * 0.055);
  return (
    <View style={[s.wrap, { width: size, height: size }]}>
      <View style={[s.ray, { width: size * 0.12, height: size * 0.2, top: -size * 0.16 }]} />
      <View style={[s.ray, { width: size * 0.12, height: size * 0.2, bottom: -size * 0.16 }]} />
      <View style={[s.ray, { width: size * 0.2, height: size * 0.12, left: -size * 0.16 }]} />
      <View style={[s.ray, { width: size * 0.2, height: size * 0.12, right: -size * 0.16 }]} />
      <View style={[s.face, { width: face, height: face, borderRadius: face / 2 }]}> 
        <View style={s.eyes}>
          <View style={[s.eye, { width: eye, height: eye, borderRadius: eye / 2 }]} />
          <View style={[s.eye, { width: eye, height: eye, borderRadius: eye / 2 }]} />
        </View>
        <View style={[s.smile, { width: face * 0.34, height: face * 0.18, borderBottomWidth: Math.max(2, size * 0.035), borderRadius: face * 0.2 }]} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ray: { position: 'absolute', backgroundColor: colors.accent, borderRadius: 8 },
  face: { backgroundColor: '#FFC63C', alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row', gap: 12, marginTop: 2 },
  eye: { backgroundColor: '#7B3F1B' },
  smile: { borderBottomColor: '#7B3F1B', marginTop: 5 },
});

