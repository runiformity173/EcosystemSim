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
/**
 * @license MIT
 * @copyright 2020 Eyas Ranjous <eyas.ranjous@gmail.com>
 *
 * @class
 */
class Heap {
  constructor(values, compare, _leaf) {
    if (typeof compare !== 'function') {
      throw new Error('Heap constructor expects a compare function');
    }
    this._compare = compare;
    this._nodes = Array.isArray(values) ? values : [];
    this._leaf = _leaf || null;
    if (this._nodes.length > 0) {
      this.fix();
    }
  }
  toArray() {
    return Array.from(this._nodes);
  }
  _hasLeftChild(parentIndex) {
    const leftChildIndex = (parentIndex * 2) + 1;
    return leftChildIndex < this.size();
  }
  _hasRightChild(parentIndex) {
    const rightChildIndex = (parentIndex * 2) + 2;
    return rightChildIndex < this.size();
  }
  _compareAt(i, j) {
    return this._compare(this._nodes[i], this._nodes[j]);
  }
  _swap(i, j) {
    const temp = this._nodes[i];
    this._nodes[i] = this._nodes[j];
    this._nodes[j] = temp;
  }
  _shouldSwap(parentIndex, childIndex) {
    if (parentIndex < 0 || parentIndex >= this.size()) {
      return false;
    }

    if (childIndex < 0 || childIndex >= this.size()) {
      return false;
    }

    return this._compareAt(parentIndex, childIndex) > 0;
  }
  _compareChildrenOf(parentIndex) {
    if (!this._hasLeftChild(parentIndex) && !this._hasRightChild(parentIndex)) {
      return -1;
    }

    const leftChildIndex = (parentIndex * 2) + 1;
    const rightChildIndex = (parentIndex * 2) + 2;

    if (!this._hasLeftChild(parentIndex)) {
      return rightChildIndex;
    }

    if (!this._hasRightChild(parentIndex)) {
      return leftChildIndex;
    }

    const compare = this._compareAt(leftChildIndex, rightChildIndex);
    return compare > 0 ? rightChildIndex : leftChildIndex;
  }
  _compareChildrenBefore(index, leftChildIndex, rightChildIndex) {
    const compare = this._compareAt(rightChildIndex, leftChildIndex);

    if (compare <= 0 && rightChildIndex < index) {
      return rightChildIndex;
    }

    return leftChildIndex;
  }
  _heapifyUp(startIndex) {
    let childIndex = startIndex;
    let parentIndex = Math.floor((childIndex - 1) / 2);

    while (this._shouldSwap(parentIndex, childIndex)) {
      this._swap(parentIndex, childIndex);
      childIndex = parentIndex;
      parentIndex = Math.floor((childIndex - 1) / 2);
    }
  }
  _heapifyDown(startIndex) {
    let parentIndex = startIndex;
    let childIndex = this._compareChildrenOf(parentIndex);

    while (this._shouldSwap(parentIndex, childIndex)) {
      this._swap(parentIndex, childIndex);
      parentIndex = childIndex;
      childIndex = this._compareChildrenOf(parentIndex);
    }
  }
  _heapifyDownUntil(index) {
    let parentIndex = 0;
    let leftChildIndex = 1;
    let rightChildIndex = 2;
    let childIndex;

    while (leftChildIndex < index) {
      childIndex = this._compareChildrenBefore(
        index,
        leftChildIndex,
        rightChildIndex
      );

      if (this._shouldSwap(parentIndex, childIndex)) {
        this._swap(parentIndex, childIndex);
      }

      parentIndex = childIndex;
      leftChildIndex = (parentIndex * 2) + 1;
      rightChildIndex = (parentIndex * 2) + 2;
    }
  }
  push(value) {
    this._nodes.push(value);
    this._heapifyUp(this.size() - 1);
    if (this._leaf === null || this._compare(value, this._leaf) > 0) {
      this._leaf = value;
    }
    return this;
  }
  pop() {
    if (this.size() === 0) {
      return null;
    }

    const root = this.root();
    this._nodes[0] = this._nodes[this.size() - 1];
    this._nodes.pop();
    this._heapifyDown(0);

    if (root === this._leaf) {
      this._leaf = null;
    }

    return root;
  }
  fix() {
    for (let i = Math.floor(this.size() / 2) - 1; i >= 0; i -= 1) {
      this._heapifyDown(i);
    }
    for (let i = Math.floor(this.size() / 2); i < this.size(); i += 1) {
      const value = this._nodes[i];
      if (this._leaf === null || this._compare(value, this._leaf) > 0) {
        this._leaf = value;
      }
    }
    return this;
  }
  root() {
    if (this.size() === 0) {
      return null;
    }

    return this._nodes[0];
  }
  size() {
    return this._nodes.length;
  }
}