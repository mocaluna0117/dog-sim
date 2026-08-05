// SVGで描く「動く犬」。画像ファイルを使わず、パーツ(頭・耳・目・しっぽ…)を
// 図形として描いて、それぞれをアニメーションで動かしている。
// 見た目は「太いこげ茶のアウトライン+デフォルメ」のゆるかわイラスト風。
//
// 動き:
//   - 呼吸     : 体がゆっくり上下にふくらむ(いつも)
//   - まばたき : ときどき目を閉じる(いつも)
//   - しっぽ   : ふりふり。きぶんがいいほど速い。悲しいと下がる
//   - 耳       : 悲しいと外側にしょんぼり垂れる
//   - ジャンプ : reactionKey が変わるとぴょんと跳ねる(お世話したとき用)
//
// 犬種ごとの違い(色・耳・しっぽ・もこもこ度)は breeds.ts の visual 設定で決まる。
// もこもこの輪郭は shapes.ts の fluffyPath() で計算している。
// デザインは 200×200 の座標系で作ってあり、size に合わせて全体が拡大縮小される。
//
// 【だいじな実装ルール】
// アニメーションするグループ(AnimatedG)には、動くプロパティ「だけ」を置くこと。
// originX/originY や 動かない scaleX を同居させてはいけない。
// 理由: アニメーション中は毎フレーム「動いているプロパティだけ」がネイティブ側に
// 送られ、SVGはそれだけで変換をつくり直すため、同居した静的な値が消えて
// パーツが (0,0) を軸に吹っ飛ぶ。そこで AnimatedPivot という
// 「静的なGで回転の中心へ移動 → AnimatedGは動く値だけ → 静的なGで元に戻す」
// 3層構造を使っている。

import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Breed } from '../../breeds';
import { MoodLevel } from '../../gameLogic';
import { fluffyPath } from './shapes';

// SVGのグループ(G)をAnimatedで動かせるようにする
const AnimatedG = Animated.createAnimatedComponent(G);

/** アニメーションできる数値(Animated.Value やその計算結果) */
type AnimatedNumber =
  | Animated.Value
  | Animated.AnimatedInterpolation<number>
  | Animated.AnimatedAddition<number>;

/**
 * 「(x, y) を中心に回転・伸縮するアニメーショングループ」。
 * 上のだいじな実装ルールを守るための部品。
 *
 * ※ x / y / rotation / scaleX / scaleY にはエディタで「非推奨」と出るが、
 *   Animatedで毎フレーム値を流し込めるのはこの個別プロパティだけなので
 *   ここではあえて使っている(react-native-svg 15系では問題なく動く)。
 */
function AnimatedPivot({
  x,
  y,
  rotation,
  scaleY,
  staticScaleX,
  children,
}: {
  x: number;
  y: number;
  rotation?: AnimatedNumber;
  scaleY?: AnimatedNumber;
  /** アニメしない横方向の伸縮(太り具合)。静的な外側のGにかける */
  staticScaleX?: number;
  children: ReactNode;
}) {
  return (
    <G x={x} y={y} scaleX={staticScaleX}>
      <AnimatedG rotation={rotation} scaleY={scaleY}>
        <G x={-x} y={-y}>{children}</G>
      </AnimatedG>
    </G>
  );
}

// ---------- 見た目の共通スタイル ----------

/** アウトライン(輪郭線)の色。ゆるかわ感の要 */
const OUTLINE = '#59422E';
/** 大きいパーツの輪郭線 */
const LINE = { stroke: OUTLINE, strokeWidth: 3.5, strokeLinejoin: 'round' as const };
/** 小さいパーツ(あしさき等)の輪郭線 */
const LINE_THIN = { stroke: OUTLINE, strokeWidth: 2.5 };

// もこもこ輪郭のパス(形は固定なので、あらかじめ計算しておく)
const FLUFFY_HEAD = fluffyPath(100, 80, 46, 43, 11, 0.28);
const FLUFFY_BODY = fluffyPath(100, 150, 44, 34, 10, 0.28);
const FLUFFY_EAR_LEFT = fluffyPath(48, 88, 17, 27, 8, 0.35);
const FLUFFY_EAR_RIGHT = fluffyPath(152, 88, 17, 27, 8, 0.35);
const POM_TAIL = fluffyPath(154, 141, 14, 14, 8, 0.35);

