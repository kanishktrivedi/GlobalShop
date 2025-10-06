// Cart module using Map for O(1) ops

export class Cart {
  constructor() {
    this.itemsById = new Map(); // key: productId, value: { id, name, priceBase, currencyBase, qty }
  }

  get size() {
    return this.itemsById.size;
  }

  clear() {
    this.itemsById.clear();
  }

  setItem(product) {
    // product: { id, name, priceBase, currencyBase }
    const existing = this.itemsById.get(product.id);
    if (existing) {
      existing.qty += 1;
      this.itemsById.set(product.id, existing);
      return existing;
    }
    const entry = { ...product, qty: 1 };
    this.itemsById.set(product.id, entry);
    return entry;
  }

  increase(productId) {
    const existing = this.itemsById.get(productId);
    if (!existing) return;
    existing.qty += 1;
    this.itemsById.set(productId, existing);
    return existing;
  }

  decrease(productId) {
    const existing = this.itemsById.get(productId);
    if (!existing) return;
    existing.qty -= 1;
    if (existing.qty <= 0) {
      this.itemsById.delete(productId);
      return null;
    }
    this.itemsById.set(productId, existing);
    return existing;
  }

  remove(productId) {
    this.itemsById.delete(productId);
  }

  updateQty(productId, qty) {
    const existing = this.itemsById.get(productId);
    if (!existing) return;
    const nextQty = Math.max(0, Number(qty) || 0);
    if (nextQty === 0) {
      this.itemsById.delete(productId);
      return null;
    }
    existing.qty = nextQty;
    this.itemsById.set(productId, existing);
    return existing;
  }

  toArray() {
    return Array.from(this.itemsById.values());
  }
}


