// 「もこもこ」の雲形パスをつくる計算。
// トイプードルの頭や耳のような、ふわふわの輪郭に使う。
//
// 仕組み: 楕円のまわりに等間隔で点を打ち、となり同士を
// 外側にふくらむ小さな円弧(A コマンド)でつないでいる。

/**
 * 中心(cx, cy)、横半径rx・縦半径ry の「もこもこ楕円」のSVGパスを返す。
 * @param bumps こぶの数(多いほど細かいもこもこ)
 * @param fluff こぶのふくらみ具合(0でほぼ楕円、大きいほどもこもこ)
 */
export function fluffyPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps = 10,
  fluff = 0.28
): string {
  const points: [number, number][] = [];
  for (let i = 0; i < bumps; i++) {
    const angle = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
  }
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i <= bumps; i++) {
    const [x, y] = points[i % bumps];
    const [prevX, prevY] = points[i - 1];
    // 2点間の距離の半分より少し大きい半径の弧 → 外側にぷくっとふくらむ
    const distance = Math.hypot(x - prevX, y - prevY);
    const arcRadius = (distance / 2) * (1 + fluff);
    d += ` A ${arcRadius.toFixed(1)} ${arcRadius.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + ' Z';
}
