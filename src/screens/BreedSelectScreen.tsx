// 最初に表示される「犬種をえらんで名前をつける」画面。

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BREEDS } from '../breeds';
import { DogFigure } from '../components/dog/DogFigure';

type Props = {
  /** 「この子をむかえる」が押されたときに呼ばれる */
  onAdopt: (name: string, breedId: string) => void;
};

export function BreedSelectScreen({ onAdopt }: Props) {
  const [name, setName] = useState('');
  const [breedId, setBreedId] = useState<string | null>(null);
  const canStart = name.trim().length > 0 && breedId != null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>🐾 どの子をむかえる?</Text>
        <Text style={styles.subtitle}>犬種をえらんで、名前をつけてあげよう</Text>

        {/* 犬種カードの一覧 (2列のグリッド) */}
        <View style={styles.grid}>
          {BREEDS.map((breed) => {
            const selected = breed.id === breedId;
            return (
              <Pressable
                key={breed.id}
                onPress={() => setBreedId(breed.id)}
                style={[
                  styles.card,
                  {
                    borderColor: selected ? breed.color : '#e8e0d5',
                    // 色コードの後ろに '22' を足すと薄い半透明色になる
                    backgroundColor: selected ? breed.color + '22' : '#fff',
                  },
                ]}
              >
                {/* 一覧は数が多いので、動きなし(animated={false})で軽くする */}
                <DogFigure breed={breed} size={64} animated={false} />
                <Text style={styles.cardName}>{breed.name}</Text>
                <Text style={styles.cardDesc}>{breed.description}</Text>
                <Text style={styles.cardWeight}>おとなで 約{breed.adultWeightKg}kg</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.nameLabel}>なまえ</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例: ポチ"
          placeholderTextColor="#bbb"
          maxLength={10}
        />

        <Pressable
          style={[styles.startButton, !canStart && styles.startButtonDisabled]}
          disabled={!canStart}
          onPress={() => {
            if (breedId) onAdopt(name.trim(), breedId);
          }}
        >
          <Text style={styles.startButtonText}>この子をむかえる 🏡</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4a3f35',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#9a8f83',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a3f35',
    marginTop: 6,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 11,
    color: '#9a8f83',
    marginTop: 4,
    textAlign: 'center',
    minHeight: 30,
  },
  cardWeight: {
    fontSize: 11,
    color: '#b0a698',
    marginTop: 4,
  },
  nameLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a3f35',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e0d5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#4a3f35',
  },
  startButton: {
    backgroundColor: '#F5A623',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
