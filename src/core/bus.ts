export type Unsubscribe = () => void;

export type BusHandler<T> = (event: T) => void;

/**
 * Minimal in-memory pub/sub bus.
 * Useful for wiring services -> streams -> SSE without committing to a broker yet.
 */
export class EventBus<
  Events extends Record<string, unknown> = Record<string, unknown>,
> {
  private handlers = new Map<keyof Events & string, Set<BusHandler<unknown>>>();

  subscribe<K extends keyof Events & string>(
    topic: K,
    handler: BusHandler<Events[K]>,
  ): Unsubscribe {
    const set = this.handlers.get(topic) ?? new Set<BusHandler<unknown>>();
    set.add(handler as BusHandler<unknown>);
    this.handlers.set(topic, set);

    return () => {
      const current = this.handlers.get(topic);
      if (!current) return;
      current.delete(handler as BusHandler<unknown>);
      if (current.size === 0) this.handlers.delete(topic);
    };
  }

  publish<K extends keyof Events & string>(topic: K, event: Events[K]): void {
    const set = this.handlers.get(topic);
    if (!set) return;
    for (const handler of set) handler(event);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const bus = new EventBus();
