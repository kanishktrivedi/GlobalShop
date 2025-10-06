// DSA utilities: Trie and Merge Sort with complexity notes

// Trie for prefix search
// Time complexity:
// - insert(word): O(L) where L is word length
// - search(prefix): O(L) to traverse, returning node; collecting K matches adds O(total chars in results)
export class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.payloads = []; // store associated data (e.g., product ids)
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, payload) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
    if (payload !== undefined) node.payloads.push(payload);
  }

  #traverse(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch);
    }
    return node;
  }

  suggest(prefix, limit = 8) {
    const start = this.#traverse(prefix);
    if (!start) return [];
    const out = [];
    const stack = [[start, prefix]];
    while (stack.length && out.length < limit) {
      const [node, path] = stack.pop();
      if (node.isEnd) out.push({ word: path, payloads: node.payloads.slice() });
      // DFS over children
      for (const [ch, child] of node.children) {
        stack.push([child, path + ch]);
      }
    }
    return out;
  }
}

// Merge sort for stable O(n log n) sorting
// Time complexity:
// - mergeSort: O(n log n) time, O(n) space
export function mergeSort(arr, comparator) {
  if (arr.length <= 1) return arr.slice();
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), comparator);
  const right = mergeSort(arr.slice(mid), comparator);
  return merge(left, right, comparator || defaultComparator);
}

function defaultComparator(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function merge(left, right, comparator) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (comparator(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  while (i < left.length) result.push(left[i++]);
  while (j < right.length) result.push(right[j++]);
  return result;
}


