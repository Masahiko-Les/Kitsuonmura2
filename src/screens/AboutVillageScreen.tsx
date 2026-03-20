import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SUPPORT_URL } from '../lib/consent';

type MainTabParamList = {
  Home: undefined;
  AboutVillage: undefined;
  Account: undefined;
};

export function AboutVillageScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { height } = useWindowDimensions();
  const mapHeight = Math.max(320, Math.round(height * 0.55));
  const [showHotspot, setShowHotspot] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.mapContainer, { height: mapHeight }]}> 
        <Image
          source={require('../../assets/map.png')}
          style={styles.mapImage}
          resizeMode="cover"
        />

        <Pressable
          style={styles.mapTapLayer}
          onPress={() => setShowHotspot((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={showHotspot ? 'マップのタップ領域を非表示' : 'マップのタップ領域を表示'}
        />

        {showHotspot ? (
          <Pressable
            style={styles.plazaHotspot}
            onPress={() => navigation.navigate('Home')}
            accessibilityRole="button"
            accessibilityLabel="吃音村広場へ移動"
          >
            <Text style={styles.hotspotText}>広場へ</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>吃音村について</Text>
        <Text style={styles.body}>
          吃音村は、吃音にまつわる気持ちや体験を安心して共有できる場所を目指しています。
        </Text>
        <Text style={styles.body}>
          この広場では、投稿・共感・通報機能を通じて、互いを尊重しながら交流できることを大切にしています。
        </Text>
        <Text style={styles.body}>
          安全な運営のため、利用規約とコミュニティルールに沿った利用をお願いします。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.supportLabel}>サポート</Text>
        <Text style={styles.supportValue}>kitsuon.mura.app@gmail.com</Text>
        <Text style={styles.body}>
          通報は原則24時間以内に確認し、必要に応じて投稿の削除/非表示、ユーザーの利用停止（ban）等の対応を行います
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(SUPPORT_URL)}>
          <Text style={styles.secondaryButtonText}>サポートページを開く</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f1ea',
  },
  content: {
    paddingBottom: 20,
  },
  mapContainer: {
    position: 'relative',
  },
  mapTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  title: {
    color: '#23180f',
    fontSize: 24,
    fontWeight: '800',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9e2d6',
  },
  plazaHotspot: {
    position: 'absolute',
    zIndex: 2,
    left: '50%',
    top: '50%',
    width: 96,
    height: 48,
    marginLeft: -48,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(47,34,20,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotText: {
    color: '#fff7ef',
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    color: '#4b3c2e',
    fontSize: 15,
    lineHeight: 24,
  },
  supportLabel: {
    color: '#415345',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  supportValue: {
    color: '#1d251f',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ced8cf',
    borderRadius: 16,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#29402f',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
});
