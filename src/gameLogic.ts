// ゲームのルールをぜんぶ集めたファイル。
//
// ここにあるのは「純粋関数」だけ。つまり、
//   いまの犬の状態 + 現在時刻 → 新しい犬の状態
// という計算だけをして、画面や保存のことは一切知らない。
// こうしておくと、ルールの追加・変更やテストがしやすくなる。
//
// 注意: 犬の状態は直接書き換えず、必ず新しいオブジェクトを作って返す
// ({ ...dog, hunger: 50 } のような書き方)。Reactはオブジェクトが
// 「別物に変わった」ことで画面の更新を検知するため。

import { BALANCE } from './balance';
import { getBreed } from './breeds';
import { ActionResult, DailyCounter, DogState, GrowthStage } from './types';

// ---------- 日付・数値のヘルパー ----------

/** Date → 'YYYY-MM-DD' の文字列にする(端末のタイムゾーン基準) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → その日の0時のDateに戻す */
function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 値を min〜max の範囲におさめる */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 体型係数を上限・下限の範囲におさめる */
function clampBody(ratio: number): number {
  return clamp(ratio, BALANCE.BODY_MIN, BALANCE.BODY_MAX);
}

/** 日付つきカウンターの「今日の回数」。日付が変わっていたら0扱い */
function countToday(counter: DailyCounter, now: Date): number {
  return counter.date === toDateKey(now) ? counter.count : 0;
}

/** 日付つきカウンターに回数を足す(日付が変わっていたら数え直す) */
function addCount(counter: DailyCounter, now: Date, amount: number): DailyCounter {
  return { date: toDateKey(now), count: countToday(counter, now) + amount };
}

// ---------- 犬をつくる ----------

/** 新しい犬をむかえる。ゲーム開始時に1回だけ呼ばれる */
export function createDog(name: string, breedId: string, now: Date): DogState {
  const today = toDateKey(now);
  return {
    name,
    breedId,
    startDate: today,
    hunger: BALANCE.INITIAL.hunger,
    affection: BALANCE.INITIAL.affection,
    bodyRatio: 1.0,
    lastCareAt: now.getTime(),
    lastBreakfastDate: null,
    treats: { date: today, count: 0 },
    plays: { date: today, count: 0 },
    walkedSteps: { date: today, count: 0 },
  };
}

// ---------- 状態から計算できる値(体重・成長など) ----------

/** うちに来て何日目か(来た日を「1日目」と数える) */
export function getAgeDays(dog: DogState, now: Date): number {
  const start = fromDateKey(dog.startDate);
  const today = fromDateKey(toDateKey(now));
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return Math.max(0, diffDays) + 1;
}

/** 成長段階を判定する */
export function getStage(dog: DogState, now: Date): GrowthStage {
  const days = getAgeDays(dog, now);
  if (days <= BALANCE.PUPPY_DAYS) return 'puppy';
  if (days > BALANCE.SENIOR_DAYS) return 'senior';
  return 'adult';
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  puppy: 'こいぬ',
  adult: 'おとな',
  senior: 'シニア',
};

/**
 * 今日の理想体重。
 * 子犬の間は日数に応じて「子犬の体重→成犬の体重」へ少しずつ増えていく。
 */
export function getIdealWeightKg(dog: DogState, now: Date): number {
  const breed = getBreed(dog.breedId);
  // 来た日(1日目)は progress=0 で puppyWeightKg ぴったり、
  // 子犬期間が終わった日にちょうど成犬の体重になるよう -1 している
  const progress = Math.min(1, (getAgeDays(dog, now) - 1) / BALANCE.PUPPY_DAYS);
  return breed.puppyWeightKg + (breed.adultWeightKg - breed.puppyWeightKg) * progress;
}

/** 実際の体重 = 理想体重 × 体型係数 */
export function getWeightKg(dog: DogState, now: Date): number {
  return getIdealWeightKg(dog, now) * dog.bodyRatio;
}

