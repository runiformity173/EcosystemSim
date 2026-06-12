function shuffle(array) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

function fastPower(base, exponent) {
    let result = 1;
    base = BigInt(base);
    let exp = exponent;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = result * base;
        }
        base = base * base;
        exp = exp / 2n; // integer division
    }
    return result;
}
function roundRandom(num) {
    return Math.floor(num) + (Math.random() < num - Math.floor(num));
}
function arrayAdd(arr1,arr2) {
    return arr1.map((o,i)=>o+arr2[i]);
}
function arrayMult(arr,x) {
    return arr.map(o=>o*x);
}
function getNeighbors(row, col) {
    const evenRowOffsets = [
        [-1, -1], [-1, 0],
        [ 0, -1], [ 0, 1],
        [ 1, -1], [ 1, 0]
    ];
    const oddRowOffsets = [
        [-1, 0], [-1, 1],
        [ 0, -1], [ 0, 1],
        [ 1, 0], [ 1, 1]
    ];
    const offsets = (row & 1) ? oddRowOffsets : evenRowOffsets;
    const neighbors = [];
    for (const [dr, dc] of offsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (
            nr >= 0 &&
            nr < GRID_ROWS &&
            nc >= 0 &&
            nc < GRID_COLS
        ) {
            neighbors.push([nr, nc]);
        }
    }

    return neighbors;
}