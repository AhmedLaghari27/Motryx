import type { Transport } from '../transports/Transport';
import { ResponseFramer } from './framing';
import { classifyResponse, type CommandResult } from './responses';

export type ClientOptions = {
  defaultTimeoutMs?: number;
  /** How long to wait for the adapter to settle after a timed-out command. */
  resyncTimeoutMs?: number;
};

type Outcome = { kind: 'response'; raw: string } | { kind: 'timeout' } | { kind: 'closed' };

const failed = (error: 'DISCONNECTED' | 'TIMEOUT'): CommandResult => ({ ok: false, error, lines: [] });

/**
 * Sends ELM327 commands one at a time and returns typed results. Many callers can call send()
 * at once: commands are queued so the adapter is never flooded and replies are never mixed up.
 */
export class Elm327Client {
  private readonly transport: Transport;
  private readonly options: ClientOptions;
  private readonly framer = new ResponseFramer();
  private readonly unsubscribe: () => void;
  private waiter: ((outcome: Outcome) => void) | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private closed = false;
  private needsResync = false;

  constructor(transport: Transport, options: ClientOptions = {}) {
    this.transport = transport;
    this.options = options;
    this.unsubscribe = transport.onData((chunk) => this.handleChunk(chunk));
  }

  send(command: string, opts: { timeoutMs?: number } = {}): Promise<CommandResult> {
    const timeoutMs = opts.timeoutMs ?? this.options.defaultTimeoutMs ?? 3000;
    const job = this.chain.then(() => this.execute(command, timeoutMs));
    this.chain = job.catch(() => undefined);
    return job;
  }

  /** Stops listening and fails anything still waiting. Safe to call more than once. */
  dispose(): void {
    this.closed = true;
    this.unsubscribe();
    this.releaseWaiter();
  }

  private handleChunk(chunk: string): void {
    for (const raw of this.framer.push(chunk)) {
      const waiter = this.waiter;
      this.waiter = null;
      waiter?.({ kind: 'response', raw }); // replies nobody asked for are ignored
    }
  }

  private releaseWaiter(): void {
    const waiter = this.waiter;
    this.waiter = null;
    waiter?.({ kind: 'closed' });
  }

  private awaitOutcome(timeoutMs: number): Promise<Outcome> {
    return new Promise<Outcome>((resolve) => {
      const waiter = (outcome: Outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      };
      const timer = setTimeout(() => {
        if (this.waiter === waiter) this.waiter = null;
        resolve({ kind: 'timeout' });
      }, timeoutMs);
      this.waiter = waiter;
    });
  }

  private async execute(command: string, timeoutMs: number): Promise<CommandResult> {
    if (this.closed) return failed('DISCONNECTED');
    if (this.needsResync) await this.resync();
    if (this.closed) return failed('DISCONNECTED');

    this.framer.reset();
    const pending = this.awaitOutcome(timeoutMs); // armed before writing, so a fast reply is never missed
    try {
      await this.transport.write(`${command}\r`);
    } catch {
      this.releaseWaiter();
      return failed('DISCONNECTED');
    }

    const outcome = await pending;
    if (outcome.kind === 'closed') return failed('DISCONNECTED');
    if (outcome.kind === 'timeout') {
      this.needsResync = true; // a late reply must not be mistaken for the next command's answer
      return failed('TIMEOUT');
    }
    return classifyResponse(outcome.raw, command);
  }

  /** After a timeout: interrupt the adapter and discard whatever it says until it is ready again. */
  private async resync(): Promise<void> {
    this.needsResync = false;
    const pending = this.awaitOutcome(this.options.resyncTimeoutMs ?? 1000);
    try {
      await this.transport.write('\r');
    } catch {
      this.releaseWaiter();
      return;
    }
    await pending;
    this.framer.reset();
  }
}