export type BodyCondition = 'thin' | 'ideal' | 'chubby' | 'fat';

/** 体型係数から「やせぎみ〜おでぶ」を判定する */
export function getBodyCondition(dog: DogState): BodyCondition {
  if (dog.bodyRatio < 0.9) return 'thin';
  if (dog.bodyRatio <= 1.15) return 'ideal';
  if (dog.bodyRatio <= 1.35) return 'chubby';
  return 'fat';
}

export const BODY_LABEL: Record<BodyCondition, string> = {
  thin: 'やせぎみ',
  ideal: 'ちょうどいい',
  chubby: 'ぽっちゃり',
  fat: 'おでぶ',
};

/** きぶんの段階。DogFigure(犬の絵)の表情やしっぽの速さに使う */
export type MoodLevel = 'great' | 'ok' | 'sad';

/** いまの状態から犬のきもちを決める(画面のふきだしと犬の絵に使う) */
export function getMood(dog: DogState): { emoji: string; comment: string; level: MoodLevel } {
  if (dog.hunger <= 15) return { emoji: '😢', comment: 'おなかペコペコだよ…', level: 'sad' };
  if (dog.affection <= 25) return { emoji: '🥺', comment: 'さみしいな…かまってほしいな', level: 'sad' };
  const condition = getBodyCondition(dog);
  if (condition === 'fat') {
    return { emoji: '😮‍💨', comment: 'からだが重いよ…おさんぽしなきゃ', level: 'sad' };
  }
  if (condition === 'thin') return { emoji: '🥺', comment: 'もうちょっと食べたいなあ', level: 'sad' };
  if (dog.affection >= 80 && dog.hunger >= 60) {
    return { emoji: '🥰', comment: 'だいすき!きょうもいい日だね', level: 'great' };
  }
  return { emoji: '😊', comment: 'ごきげんだよ!', level: 'ok' };
}

/** 今日あとなんかいおやつをあげられるか */
export function getTreatsLeft(dog: DogState, now: Date): number {
  return BALANCE.TREAT.maxPerDay - countToday(dog.treats, now);
}

/** 今日あとなんかいあそべるか */
export function getPlaysLeft(dog: DogState, now: Date): number {
  return BALANCE.PLAY.maxPerDay - countToday(dog.plays, now);
}

/** 今日すでに散歩に反映した歩数 */
export function getWalkedStepsToday(dog: DogState, now: Date): number {
  return countToday(dog.walkedSteps, now);
}

/** 今日の朝ごはんをもう食べたか */
export function hasEatenBreakfastToday(dog: DogState, now: Date): boolean {
  return dog.lastBreakfastDate === toDateKey(now);
}

// ---------- 時間の経過 ----------

/**
 * 前回の計算からの経過時間ぶん、お腹を減らしたりなつき度を下げたりする。
 * アプリを閉じていた間の変化も、開いたときにこの関数がまとめて計算する。
 * (バックグラウンドで動き続ける仕組みは不要、というのが育成ゲームの定石)
 */
export function applyTimePassage(dog: DogState, now: Date): DogState {
  const elapsedMs = now.getTime() - dog.lastCareAt;
  // 端末の時計が巻き戻っていた場合などは、時刻だけ合わせて何もしない
  if (elapsedMs <= 0) return { ...dog, lastCareAt: now.getTime() };

  const hours = elapsedMs / 3_600_000;
  return {
    ...dog,
    hunger: clamp(dog.hunger - BALANCE.HUNGER_DECAY_PER_HOUR * hours, 0, 100),
    affection: clamp(dog.affection - BALANCE.AFFECTION_DECAY_PER_HOUR * hours, 0, 100),
    bodyRatio: clampBody(dog.bodyRatio - BALANCE.METABOLISM_PER_DAY * (hours / 24)),
    lastCareAt: now.getTime(),
  };
}

// ---------- プレイヤーのアクション ----------

