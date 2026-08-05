// 犬種のマスタデータ。
// 新しい犬種を増やしたいときは、この配列にオブジェクトを1個足すだけでOK。
// (犬種選択画面は BREEDS を読んで自動で一覧を作る)

/** 犬の見た目の設定。DogFigure(SVGで描く犬)がこれを読んで描き分ける */
export type BreedVisual = {
  /** 耳のかたち: とがり耳 / 垂れ耳 / もこもこ(プードル系) */
  earType: 'pointy' | 'floppy' | 'fluffy';
  /** しっぽのかたち: くるん / ふさふさ / ぽんぽん(プードル系) */
  tailType: 'curl' | 'fluffy' | 'pom';
  /** 頭の輪郭: なめらか(省略時) or もこもこ */
  headStyle?: 'smooth' | 'fluffy';
  /** 体の輪郭: なめらか(省略時) or もこもこ */
  bodyStyle?: 'smooth' | 'fluffy';
  /** 口まわりを明るい色で塗り分けるか(省略時 true。プードルは false) */
  hasMuzzlePatch?: boolean;
  /** おなかを明るい色で塗り分けるか(省略時 true) */
  hasBellyPatch?: boolean;
  /** 体と頭のメインの毛色 */
  coat: string;
  /** しっぽ・垂れ耳などの少し濃い毛色 */
  coatDark: string;
  /** マズル(口まわり)・おなかの明るい毛色 */
  coatLight: string;
  /** あしさきの色 */
  paw: string;
  /** 柴犬などの「まゆ毛」スポットを描くか */
  hasEyebrows?: boolean;
};

export type Breed = {
  /** プログラム内で使うID (保存データに入るので、あとから変えないこと) */
  id: string;
  /** 画面に表示する名前 */
  name: string;
  /** 昔は画面表示に使っていた絵文字(いまはSVGで描くので出番は少なめ) */
  emoji: string;
  /** うちに来た日(子犬)の体重 kg */
  puppyWeightKg: number;
  /** 成犬になったときの理想体重 kg */
  adultWeightKg: number;
  /** 犬種選択画面に出るひとこと */
  description: string;
  /** カードのアクセントカラー */
  color: string;
  /** 見た目の設定 */
  visual: BreedVisual;
};

