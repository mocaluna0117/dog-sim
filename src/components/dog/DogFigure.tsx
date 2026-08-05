// SVGで描く「動く犬」。画像ファイルを使わず、パーツ(頭・耳・目・しっぽ…)を
// 図形として描いて、それぞれをアニメーションで動かしている。
//
// 動き:
//   - 呼吸     : 体がゆっくり上下にふくらむ(いつも)
//   - まばたき : ときどき目を閉じる(いつも)
//   - しっぽ   : ふりふり。きぶんがいいほど速い。悲しいと下がる
//   - 耳       : 悲しいと外側にしょんぼり垂れる
//   - ジャンプ : reactionKey が変わるとぴょんと跳ねる(お世話したとき用)
//
// 犬種ごとの違い(色・耳のかたち・しっぽのかたち)は breeds.ts の visual 設定で決まる。
// デザインは 200×200 の座標系で作ってあり、size に合わせて全体が拡大縮小される。

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Breed } from '../../breeds';
import { MoodLevel } from '../../gameLogic';

// SVGのグループ(G)をAnimatedで動かせるようにする
const AnimatedG = Animated.createAnimatedComponent(G);

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

/** きぶんごとの しっぽの動き(振る速さと角度の範囲) */
const TAIL: Record<MoodLevel, { duration: number; range: [number, number] }> = {
  great: { duration: 200, range: [-12, 16] },
  ok: { duration: 600, range: [-6, 8] },
  sad: { duration: 1400, range: [18, 24] }, // 下がったまま、ゆっくり小さく
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

  // アニメーションの「現在値」たち。0〜1 の数値を interpolate で角度などに変換する
  const breath = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const wag = useRef(new Animated.Value(0.5)).current;
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

  // しっぽ: きぶんが変わったら振る速さも変える
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
  const tailRotation = wag.interpolate({ inputRange: [0, 1], outputRange: TAIL[mood].range });
  const jumpTranslate = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  // 耳の傾き: とがり耳は大きく、垂れ耳はもともと垂れているので小さめに
  const earAngle = v.earType === 'pointy' ? 24 : 10;
  const earLeftRotation = earDroop.interpolate({ inputRange: [0, 1], outputRange: [0, -earAngle] });
  const earRightRotation = earDroop.interpolate({ inputRange: [0, 1], outputRange: [0, earAngle] });
  // 太り具合: 0.9〜1.3倍の範囲で体の横幅にそのまま反映
  const chubby = Math.max(0.9, Math.min(1.3, bodyRatio));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimatedG translateY={jumpTranslate}>
        {/* しっぽ(体のうしろ) */}
        <AnimatedG rotation={tailRotation} originX={137} originY={150}>
          {v.tailType === 'curl' ? (
            <Path
              d="M136 150 q 26 2 30 -18 q 3 -17 -14 -19 q 9 5 7 15 q -3 14 -23 14 z"
              fill={v.coatDark}
            />
          ) : (
            <Path
              d="M138 152 q 30 -2 34 -30 q 1 -10 -8 -12 q 4 8 0 16 q -6 16 -28 18 z"
              fill={v.coatDark}
            />
          )}
        </AnimatedG>

        {/* 体(呼吸でふくらみ、太ると横にひろがる) */}
        <AnimatedG scaleX={chubby} scaleY={breathScale} originX={100} originY={180}>
          <Ellipse cx={100} cy={148} rx={46} ry={36} fill={v.coat} />
          <Ellipse cx={100} cy={158} rx={26} ry={22} fill={v.coatLight} />
          <Rect x={82} y={140} width={14} height={40} rx={7} fill={v.coat} />
          <Rect x={104} y={140} width={14} height={40} rx={7} fill={v.coat} />
          <Ellipse cx={89} cy={180} rx={8} ry={5.5} fill={v.paw} />
          <Ellipse cx={111} cy={180} rx={8} ry={5.5} fill={v.paw} />
        </AnimatedG>

        {/* とがり耳は頭のうしろ側に描く(付け根が頭にかくれる) */}
        {v.earType === 'pointy' && (
          <>
            <AnimatedG rotation={earLeftRotation} originX={70} originY={56}>
              <Path d="M62 62 L 54 26 Q 53 20 59 22 L 88 40 z" fill={v.coat} />
              <Path d="M66 54 L 61 32 L 80 44 z" fill="#F7C6C5" />
            </AnimatedG>
            <AnimatedG rotation={earRightRotation} originX={130} originY={56}>
              <Path d="M138 62 L 146 26 Q 147 20 141 22 L 112 40 z" fill={v.coat} />
              <Path d="M134 54 L 139 32 L 120 44 z" fill="#F7C6C5" />
            </AnimatedG>
          </>
        )}

        {/* 頭 */}
        <Circle cx={100} cy={84} r={44} fill={v.coat} />

        {/* 垂れ耳は頭の上にかぶせて横に垂らす */}
        {v.earType === 'floppy' && (
          <>
            <AnimatedG rotation={earLeftRotation} originX={66} originY={54}>
              <Path
                d="M64 52 q -18 4 -16 34 q 1 18 12 20 q 8 1 10 -12 q 2 -22 -6 -42 z"
                fill={v.coatDark}
              />
            </AnimatedG>
            <AnimatedG rotation={earRightRotation} originX={134} originY={54}>
              <Path
                d="M136 52 q 18 4 16 34 q -1 18 -12 20 q -8 1 -10 -12 q -2 -22 6 -42 z"
                fill={v.coatDark}
              />
            </AnimatedG>
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
        <Ellipse cx={100} cy={102} rx={22} ry={16} fill={v.coatLight} />
        <Ellipse cx={66} cy={98} rx={7} ry={4.5} fill="#F7B6B0" opacity={0.7} />
        <Ellipse cx={134} cy={98} rx={7} ry={4.5} fill="#F7B6B0" opacity={0.7} />

        {/* 鼻 */}
        <Path d="M94 96 q 6 -4 12 0 q -2 7 -6 7 q -4 0 -6 -7 z" fill="#3E2C20" />

        {/* 口もと: きぶんで変わる */}
        {mood === 'sad' ? (
          // しょんぼり(への字)
          <Path
            d="M93 111 q 7 -6 14 0"
            stroke="#3E2C20"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <>
            {mood === 'great' && (
              // ごきげんなときは舌を出す
              <Path d="M96 109 q 4 9 8 0 q 0 -4 -4 -4 q -4 0 -4 4 z" fill="#F08080" />
            )}
            <Path
              d="M100 103 q 0 6 -7 7 M100 103 q 0 6 7 7"
              stroke="#3E2C20"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </>
        )}

        {/* 目(まばたきで縦につぶれる) */}
        <AnimatedG scaleY={blink} originX={80} originY={82}>
          <Circle cx={80} cy={82} r={7} fill="#3E2C20" />
          <Circle cx={82.5} cy={79.5} r={2.4} fill="#fff" />
        </AnimatedG>
        <AnimatedG scaleY={blink} originX={120} originY={82}>
          <Circle cx={120} cy={82} r={7} fill="#3E2C20" />
          <Circle cx={122.5} cy={79.5} r={2.4} fill="#fff" />
        </AnimatedG>
      </AnimatedG>
    </Svg>
  );
}