/** 朝ごはんをあげる(朝の時間帯に1日1回だけ) */
export function giveBreakfast(dog: DogState, now: Date): ActionResult {
  const { startHour, endHour } = BALANCE.BREAKFAST;
  const hour = now.getHours();
  if (hour < startHour || hour >= endHour) {
    return {
      dog,
      ok: false,
      message: `朝ごはんは あさ${startHour}時〜${endHour}時 のあいだにあげられるよ`,
    };
  }
  if (hasEatenBreakfastToday(dog, now)) {
    return { dog, ok: false, message: 'きょうの朝ごはんは もう食べたよ 🍚' };
  }
  return {
    ok: true,
    message: `${dog.name}は 朝ごはんをペロリとたいらげた!🍚`,
    dog: {
      ...dog,
      hunger: clamp(dog.hunger + BALANCE.BREAKFAST.hunger, 0, 100),
      affection: clamp(dog.affection + BALANCE.BREAKFAST.affection, 0, 100),
      bodyRatio: clampBody(dog.bodyRatio + BALANCE.BREAKFAST.body),
      lastBreakfastDate: toDateKey(now),
    },
  };
}

/** おやつをあげる(1日の回数制限あり) */
export function giveTreat(dog: DogState, now: Date): ActionResult {
  if (getTreatsLeft(dog, now) <= 0) {
    return {
      dog,
      ok: false,
      message: `おやつは1日${BALANCE.TREAT.maxPerDay}回まで。あげすぎは太っちゃうよ`,
    };
  }
  return {
    ok: true,
    message: `${dog.name}のしっぽが ぶんぶん!🦴`,
    dog: {
      ...dog,
      hunger: clamp(dog.hunger + BALANCE.TREAT.hunger, 0, 100),
      affection: clamp(dog.affection + BALANCE.TREAT.affection, 0, 100),
      bodyRatio: clampBody(dog.bodyRatio + BALANCE.TREAT.body),
      treats: addCount(dog.treats, now, 1),
    },
  };
}

/** あそぶ(1日の回数制限あり) */
export function playWithDog(dog: DogState, now: Date): ActionResult {
  if (getPlaysLeft(dog, now) <= 0) {
    return { dog, ok: false, message: `きょうはもうへとへと…あそぶのは1日${BALANCE.PLAY.maxPerDay}回まで` };
  }
  return {
    ok: true,
    message: `${dog.name}と ボールあそびをした!🎾`,
    dog: {
      ...dog,
      affection: clamp(dog.affection + BALANCE.PLAY.affection, 0, 100),
      hunger: clamp(dog.hunger + BALANCE.PLAY.hunger, 0, 100),
      bodyRatio: clampBody(dog.bodyRatio + BALANCE.PLAY.body),
      plays: addCount(dog.plays, now, 1),
    },
  };
}

/**
 * 歩数を散歩に反映する。
 * newSteps には「まだ反映していない新しい歩数」を渡すこと。
 * (今日の合計歩数との差分の計算は、画面側で行う)
 */
export function applyWalkSteps(dog: DogState, newSteps: number, now: Date): ActionResult {
  if (newSteps <= 0) {
    return {
      dog,
      ok: false,
      message: 'あたらしい歩数はまだないみたい。歩いてから また押してね 👟',
    };
  }
  const per1000 = newSteps / 1000;
  return {
    ok: true,
    message: `${newSteps}歩ぶん いっしょにおさんぽした!🐾`,
    dog: {
      ...dog,
      affection: clamp(dog.affection + BALANCE.WALK.affectionPer1000Steps * per1000, 0, 100),
      hunger: clamp(dog.hunger + BALANCE.WALK.hungerPer1000Steps * per1000, 0, 100),
      bodyRatio: clampBody(dog.bodyRatio + BALANCE.WALK.body * per1000),
      walkedSteps: addCount(dog.walkedSteps, now, newSteps),
    },
  };
}
