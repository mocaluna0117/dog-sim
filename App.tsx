// アプリの入り口。
// 「犬がいなければ犬種選択画面、いればホーム画面」を出し分けるだけの係。

import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useDogGame } from './src/hooks/useDogGame';
import { BreedSelectScreen } from './src/screens/BreedSelectScreen';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const game = useDogGame();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      {game.loading ? (
        // セーブデータの読み込み中
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      ) : game.dog ? (
        <HomeScreen game={game} />
      ) : (
        <BreedSelectScreen onAdopt={game.adopt} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#faf6ef', // あたたかみのあるベージュ
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
