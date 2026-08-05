// ゲーム全体で使う「型」の定義。
// TypeScriptでは、データの形をあらかじめ決めておくことで
// 「存在しない項目を触ろうとした」などのミスをエディタが教えてくれる。

/** 成長段階 */
export type GrowthStage = 'puppy' | 'adult' | 'senior';

/**
 * 「1日ごとにリセットされる回数」を表すデータ。
 * date が今日と違っていたら「今日はまだ0回」とみなす。
 * (例: おやつをあげた回数、散歩に反映済みの歩数)
 */
export type DailyCounter = {
  /** 'YYYY-MM-DD' 形式の日付 */
  date: string;
  count: number;
};

/**
 * 犬の状態。ゲームの「セーブデータ」そのもの。
 * この1個のオブジェクトを AsyncStorage に保存する。
 */
export type DogState = {
  /** 犬の名前 */
  name: string;
  /** 犬種のID (breeds.ts の BREEDS に対応) */
  breedId: string;
  /** うちに来た日 'YYYY-MM-DD'。経過日数はこの日付から毎回計算する */
  startDate: string;
  /** 満腹度 0〜100 */
  hunger: number;
  /** なつき度 0〜100 */
  affection: number;
  /**
   * 体型係数。1.0 = 理想体重ぴったり。
   * 食べると増え、運動すると減る。
   * 実際の体重(kg)は「理想体重 × bodyRatio」で毎回計算する。
   * こうしておくと、成長して理想体重が増えても「太り具合」は引き継がれる。
   */
  bodyRatio: number;
  /**
   * 最後に「時間経過の計算」をした時刻(ミリ秒)。
   * アプリを閉じている間もお腹が減る仕組みは、
   * 「開いたときに、この時刻からの経過時間ぶんをまとめて計算する」ことで実現している。
   */
  lastCareAt: number;
  /** 最後に朝ごはんをあげた日 'YYYY-MM-DD'。1日1回の判定に使う */
  lastBreakfastDate: string | null;
  /** 今日あげたおやつの回数 */
  treats: DailyCounter;
  /** 今日あそんだ回数 */
  plays: DailyCounter;
  /** 今日すでに散歩に反映した歩数 */
  walkedSteps: DailyCounter;
};

/**
 * 「ごはんをあげる」などのアクションの結果。
 * ok=false のときは何も起きず、message に理由が入る。
 */
export type ActionResult = {
  dog: DogState;
  ok: boolean;
  /** 画面に表示するメッセージ */
  message: string;
};
