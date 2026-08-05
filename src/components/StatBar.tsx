// 満腹度・なつき度を表示する横棒グラフの部品。

import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  /** 0〜100 */
  value: number;
  color: string;
};

export function StatBar({ label, value, color }: Props) {
  const percent = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>{percent}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  label: {
    width: 72,
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  track: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
  value: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    color: '#888',
    fontVariant: ['tabular-nums'],
  },
});
