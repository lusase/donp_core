class GiftTypeStore {
  constructor() {
    this.store = new Map()
  }
  // gift: {id:number name: string pc: number, type}
  add(gift) {
    if (!gift)
      return false
    this.store.set(gift.id, gift)
  }
  clear() {
    this.store.clear()
  }
  find(gift) {
    if (!gift) return null
    return this.store.get(gift.id)
  }
}

exports.giftStore = new GiftTypeStore()