type Props = {
  breed: Breed;
  /** 表示サイズ(px) */
  size: number;
  /** 太り具合。1.0が標準で、大きいほど体が横にひろがる */
  bodyRatio?: number;
  /** きぶん。しっぽの速さ・耳・口もとが変わる */
  mood?: MoodLevel;
  /** この数字が変わるたびに ぴょんと跳ねる */
  reactionKey?: number;
  /** falseで動きを止める(犬種選択の一覧など、たくさん並べるとき用) */
  animated?: boolean;
};

/**
 * きぶんごとの しっぽの動き。
 * center = しっぽの基本角度(悲しいと大きい=垂れ下がる)
 * amplitude = そこから前後に振れる幅 / duration = 片道の速さ
 */
const TAIL: Record<MoodLevel, { duration: number; center: number; amplitude: number }> = {
  great: { duration: 200, center: 2, amplitude: 14 },
  ok: { duration: 600, center: 1, amplitude: 7 },
  sad: { duration: 1400, center: 21, amplitude: 3 },
};

export function DogFigure({
  breed,
  size,
  bodyRatio = 1,
  mood = 'ok',
  reactionKey = 0,
  animated = true,
}: Props) {
  const v = breed.visual;
  // 省略できる見た目設定は、ここでデフォルト値を決める
  const headStyle = v.headStyle ?? 'smooth';
  const bodyStyle = v.bodyStyle ?? 'smooth';
  const hasMuzzlePatch = v.hasMuzzlePatch ?? true;
  const hasBellyPatch = v.hasBellyPatch ?? true;

  // アニメーションの「現在値」たち。0〜1 の数値を interpolate で角度などに変換する
  const breath = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  // しっぽ = 「振りのリズム(wag)」と「基本角度(tailCenter)」の合成。
  // きぶんが変わったとき、基本角度だけをなめらかに動かせるように分けてある
  const wag = useRef(new Animated.Value(0)).current;
  const tailCenter = useRef(new Animated.Value(TAIL[mood].center)).current;
  const earDroop = useRef(new Animated.Value(mood === 'sad' ? 1 : 0)).current;
  const jump = useRef(new Animated.Value(0)).current;

  // 呼吸: ゆっくり ふくらんで もどる を繰り返す
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false, // SVGのプロパティを動かすので false
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, breath]);

  // まばたき: しばらく待って、ぱちっと閉じて開く
  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(blink, { toValue: 0.15, duration: 70, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, blink]);

  // しっぽの振り: きぶんが変わったら速さを変えて振り直す
  // (0で始まり0で終わるので、ループの繰り返しで角度が飛ばない)
  useEffect(() => {
    if (!animated) return;
    const { duration } = TAIL[mood];
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wag, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(wag, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, mood, wag]);

  // しっぽの基本角度: きぶんが変わったら、なめらかに垂れる/上がる
  useEffect(() => {
    const toValue = TAIL[mood].center;
    if (animated) {
      Animated.timing(tailCenter, { toValue, duration: 350, useNativeDriver: false }).start();
    } else {
      tailCenter.setValue(toValue);
    }
  }, [animated, mood, tailCenter]);

  // 耳: 悲しいときだけ しょんぼり垂れる
  useEffect(() => {
    const toValue = mood === 'sad' ? 1 : 0;
    if (animated) {
      Animated.timing(earDroop, { toValue, duration: 350, useNativeDriver: false }).start();
    } else {
      earDroop.setValue(toValue);
    }
  }, [animated, mood, earDroop]);

  // ジャンプ: reactionKey が変わったら ぴょん、ぴょこ、と2回はねる
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!animated) return;
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(jump, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(jump, { toValue: 0.45, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(jump, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start();
  }, [reactionKey, animated, jump]);

  // 現在値 → 実際の見た目の値 への変換
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const { amplitude } = TAIL[mood];
  const tailRotation = Animated.add(
    tailCenter,
    wag.interpolate({ inputRange: [0, 1], outputRange: [-amplitude, amplitude] })
  );
  const jumpTranslate = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  // 耳の傾き: とがり耳は大きく、垂れ耳・もこもこ耳はもともと垂れているので小さめに
  const earAngle = v.earType === 'pointy' ? 24 : 10;
  const earLeftRotation = earDroop.interpolate({ inputRange: [0, 1], outputRange: [0, -earAngle] });
  const earRightRotation = earDroop.interpolate({ inputRange: [0, 1], outputRange: [0, earAngle] });
  // 太り具合: 0.9〜1.3倍の範囲で体の横幅にそのまま反映
  const chubby = Math.max(0.9, Math.min(1.3, bodyRatio));
  // もこもこ耳の回転中心(耳の付け根の上あたり)
  const fluffyEarPivotY = 64;
  // もこもこ頭×とがり耳(ポメラニアン等)は、耳を内側・下に寄せて輪郭につなげる
  const pointyEarShiftX = headStyle === 'fluffy' ? 7 : 0;
  const pointyEarShiftY = headStyle === 'fluffy' ? 9 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* ジャンプは「たて移動」だけなので、中心の指定はいらない */}
      <AnimatedG translateY={jumpTranslate}>
        {/* しっぽ(体のうしろ)。付け根 (137,150) を中心に回る */}
        <AnimatedPivot x={137} y={150} rotation={tailRotation}>
          {v.tailType === 'curl' && (
            <Path
              d="M136 150 q 26 2 30 -18 q 3 -17 -14 -19 q 9 5 7 15 q -3 14 -23 14 z"
              fill={v.coatDark}
              {...LINE}
            />
          )}
          {v.tailType === 'fluffy' && (
            <Path
              d="M138 152 q 30 -2 34 -30 q 1 -10 -8 -12 q 4 8 0 16 q -6 16 -28 18 z"
              fill={v.coatDark}
              {...LINE}
            />
          )}
          {v.tailType === 'pom' && <Path d={POM_TAIL} fill={v.coat} {...LINE} />}
        </AnimatedPivot>

        {/* 体: あしもと (100,180) を基準に、呼吸でふくらみ、太ると横にひろがる */}
        <AnimatedPivot x={100} y={180} scaleY={breathScale} staticScaleX={chubby}>
          {bodyStyle === 'fluffy' ? (
            <>
              {/* もこもこボディ。あしは線で描くと、ぬいぐるみっぽさが出る */}
              <Path d={FLUFFY_BODY} fill={v.coat} {...LINE} />
              {hasBellyPatch && <Ellipse cx={100} cy={158} rx={24} ry={20} fill={v.coatLight} />}
              <Path d="M88 150 L 88 178" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" fill="none" />
              <Path d="M112 150 L 112 178" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" fill="none" />
              <Ellipse cx={89} cy={180} rx={9} ry={6} fill={v.paw} {...LINE_THIN} />
              <Ellipse cx={111} cy={180} rx={9} ry={6} fill={v.paw} {...LINE_THIN} />
            </>
          ) : (
            <>
              <Ellipse cx={100} cy={148} rx={46} ry={36} fill={v.coat} {...LINE} />
              {hasBellyPatch && <Ellipse cx={100} cy={158} rx={26} ry={22} fill={v.coatLight} />}
              <Rect x={82} y={140} width={14} height={40} rx={7} fill={v.coat} {...LINE} />
              <Rect x={104} y={140} width={14} height={40} rx={7} fill={v.coat} {...LINE} />
              <Ellipse cx={89} cy={180} rx={8} ry={5.5} fill={v.paw} {...LINE_THIN} />
              <Ellipse cx={111} cy={180} rx={8} ry={5.5} fill={v.paw} {...LINE_THIN} />
            </>
          )}
        </AnimatedPivot>

        {/* とがり耳は頭のうしろ側に描く(付け根が頭にかくれる) */}
        {v.earType === 'pointy' && (
          <>
            <G x={pointyEarShiftX} y={pointyEarShiftY}>
              <AnimatedPivot x={70} y={56} rotation={earLeftRotation}>
                <Path d="M62 62 L 54 26 Q 53 20 59 22 L 88 40 z" fill={v.coat} {...LINE} />
                <Path d="M66 54 L 61 32 L 80 44 z" fill="#F7C6C5" />
              </AnimatedPivot>
            </G>
            <G x={-pointyEarShiftX} y={pointyEarShiftY}>
              <AnimatedPivot x={130} y={56} rotation={earRightRotation}>
                <Path d="M138 62 L 146 26 Q 147 20 141 22 L 112 40 z" fill={v.coat} {...LINE} />
                <Path d="M134 54 L 139 32 L 120 44 z" fill="#F7C6C5" />
              </AnimatedPivot>
            </G>
          </>
        )}

        {/* 頭 */}
        {headStyle === 'fluffy' ? (
          <Path d={FLUFFY_HEAD} fill={v.coat} {...LINE} />
        ) : (
          <Circle cx={100} cy={84} r={44} fill={v.coat} {...LINE} />
        )}

        {/* 垂れ耳・もこもこ耳は頭の上にかぶせて横に垂らす */}
        {v.earType === 'floppy' && (
          <>
            <AnimatedPivot x={66} y={54} rotation={earLeftRotation}>
              <Path
                d="M64 52 q -18 4 -16 34 q 1 18 12 20 q 8 1 10 -12 q 2 -22 -6 -42 z"
                fill={v.coatDark}
                {...LINE}
              />
            </AnimatedPivot>
            <AnimatedPivot x={134} y={54} rotation={earRightRotation}>
              <Path
                d="M136 52 q 18 4 16 34 q -1 18 -12 20 q -8 1 -10 -12 q -2 -22 6 -42 z"
                fill={v.coatDark}
                {...LINE}
              />
            </AnimatedPivot>
          </>
        )}
        {v.earType === 'fluffy' && (
          <>
            <AnimatedPivot x={50} y={fluffyEarPivotY} rotation={earLeftRotation}>
              <Path d={FLUFFY_EAR_LEFT} fill={v.coat} {...LINE} />
            </AnimatedPivot>
            <AnimatedPivot x={150} y={fluffyEarPivotY} rotation={earRightRotation}>
              <Path d={FLUFFY_EAR_RIGHT} fill={v.coat} {...LINE} />
            </AnimatedPivot>
          </>
        )}

        {/* まゆ毛スポット(柴犬など) */}
        {v.hasEyebrows && (
          <>
            <Ellipse cx={82} cy={66} rx={5} ry={3.5} fill={v.coatLight} />
            <Ellipse cx={118} cy={66} rx={5} ry={3.5} fill={v.coatLight} />
          </>
        )}

        {/* マズル(口まわり)・ほっぺ */}
        {hasMuzzlePatch && <Ellipse cx={100} cy={102} rx={22} ry={16} fill={v.coatLight} />}
        <Ellipse cx={70} cy={98} rx={8} ry={5.5} fill="#F5A9A0" opacity={0.85} />
        <Ellipse cx={130} cy={98} rx={8} ry={5.5} fill="#F5A9A0" opacity={0.85} />

        {/* 鼻 */}
        <Path d="M95 96 q 5 -3.5 10 0 q -1.7 6 -5 6 q -3.3 0 -5 -6 z" fill={OUTLINE} />

        {/* 口もと: きぶんで変わる */}
        {mood === 'sad' ? (
          // しょんぼり(への字)
          <Path
            d="M93 111 q 7 -6 14 0"
            stroke={OUTLINE}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <>
            {mood === 'great' && (
              // ごきげんなときは舌を出す
              <Path
                d="M96 108 q 4 9 8 0 q 0 -4 -4 -4 q -4 0 -4 4 z"
                fill="#F08080"
                stroke={OUTLINE}
                strokeWidth={1.5}
              />
            )}
            <Path
              d="M100 102 q 0 6 -7 7 M100 102 q 0 6 7 7"
              stroke={OUTLINE}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}

        {/* 目: それぞれの目の中心を基準に、まばたきで縦につぶれる */}
        <AnimatedPivot x={80} y={82} scaleY={blink}>
          <Circle cx={80} cy={82} r={6.5} fill={OUTLINE} />
          <Circle cx={82.3} cy={79.7} r={2} fill="#fff" />
        </AnimatedPivot>
        <AnimatedPivot x={120} y={82} scaleY={blink}>
          <Circle cx={120} cy={82} r={6.5} fill={OUTLINE} />
          <Circle cx={122.3} cy={79.7} r={2} fill="#fff" />
        </AnimatedPivot>
      </AnimatedG>
    </Svg>
  );
}
