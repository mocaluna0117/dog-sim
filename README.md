# 🐕 わんこそだて (dog_sim)

犬をむかえて育てるスマホゲーム。Expo (React Native) + TypeScript 製。

- 犬種を12種類からえらんで、名前をつけてむかえる
- 犬は画像ではなく**コードで描いたSVGアニメ**。呼吸・まばたき・しっぽふりふり、お世話するとジャンプ、悲しいと耳がしょんぼり
- 朝ごはん・おやつ・あそぶ、でお世話する
- **実際に歩いた歩数**が、犬のおさんぽになる
- 日数がたつと子犬 → おとなに成長する
- 食べさせすぎると太る(見た目も横に広がる)。おさんぽで痩せる
- アプリを閉じてもセーブされていて、留守のあいだにお腹が減る

## 動かし方

1. このフォルダで依存ライブラリを入れる(初回だけ)

   ```bash
   npm install
   ```

2. 開発サーバーを起動する

   ```bash
   npx expo start
   ```

3. スマホに **Expo Go** アプリ(App Store / Google Play で無料)を入れて、
   ターミナルに出たQRコードをカメラで読み取ると、自分のスマホでゲームが動く。

> 💡 コードを保存すると、スマホの画面も数秒で自動的に更新される(ホットリロード)。
> 💡 歩数計はパソコン上のシミュレーターでは動かない。実機でためすこと。

## プロジェクトの構成

「ゲームのルール」「保存」「画面」をきっちり分けてある。
どこを直せば何が変わるかが分かりやすくなるので、この分け方はおすすめ。

| ファイル | 役割 |
| --- | --- |
| [src/balance.ts](src/balance.ts) | **ゲームバランスの数値がぜんぶここに**。お腹の減る速さ、太りやすさ、おやつの回数制限など。調整はまずここ |
| [src/breeds.ts](src/breeds.ts) | 犬種のデータ。配列に1個足せば犬種が増える |
| [src/types.ts](src/types.ts) | データの「形」の定義。セーブデータの中身はここを見る |
| [src/gameLogic.ts](src/gameLogic.ts) | ゲームのルール本体。「いまの状態+時刻 → 新しい状態」の計算だけをする純粋関数の集まり |
| [src/storage.ts](src/storage.ts) | セーブデータの保存・読み込み (AsyncStorage) |
| [src/hooks/useDogGame.ts](src/hooks/useDogGame.ts) | ロジックと画面をつなぐ司令塔。自動保存・時間経過の反映もここ |
| [src/hooks/usePedometer.ts](src/hooks/usePedometer.ts) | 端末の歩数計との連携 |
| [src/screens/](src/screens/) | 画面(犬種選択・ホーム) |
| [src/components/dog/DogFigure.tsx](src/components/dog/DogFigure.tsx) | SVGで描いた「動く犬」。パーツの形・色・アニメーションぜんぶここ |
| [src/components/dog/shapes.ts](src/components/dog/shapes.ts) | プードルなどの「もこもこ」輪郭を計算でつくる関数 |
| [src/components/](src/components/) | 使い回すUI部品(ステータスバー・ボタン) |
| [App.tsx](App.tsx) | 入り口。画面の出し分けだけ |

## ゲームの仕組み(だいじな設計)

### 時間の経過はぜんぶ「差分計算」

アプリが閉じている間もプログラムが動き続ける…わけではない。
**「最後に計算した時刻」をセーブしておき、次に開いたときに経過時間ぶんをまとめて計算する**。
これが育成ゲームの定石で、[src/gameLogic.ts](src/gameLogic.ts) の `applyTimePassage()` がやっている。
経過日数も「開始日を保存して、表示のたびに今日との差を計算」しているだけ。

### 太る仕組み

体重そのものではなく「体型係数 (bodyRatio)」を保存している。1.0が理想。

- 食べる(朝ごはん・おやつ) → 係数が増える
- 運動(あそぶ・おさんぽ) + 基礎代謝 → 係数が減る
- 表示する体重 = その日齢の理想体重 × 係数

こうすると、成長して理想体重が変わっても「太り具合」が自然に引き継がれる。

### 歩数のOSごとの違い

| | iOS | Android |
| --- | --- | --- |
| 取れるもの | 今日0時からの合計歩数(過去7日までさかのぼれる) | アプリを開いてからの歩数のみ |
| 実装 | `Pedometer.getStepCountAsync()` | `Pedometer.watchStepCount()` |

Androidで「今日の合計」を取るには Health Connect 連携が必要(今後の課題)。

## 次にやると面白そうなこと

だいたい簡単な順。

1. **ゲームバランス調整** — [src/balance.ts](src/balance.ts) の数値をいじって遊んでみる
2. **犬種を増やす** — [src/breeds.ts](src/breeds.ts) に1個足すだけ
3. **犬の動きや表情を増やす** — [src/components/dog/DogFigure.tsx](src/components/dog/DogFigure.tsx) にパーツやアニメーションを足す(寝る、なでたら反応、食べる動き、首輪などのきせかえ)
4. **通知** — `expo-notifications` で「朝ごはんの時間だよ!」を出す
5. **病気システム** — 満腹度0が続いたり太りすぎだと病気に。看病で治る、から始めるのがおすすめ(死ぬ仕様は遊ぶ人が離れやすいので慎重に)
6. **Gitで履歴管理** — `git init` してこまめにコミットすると、壊しても戻れるようになる
7. **Android の歩数を本格対応** — Health Connect 連携

## トラブルシューティング

- **「Project is incompatible with this version of Expo Go」と出る** → プロジェクトのExpo SDKバージョンと、スマホのExpo Goが対応するSDKバージョンが合っていない。
  このプロジェクトは、App Store版Expo Goに合わせて **SDK 54** に固定してある(2026年8月時点、Appleの審査遅延でApp Store版がSDK 54のまま止まっているため)。
  App Store版Expo Goが新しくなったら `npx expo install expo@latest` → `npx expo install --fix` でプロジェクト側も上げられる
- **QRコードを読んでもつながらない** → スマホとPCが同じWi-Fiにいるか確認。ダメなら `npx expo start --tunnel`
- **歩数が「つかえない」と出る** → シミュレーター/一部端末には歩数センサーがない。実機で確認
- **わけがわからなくなった** → アプリ内の「はじめからやりなおす」でセーブデータを消せる
