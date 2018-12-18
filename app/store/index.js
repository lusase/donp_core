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
  get(id) {
    return this.store.get(id)
  }
  clear() {
    this.store.clear()
  }
  find(gift) {
    if (!gift) return null
    return this.get(gift.id)
  }
}

exports.giftStore = new GiftTypeStore()