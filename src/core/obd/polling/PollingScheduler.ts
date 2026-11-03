import type { TelemetryStore } from '../../telemetry/TelemetryStore';
import type { Elm327Client } from '../adapter/Elm327Client';
import { hex2 } from '../decoder/mode01';
import { getSensorById, getSensorByPid } from '../pid-registry/registry';
import {
  DEFAULT_INTERVALS,
  baseIntervalMs,
  retryDelayMs,
  staleAfterMs,
  type PollIntervals,
  type PollPriority,
} from './pollConfig';
import { readingFromReply } from './reading';

type CommandSender = Pick<Elm327Client, 'send'>;

export type SchedulerDeps = {
  telemetry: TelemetryStore;
  getClient?: () => CommandSender | null;
  now?: () => number;
  intervals?: PollIntervals;
  timeoutMs?: number;
};

type PidState = { nextDue: number; failures: number; lastOkAt: number | null; gapEma: number | null };

const IDLE_MS = 150;
const SWEEP_EVERY_MS = 500;

/**
 * Asks the car for the values people are looking at, and nothing else.
 * - Only supported PIDs that someone has registered interest in are polled.
 * - Fast-changing sensors are asked for more often; foreground more often than background.
 * - One command at a time (the client queue guarantees it), and failing sensors back off.
 */
export class PollingScheduler {
  private readonly telemetry: TelemetryStore;
  private readonly now: () => number;
  private readonly intervals: PollIntervals;
  private readonly timeoutMs: number;
  private getClient: () => CommandSender | null;
  private supported = new Set<number>();
  private readonly interests = new Map<string, { pids: Set<number>; priority: PollPriority }>();
  private states = new Map<number, PidState>();
  private running = false;
  private loop: Promise<void> | null = null;
  private wake: (() => void) | null = null;
  private lastSweep = 0;

  constructor(deps: SchedulerDeps) {
    this.telemetry = deps.telemetry;
    this.now = deps.now ?? Date.now;
    this.intervals = deps.intervals ?? DEFAULT_INTERVALS;
    this.timeoutMs = deps.timeoutMs ?? 1500;
    this.getClient = deps.getClient ?? (() => null);
  }

  setClientProvider(provider: () => CommandSender | null): void {
    this.getClient = provider;
  }

  /** What the car reported as supported. Anything else is never polled. */
  setSupported(pids: Iterable<number>): void {
    this.supported = new Set(pids);
    this.states = new Map();
    this.kick();
  }

  setInterest(owner: string, pids: Iterable<number>, priority: PollPriority): void {
    this.interests.set(owner, { pids: new Set(pids), priority });
    this.kick();
  }

  clearInterest(owner: string): void {
    if (this.interests.delete(owner)) this.kick();
  }

  /** PIDs being polled right now, with their effective priority. */
  getActive(): Map<number, PollPriority> {
    const active = new Map<number, PollPriority>();
    for (const { pids, priority } of this.interests.values()) {
      for (const pid of pids) {
        if (!this.supported.has(pid) || getSensorByPid(pid) === null) continue;
        if (priority === 'foreground' || !active.has(pid)) active.set(pid, priority);
      }
    }
    return active;
  }

  /** How long a reading for this sensor may age before it counts as stale. */
  staleAfterFor(sensorId: string): number {
    const def = getSensorById(sensorId);
    if (!def) return staleAfterMs(this.intervals.normal, null);
    const priority = this.getActive().get(def.pid) ?? 'background';
    return staleAfterMs(baseIntervalMs(def.pid, priority, this.intervals), this.states.get(def.pid)?.gapEma ?? null);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop = this.run();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.kick();
    await this.loop;
    this.loop = null;
  }

  private kick(): void {
    this.wake?.();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        if (this.wake === done) this.wake = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.wake = done;
    });
  }

  private stateFor(pid: number): PidState {
    let state = this.states.get(pid);
    if (!state) {
      state = { nextDue: 0, failures: 0, lastOkAt: null, gapEma: null };
      this.states.set(pid, state);
    }
    return state;
  }

  private async run(): Promise<void> {
    while (this.running) {
      const now = this.now();
      if (now - this.lastSweep >= SWEEP_EVERY_MS) {
        this.lastSweep = now;
        this.telemetry.markStale(now, (id) => this.staleAfterFor(id));
      }

      const client = this.getClient();
      const active = this.getActive();
      if (!client || active.size === 0) {
        await this.sleep(IDLE_MS);
        continue;
      }

      let next: { pid: number; due: number; priority: PollPriority } | null = null;
      for (const [pid, priority] of active) {
        const due = this.stateFor(pid).nextDue;
        if (!next || due < next.due) next = { pid, due, priority };
      }
      if (!next) continue;

      if (next.due > now) {
        await this.sleep(Math.min(next.due - now, IDLE_MS));
        continue;
      }
      await this.poll(client, next.pid, next.priority);
    }
  }

  private async poll(client: CommandSender, pid: number, priority: PollPriority): Promise<void> {
    const def = getSensorByPid(pid);
    if (!def) return;
    const state = this.stateFor(pid);
    const base = baseIntervalMs(pid, priority, this.intervals);

    const started = this.now();
    const reply = await client.send(`01${hex2(pid)}`, { timeoutMs: this.timeoutMs });
    const finished = this.now();
    const reading = readingFromReply(def, reply, finished);

    if (!reading) {
      state.nextDue = finished + IDLE_MS; // link is down; the connection layer owns that state
      return;
    }

    this.telemetry.set(reading);
    if (reading.status === 'live') {
      state.failures = 0;
      if (state.lastOkAt !== null) {
        const gap = finished - state.lastOkAt;
        state.gapEma = state.gapEma === null ? gap : 0.7 * state.gapEma + 0.3 * gap;
      }
      state.lastOkAt = finished;
      state.nextDue = Math.max(finished, started + base);
    } else {
      state.failures += 1;
      state.lastOkAt = null;
      state.nextDue = finished + retryDelayMs(base, state.failures);
    }
  }
}
