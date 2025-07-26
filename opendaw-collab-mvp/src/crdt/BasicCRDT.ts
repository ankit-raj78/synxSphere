// BasicCRDT.ts - Minimal CRDT types for one-day implementation

export type Timestamp = number;
export type UserId = string;

// Simple timestamp-based Last-Writer-Wins Register
export class LWWRegister<T> {
  private value: T;
  private timestamp: Timestamp;
  private userId: UserId;

  constructor(initialValue: T, userId: UserId, timestamp: Timestamp = Date.now()) {
    this.value = initialValue;
    this.timestamp = timestamp;
    this.userId = userId;
  }

  // Set new value with automatic conflict resolution
  set(newValue: T, userId: UserId, timestamp: Timestamp = Date.now()): boolean {
    // LWW: Later timestamp wins, tie-break by userId
    if (timestamp > this.timestamp || 
        (timestamp === this.timestamp && userId > this.userId)) {
      this.value = newValue;
      this.timestamp = timestamp;
      this.userId = userId;
      return true; // Value changed
    }
    return false; // No change
  }

  get(): T {
    return this.value;
  }

  getMetadata() {
    return {
      timestamp: this.timestamp,
      userId: this.userId
    };
  }

  // Merge with another LWWRegister
  merge(other: LWWRegister<T>): boolean {
    return this.set(other.value, other.userId, other.timestamp);
  }

  // Serialization for network/database
  toJSON() {
    return {
      value: this.value,
      timestamp: this.timestamp,
      userId: this.userId
    };
  }

  static fromJSON<T>(data: any): LWWRegister<T> {
    const register = new LWWRegister(data.value, data.userId, data.timestamp);
    return register;
  }
}

// Simple Grow-only Set (can only add items, never remove)
export class GSet<T> {
  private elements: Set<T>;

  constructor(initialElements: T[] = []) {
    this.elements = new Set(initialElements);
  }

  // Add element (idempotent)
  add(element: T): boolean {
    const wasNew = !this.elements.has(element);
    this.elements.add(element);
    return wasNew;
  }

  has(element: T): boolean {
    return this.elements.has(element);
  }

  values(): T[] {
    return Array.from(this.elements);
  }

  size(): number {
    return this.elements.size;
  }

  // Merge with another GSet
  merge(other: GSet<T>): boolean {
    let changed = false;
    for (const element of other.elements) {
      if (this.add(element)) {
        changed = true;
      }
    }
    return changed;
  }

  toJSON() {
    return {
      elements: Array.from(this.elements)
    };
  }

  static fromJSON<T>(data: any): GSet<T> {
    return new GSet(data.elements);
  }
}

// Simple Observed-Remove Set (can add and remove)
export class ORSet<T> {
  private added: GSet<{ element: T; id: string }>;
  private removed: GSet<string>;

  constructor() {
    this.added = new GSet();
    this.removed = new GSet();
  }

  // Add element with unique ID
  add(element: T, userId: UserId): string {
    const id = `${userId}-${Date.now()}-${Math.random()}`;
    this.added.add({ element, id });
    return id;
  }

  // Remove element by marking its ID as removed
  remove(elementId: string): boolean {
    return this.removed.add(elementId);
  }

  // Get current elements (added but not removed)
  values(): T[] {
    const result: T[] = [];
    for (const { element, id } of this.added.values()) {
      if (!this.removed.has(id)) {
        result.push(element);
      }
    }
    return result;
  }

  has(element: T): boolean {
    return this.values().includes(element);
  }

  merge(other: ORSet<T>): boolean {
    const addedChanged = this.added.merge(other.added);
    const removedChanged = this.removed.merge(other.removed);
    return addedChanged || removedChanged;
  }

  toJSON() {
    return {
      added: this.added.toJSON(),
      removed: this.removed.toJSON()
    };
  }

  static fromJSON<T>(data: any): ORSet<T> {
    const set = new ORSet<T>();
    set.added = GSet.fromJSON(data.added);
    set.removed = GSet.fromJSON(data.removed);
    return set;
  }
}

// Simple change tracking for efficient synchronization
export interface CRDTChange {
  type: 'lww-set' | 'gset-add' | 'orset-add' | 'orset-remove';
  path: string; // e.g., "regions.uuid-123.startTime"
  data: any;
  timestamp: Timestamp;
  userId: UserId;
}

export class ChangeTracker {
  private changes: CRDTChange[] = [];

  addChange(change: CRDTChange): void {
    this.changes.push(change);
  }

  getChangesSince(timestamp: Timestamp): CRDTChange[] {
    return this.changes.filter(change => change.timestamp > timestamp);
  }

  getLastTimestamp(): Timestamp {
    if (this.changes.length === 0) return 0;
    return Math.max(...this.changes.map(c => c.timestamp));
  }

  clear(): void {
    this.changes = [];
  }

  toJSON() {
    return { changes: this.changes };
  }

  static fromJSON(data: any): ChangeTracker {
    const tracker = new ChangeTracker();
    tracker.changes = data.changes || [];
    return tracker;
  }
}
