// メイン画面。犬のようすを見たり、お世話をしたりする。

import { useRef } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { DogFigure } from '../components/dog/DogFigure';
import { StatBar } from '../components/StatBar';
import { getBreed } from '../breeds';
import {
  BODY_LABEL,
  STAGE_LABEL,
  getAgeDays,
  getBodyCondition,
  getMood,
  getPlaysLeft,
  getStage,
  getTreatsLeft,
  getWalkedStepsToday,
  getWeightKg,
  hasEatenBreakfastToday,
} from '../gameLogic';
import { DogGame } from '../hooks/useDogGame';
import { usePedometer } from '../hooks/usePedometer';

type Props = {
  game: DogGame;
};

export function HomeScreen({ game }: Props) {
  const pedometer = usePedometer();
  // Androidの「アプリを開いてからの歩数」のうち、すでに散歩に反映した分。
  // 画面が再描画されても値が消えないよう useRef で覚えておく。
  const sessionApplied = useRef(0);
  // さんぽ処理の実行中フラグ(ボタン連打による二重反映を防ぐ)
  const walking = useRef(false);

  const dog = game.dog;
  if (!dog) return null; // dogがいる時だけApp側でこの画面を出すので、実際には起きない

  // 描画のたびに現在時刻で計算し直す(状態は1分ごとに更新される)
  const now = new Date();
  const breed = getBreed(dog.breedId);
  const ageDays = getAgeDays(dog, now);
  const stage = getStage(dog, now);
  const weight = getWeightKg(dog, now);
  const condition = getBodyCondition(dog);
  const mood = getMood(dog);
  const treatsLeft = getTreatsLeft(dog, now);
  const playsLeft = getPlaysLeft(dog, now);
  const walkedToday = getWalkedStepsToday(dog, now);
  const breakfastDone = hasEatenBreakfastToday(dog, now);

  // 見た目: 子犬は小さく表示する(太り具合はDogFigureの中で反映される)
  const dogSize = stage === 'puppy' ? 132 : 184;

  /** 歩数を散歩に反映する */
  const onWalk = async () => {
    if (walking.current) return; // 処理中の連打は無視
    walking.current = true;
    try {
      if (pedometer.isLiveOnly) {
        // Android: 「アプリを開いてからの歩数」のうち、まだ反映していない分
        const newSteps = pedometer.steps - sessionApplied.current;
        if (newSteps > 0) sessionApplied.current = pedometer.steps;
        game.walk(newSteps);
      } else {
        // iOS: 押した瞬間の最新の「今日の合計歩数」を取り直してから、
        // すでに反映した分を引く(日付をまたいだ古い歩数を反映しないため)
        const total = await pedometer.refresh();
        if (total == null) {
          // 取得に失敗したら中断。古い歩数で計算すると昨日の歩数を
          // 今日の散歩として二重に反映してしまうことがある
          Alert.alert('歩数を取得できなかったよ', '少し待ってから もういちど押してね');
          return;
        }
        game.walk(total - getWalkedStepsToday(dog, new Date()));
      }
    } finally {
      walking.current = false;
    }
  };

  const confirmReset = () => {
    Alert.alert('はじめからやりなおす', `${dog.name} とはお別れして、あたらしい子をむかえますか?`, [
      { text: 'やめる', style: 'cancel' },
      { text: 'お別れする', style: 'destructive', onPress: () => void game.reset() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ヘッダー: 名前・経過日数・成長段階 */}
      <View style={styles.header}>
        <Text style={styles.name}>{dog.name}</Text>
        <Text style={styles.days}>
          うちに来て {ageDays}日目 ・ {STAGE_LABEL[stage]}
        </Text>
      </View>

      {/* 犬のようす */}
      <View style={styles.dogArea}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            {mood.emoji} {mood.comment}
          </Text>
        </View>
        <DogFigure
          breed={breed}
          size={dogSize}
          bodyRatio={dog.bodyRatio}
          mood={mood.level}
          reactionKey={game.happyCount}
        />
        <Text style={styles.weight}>
          {weight.toFixed(1)}kg ({BODY_LABEL[condition]})
        </Text>
      </View>

      {/* ステータス */}
      <View style={styles.card}>
        <StatBar label="まんぷく" value={dog.hunger} color="#F5A623" />
        <StatBar label="なつき" value={dog.affection} color="#F06292" />
      </View>

      {/* 直近のアクションの結果 */}
      {game.message !== '' && <Text style={styles.message}>{game.message}</Text>}

      {/* お世話ボタン */}
      <View style={styles.actions}>
        <ActionButton
          emoji="🍚"
          label="朝ごはん"
          note={breakfastDone ? 'きょうは たべた!' : '1日1回・あさだけ'}
          disabled={breakfastDone}
          onPress={game.breakfast}
        />
        <ActionButton
          emoji="🦴"
          label="おやつ"
          note={`きょう のこり${Math.max(0, treatsLeft)}回`}
          disabled={treatsLeft <= 0}
          onPress={game.treat}
        />
        <ActionButton
          emoji="🎾"
          label="あそぶ"
          note={`きょう のこり${Math.max(0, playsLeft)}回`}
          disabled={playsLeft <= 0}
          onPress={game.play}
        />
        <ActionButton
          emoji="🐾"
          label="さんぽにはんえい"
          note="歩いたぶんだけ運動になる"
          disabled={pedometer.status !== 'ready'}
          onPress={onWalk}
        />
      </View>

      {/* 歩数のようす */}
      <View style={styles.card}>
        {pedometer.status === 'checking' && <Text style={styles.stepsText}>歩数計をかくにん中…</Text>}
        {pedometer.status === 'unavailable' && (
          <Text style={styles.stepsText}>
            この端末では歩数計がつかえないみたい(シミュレーターでは動かないよ。実機でためしてね)
          </Text>
        )}
        {pedometer.status === 'denied' && (
          <Text style={styles.stepsText}>
            {Platform.OS === 'ios'
              ? '歩数へのアクセスが許可されていないよ。設定アプリから「モーションとフィットネス」を許可してね'
              : '歩数へのアクセスが許可されていないよ。設定アプリの「権限」から「身体活動」を許可してね'}
          </Text>
        )}
        {pedometer.status === 'ready' && (
          <>
            <Text style={styles.stepsText}>
              {pedometer.isLiveOnly
                ? `👟 アプリを開いてから ${pedometer.steps}歩`
                : `👟 きょうの歩数: ${pedometer.steps}歩`}
            </Text>
            <Text style={styles.stepsSub}>さんぽに反映ずみ: {walkedToday}歩</Text>
            {!pedometer.isLiveOnly && (
              <Pressable onPress={() => void pedometer.refresh()}>
                <Text style={styles.refreshText}>↻ 歩数を更新する</Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      {/* リセット */}
      <Pressable onPress={confirmReset} style={styles.resetButton}>
        <Text style={styles.resetText}>はじめからやりなおす</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4a3f35',
  },
  days: {
    fontSize: 13,
    color: '#9a8f83',
    marginTop: 4,
  },
  dogArea: {
    alignItems: 'center',
    marginVertical: 12,
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e0d5',
  },
  bubbleText: {
    fontSize: 13,
    color: '#4a3f35',
  },
  weight: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#7a6f63',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e0d5',
    padding: 14,
    marginTop: 12,
  },
  message: {
    textAlign: 'center',
    fontSize: 13,
    color: '#7a6f63',
    marginTop: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepsText: {
    fontSize: 14,
    color: '#4a3f35',
    fontWeight: '600',
  },
  stepsSub: {
    fontSize: 12,
    color: '#9a8f83',
    marginTop: 4,
  },
  refreshText: {
    fontSize: 13,
    color: '#4a90d9',
    marginTop: 8,
    fontWeight: '600',
  },
  resetButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  resetText: {
    fontSize: 12,
    color: '#c0392b',
    textDecorationLine: 'underline',
  },
});
