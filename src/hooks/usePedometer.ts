// 端末の歩数計とつなぐReactフック。
//
// iOSとAndroidで取れるデータが違う点に注意:
//   - iOS     : 「今日0時からの合計歩数」を過去にさかのぼって取得できる
//   - Android : 過去の歩数は取れないので「アプリを開いてからの歩数」を数える
// この違いは isLiveOnly フラグで画面に伝える。

import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type PedometerStatus =
  | 'checking' // 確認中
  | 'unavailable' // この端末では使えない(シミュレーターなど)
  | 'denied' // ユーザーが許可しなかった
  | 'ready'; // 使える

export function usePedometer() {
  const [status, setStatus] = useState<PedometerStatus>('checking');
  const [steps, setSteps] = useState(0);
  /** true なら steps は「アプリを開いてからの歩数」(Android) */
  const isLiveOnly = Platform.OS !== 'ios';

  /**
   * iOSのみ: 今日の合計歩数を取り直す。
   * 取れた歩数を返す(散歩に反映する直前に最新値がほしいときに使う)。
   */
  const refresh = useCallback(async (): Promise<number | null> => {
    if (Platform.OS !== 'ios') return null;
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const result = await Pedometer.getStepCountAsync(startOfToday, now);
      setSteps(result.steps);
      return result.steps;
    } catch (e) {
      console.warn('歩数の取得に失敗しました', e);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: Pedometer.Subscription | undefined;

    (async () => {
      // 1. そもそも歩数計が使える端末か?
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      if (!available) {
        setStatus('unavailable');
        return;
      }
      // 2. ユーザーに許可をもらう(初回はダイアログが出る)
      const permission = await Pedometer.requestPermissionsAsync().catch(() => null);
      if (cancelled) return;
      if (!permission?.granted) {
        setStatus('denied');
        return;
      }
      setStatus('ready');
      // 3. 歩数を取り始める
      if (Platform.OS === 'ios') {
        await refresh();
      } else {
        subscription = Pedometer.watchStepCount((result) => {
          if (!cancelled) setSteps(result.steps);
        });
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [refresh]);

  return { status, steps, isLiveOnly, refresh };
}

/** usePedometer が返すもの一式の型 */
export type PedometerData = ReturnType<typeof usePedometer>;
