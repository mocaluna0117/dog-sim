// 「朝ごはん」「おやつ」などのアクションボタンの部品。

import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  emoji: string;
  label: string;
  /** ボタンの下に出す小さな補足 (例: のこり2回) */
  note?: string;
  disabled?: boolean;
  onPress: () => void;
};

export function ActionButton({ emoji, label, note, disabled, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
      {note != null && <Text style={styles.note}>{note}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e0d5',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    // うっすら影をつける
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: '#fdf8f0',
  },
  disabled: {
    opacity: 0.45,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#4a3f35',
  },
  note: {
    marginTop: 2,
    fontSize: 11,
    color: '#9a8f83',
  },
});
