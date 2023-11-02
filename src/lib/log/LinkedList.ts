export class LinkedListNode<T> {
  public seq: number;
  public data: T;
  public next: LinkedListNode<T> | null = null;

  constructor(seq: number, data: T) {
    this.seq = seq;
    this.data = data;
  }
}

export class LinkedList<T> {
  public head: LinkedListNode<T> | null = null;
  public tail: LinkedListNode<T> | null = null;
  private count = 0;

  size(): number {
    return this.count;
  }

  // Adds a new node to the end of the LinkedList
  add(seq: number, value: T): void {
    const newNode = new LinkedListNode(seq, value);
    if (this.tail === null) {
      // If the list is empty
      this.head = newNode;
      this.tail = newNode;
    } else {
      // If the list contains at least one node
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.count += 1;
  }

  // Removes a node from the LinkedList by sequence number
  remove(seq: number): void {
    if (!this.head) return;

    if (this.head.seq === seq) {
      this.head = this.head.next;
      if (this.head === null) this.tail = null;
      this.count -= 1;
      return;
    }

    let current = this.head;
    while (current.next) {
      if (current.next.seq === seq) {
        current.next = current.next.next;
        if (current.next === null) this.tail = current;
        this.count -= 1;
        return;
      }
      current = current.next;
    }
  }

  /**
   * Immutable mapping function that returns
   * a new array
   */
  map<U>(fn: (value: T) => U): U[] {
    const result: U[] = [];

    let current = this.head;
    while (current) {
      result.push(fn(current.data));
      current = current.next;
    }

    return result;
  }
}