export const BREEDS: Breed[] = [
  {
    id: 'shiba',
    name: '柴犬',
    emoji: '🐕',
    puppyWeightKg: 2.0,
    adultWeightKg: 9.0,
    description: '日本犬の定番。きままだけど飼い主にはいちず',
    color: '#E8A87C',
    visual: {
      earType: 'pointy',
      tailType: 'curl',
      coat: '#E8A860',
      coatDark: '#D89550',
      coatLight: '#FFF3E0',
      paw: '#F5C98A',
      hasEyebrows: true,
    },
  },
  {
    id: 'toy_poodle',
    name: 'トイプードル',
    emoji: '🐩',
    puppyWeightKg: 1.0,
    adultWeightKg: 3.5,
    description: 'かしこくて明るいくるくる毛のアイドル',
    color: '#C39BD3',
    visual: {
      earType: 'fluffy',
      tailType: 'pom',
      headStyle: 'fluffy',
      bodyStyle: 'fluffy',
      hasMuzzlePatch: false,
      hasBellyPatch: false,
      coat: '#CBA06A',
      coatDark: '#B78C55',
      coatLight: '#EAD9BE',
      paw: '#C79E67',
    },
  },
  {
    id: 'chihuahua',
    name: 'チワワ',
    emoji: '🐶',
    puppyWeightKg: 0.5,
    adultWeightKg: 2.5,
    description: '世界最小。小さいからだに大きな勇気',
    color: '#F7DC6F',
    visual: {
      earType: 'pointy',
      tailType: 'curl',
      coat: '#DDBA8A',
      coatDark: '#CBA26F',
      coatLight: '#F5E8D2',
      paw: '#EBD3AC',
      hasEyebrows: true,
    },
  },
  {
    id: 'golden',
    name: 'ゴールデンレトリバー',
    emoji: '🦮',
    puppyWeightKg: 4.0,
    adultWeightKg: 30.0,
    description: 'やさしさのかたまり。大型犬デビューに',
    color: '#F0C987',
    visual: {
      earType: 'floppy',
      tailType: 'fluffy',
      coat: '#E6B865',
      coatDark: '#D9A552',
      coatLight: '#F8E7C2',
      paw: '#F0D394',
    },
  },
  {
    id: 'labrador',
    name: 'ラブラドールレトリバー',
    emoji: '🦮',
    puppyWeightKg: 4.0,
    adultWeightKg: 28.0,
    description: '食いしんぼうで陽気。太りやすいので運動を',
    color: '#D7BFA8',
    visual: {
      earType: 'floppy',
      tailType: 'fluffy',
      coat: '#DFC49A',
      coatDark: '#CFAF7F',
      coatLight: '#F3E8D2',
      paw: '#EAD9B8',
    },
  },
  {
    id: 'corgi',
    name: 'ウェルシュコーギー',
    emoji: '🐕',
    puppyWeightKg: 2.0,
    adultWeightKg: 11.0,
    description: '短い足とぷりぷりのおしりが魅力',
    color: '#F5B041',
    visual: {
      earType: 'pointy',
      tailType: 'fluffy',
      coat: '#E89A3C',
      coatDark: '#D6882E',
      coatLight: '#FFF6E5',
      paw: '#F4C88E',
      hasEyebrows: true,
    },
  },
  {
    id: 'dachshund',
    name: 'ミニチュアダックスフンド',
    emoji: '🐕',
    puppyWeightKg: 1.5,
    adultWeightKg: 5.0,
    description: '長い胴で好奇心も長つづき',
    color: '#B5651D',
    visual: {
      earType: 'floppy',
      tailType: 'fluffy',
      coat: '#AD7146',
      coatDark: '#96603A',
      coatLight: '#DDB68C',
      paw: '#C99D6E',
    },
  },
  {
    id: 'pomeranian',
    name: 'ポメラニアン',
    emoji: '🐶',
    puppyWeightKg: 0.7,
    adultWeightKg: 2.5,
    description: 'ふわふわの毛玉。元気いっぱい',
    color: '#FAD7A0',
    visual: {
      earType: 'pointy',
      tailType: 'curl',
      headStyle: 'fluffy',
      bodyStyle: 'fluffy',
      hasBellyPatch: false,
      coat: '#F0BE6C',
      coatDark: '#E2AC55',
      coatLight: '#FBE9CC',
      paw: '#F6D9A4',
    },
  },
  {
    id: 'french_bulldog',
    name: 'フレンチブルドッグ',
    emoji: '🐶',
    puppyWeightKg: 3.0,
    adultWeightKg: 11.0,
    description: 'ぶさかわ担当。いびきもチャームポイント',
    color: '#AEB6BF',
    visual: {
      earType: 'pointy',
      tailType: 'curl',
      coat: '#C9BEB2',
      coatDark: '#B4A899',
      coatLight: '#EBE4DA',
      paw: '#DCD2C5',
    },
  },
  {
    id: 'schnauzer',
    name: 'ミニチュアシュナウザー',
    emoji: '🐕',
    puppyWeightKg: 2.0,
    adultWeightKg: 7.0,
    description: 'りっぱなおひげの小さな紳士',
    color: '#95A5A6',
    visual: {
      earType: 'floppy',
      tailType: 'fluffy',
      coat: '#9BA5AB',
      coatDark: '#86929A',
      coatLight: '#DCE1E4',
      paw: '#C3CBD0',
    },
  },
  {
    id: 'jack_russell',
    name: 'ジャックラッセルテリア',
    emoji: '🐶',
    puppyWeightKg: 1.5,
    adultWeightKg: 6.0,
    description: '運動大好き!体力おばけの遊び相手',
    color: '#EC7063',
    visual: {
      earType: 'floppy',
      tailType: 'fluffy',
      coat: '#F1E8D8',
      coatDark: '#D9C9AF',
      coatLight: '#FFFDF8',
      paw: '#E8DCC6',
    },
  },
  {
    id: 'shih_tzu',
    name: 'シーズー',
    emoji: '🐶',
    puppyWeightKg: 1.2,
    adultWeightKg: 6.5,
    description: 'のんびりマイペースな癒やし系',
    color: '#D2B4DE',
    visual: {
      earType: 'floppy',
      tailType: 'curl',
      bodyStyle: 'fluffy',
      coat: '#D9C7B0',
      coatDark: '#C4AE92',
      coatLight: '#F2EADC',
      paw: '#E6D8C2',
    },
  },
];

/** IDから犬種を探す。万一見つからなければ先頭の犬種を返す */
export function getBreed(id: string): Breed {
  return BREEDS.find((b) => b.id === id) ?? BREEDS[0];
}
