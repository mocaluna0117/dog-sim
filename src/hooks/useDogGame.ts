// ゲーム全体の状態を管理するReactフック。
// 「ロジック(gameLogic)」と「保存(storage)」と「画面」をつなぐ係。
//
// 役割:
//   - 起動時にセーブデータを読み込む
//   - 犬の状態が変わるたびに自動で保存する
//   - アプリを開き直したとき・1分ごとに「時間の経過」を反映する
//   - 画面から呼べるアクション(ごはん・おやつ・あそぶ・さんぽ)を提供する

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  applyTimePassage,
  applyWalkSteps,
  createDog,
  giveBreakfast,
  giveTreat,
  playWithDog,
} from '../gameLogic';
import { clearDog, loadDog, saveDog } from '../storage';
import { ActionResult, DogState } from '../types';

export function useDogGame() {
  const [dog, setDog] = useState<DogState | null>(null);
  const [loading, setLoading] = useState(true);
  /** 直近のアクションの結果メッセージ(ふきだしの下に表示する) */
  const [message, setMessage] = useState('');
  /** お世話が成功した回数。犬の絵に渡すと、増えるたびにぴょんと跳ねる */
  const [happyCount, setHappyCount] = useState(0);

  // 「いまこの瞬間の最新の犬の状態」への参照。
  // 散歩の歩数取得のように待ち時間のある処理のあとでアクションを実行すると、
  // 描画時点の古い状態を使ってしまい、その間の変化(おやつなど)が巻き戻る
  // バグが起きる。それを防ぐため、アクションは必ずこの ref から読む。
  const dogRef = useRef<DogState | null>(null);

  /** 状態と dogRef を同時に更新する。犬の状態の変更は必ずこれを通すこと */
  const updateDog = useCallback((next: DogState | null) => {
    dogRef.current = next;
    setDog(next);
  }, []);

  // 起動時に1回だけ: セーブデータを読み込み、留守中の時間経過を反映する
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadDog();
      if (cancelled) return;
      if (saved) updateDog(applyTimePassage(saved, new Date()));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [updateDog]);

  // 犬の状態が変わるたびに自動保存(育成ゲームの生命線)。
  // 保存は「前の保存が終わってから」順番に行う。連続で状態が変わったとき、
  // 保存の完了順が入れ替わって古いデータが残るのを防ぐため。
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!dog) return;
    saveQueue.current = saveQueue.current.then(() => saveDog(dog));
  }, [dog]);

  // アプリがフォアグラウンドに戻ったとき + 開いたまま1分ごとに、時間経過を反映
  useEffect(() => {
    const tick = () => {
      const current = dogRef.current;
      if (current) updateDog(applyTimePassage(current, new Date()));
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    const timer = setInterval(tick, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [updateDog]);

  /** 新しい犬をむかえる */
  const adopt = useCallback(
    (name: string, breedId: string) => {
      updateDog(createDog(name, breedId, new Date()));
      setMessage(`きょうから ${name} との生活がはじまるよ 🎉`);
    },
    [updateDog]
  );

  /** アクション共通処理: 最新の状態に時間経過を反映してから実行する */
  const runAction = useCallback(
    (action: (dog: DogState, now: Date) => ActionResult) => {
      const current = dogRef.current;
      if (!current) return;
      const now = new Date();
      const result = action(applyTimePassage(current, now), now);
      updateDog(result.dog);
      setMessage(result.message);
      if (result.ok) setHappyCount((count) => count + 1); // 成功したら犬がよろこぶ
    },
    [updateDog]
  );

  const breakfast = useCallback(() => runAction(giveBreakfast), [runAction]);
  const treat = useCallback(() => runAction(giveTreat), [runAction]);
  const play = useCallback(() => runAction(playWithDog), [runAction]);
  /** newSteps: まだ反映していない新しい歩数 */
  const walk = useCallback(
    (newSteps: number) => runAction((d, now) => applyWalkSteps(d, newSteps, now)),
    [runAction]
  );

  /** セーブデータを消して最初からやり直す */
  const reset = useCallback(async () => {
    // 先に画面の状態を消してから、進行中の保存が終わるのを待って削除する。
    // 順番が逆だと「削除 → 直前の自動保存が完了」で犬が復活してしまう。
    updateDog(null);
    setMessage('');
    saveQueue.current = saveQueue.current.then(() => clearDog());
    await saveQueue.current;
  }, [updateDog]);

  return { dog, loading, message, happyCount, adopt, breakfast, treat, play, walk, reset };
}

/** useDogGame が返すもの一式の型(画面に渡すときに使う) */
export type DogGame = ReturnType<typeof useDogGame>;
