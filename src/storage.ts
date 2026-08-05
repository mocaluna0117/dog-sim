// セーブデータの保存と読み込み。
// AsyncStorage は「アプリを消すまで残る、端末内の小さな保存場所」。
// 文字列しか保存できないので、JSONに変換して出し入れする。

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DogState } from './types';

// 保存データの形を大きく変えたときは v1 → v2 のように変えると、
// 古いデータを読んでアプリが壊れる事故を防げる。
const STORAGE_KEY = 'dog_sim:dog:v1';

/** 保存されている犬を読み込む。いなければ null */
export async function loadDog(): Promise<DogState | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json == null) return null;
    const data = JSON.parse(json) as DogState;
    // 最低限の形チェック(壊れたデータで起動できなくなるのを防ぐ)
    if (typeof data.name !== 'string' || typeof data.lastCareAt !== 'number') {
      return null;
    }
    return data;
  } catch (e) {
    console.warn('セーブデータの読み込みに失敗しました', e);
    return null;
  }
}

/** 犬を保存する */
export async function saveDog(dog: DogState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dog));
  } catch (e) {
    console.warn('セーブデータの保存に失敗しました', e);
  }
}

/** セーブデータを消す(はじめからやり直すとき用) */
export async function clearDog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
