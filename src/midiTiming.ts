// Map the native monotonic clock to performance.now(). The shortest round trip
// gives the tightest bound on the error of the midpoint estimate.
export async function sampleNativeClock(readUs: () => Promise<number>, now = () => performance.now()) {
  let shortestMs = Infinity, offsetMs = 0;
  for (let i = 0; i < 3; i++) {
    const before = now();
    const hostUs = await readUs();
    const after = now();
    if (after - before < shortestMs) {
      shortestMs = after - before;
      offsetMs = (before + after) / 2 - hostUs / 1000;
    }
  }
  return offsetMs;
}

export class NativeMidiClock {
  private deviceToHostMs = Infinity;
  private lastTimestampUs = -1;

  constructor(private hostToPageMs: number) {}

  observeOriginBound(hostUs: number) {
    this.deviceToHostMs = Math.min(this.deviceToHostMs, hostUs / 1000);
  }

  eventTimeMs(timestampUs: number, callbackUs: number, receivedMs: number) {
    // midir guarantees a common origin within a connection. Native callback
    // time is an upper bound on event time, independent of WebView congestion.
    if (timestampUs < this.lastTimestampUs) this.deviceToHostMs = Infinity;
    this.lastTimestampUs = timestampUs;
    this.deviceToHostMs = Math.min(this.deviceToHostMs, (callbackUs - timestampUs) / 1000);
    return Math.min(receivedMs, timestampUs / 1000 + this.deviceToHostMs + this.hostToPageMs);
  }
}

export function inputAudioTime(eventMs: number, receivedMs: number, audioNow: number) {
  // Sample the running audio clock on delivery. Its origin can change relative
  // to page time after AudioContext.suspend()/resume().
  return audioNow - (receivedMs - eventMs) / 1000;
}

export function inputBeat(audioTime: number, start: number, bpm: number, offsetMs: number) {
  return (audioTime - start - offsetMs / 1000) * bpm / 60;
}

// A frozen WebView may deliver neither audio nor lifecycle events until wake.
// A long scheduling gap also makes the last displayed beat the safe resume point.
export class ClockContinuity {
  private available = true;
  constructor(private lastWallMs: number) {}

  observe(wallMs: number, available: boolean) {
    const gap = wallMs - this.lastWallMs;
    const wasAvailable = this.available;
    this.lastWallMs = wallMs;
    this.available = available;
    if (available !== wasAvailable) return available ? 'restored' : 'interrupted';
    if (available && gap >= 2000) return 'gap';
  }
}

export interface TimingMeasurement {
  count: number; medianMs: number; p95Ms: number; jitterMs: number;
  outputMs: number | null; date: string;
}

export class MidiDeliveryWindow {
  private delays: number[] = [];

  record(delayMs: number) {
    if (!Number.isFinite(delayMs) || delayMs < 0) return;
    if (this.delays.length === 128) this.delays.shift();
    this.delays.push(delayMs);
  }

  measure(outputMs: number | null): TimingMeasurement | null {
    if (!this.delays.length) return null;
    const sorted = [...this.delays].sort((a, b) => a - b);
    const percentile = (fraction: number) => sorted[Math.ceil(fraction * sorted.length) - 1];
    const medianMs = percentile(.5), p95Ms = percentile(.95);
    return { count: sorted.length, medianMs, p95Ms, jitterMs: p95Ms - medianMs, outputMs, date: new Date().toISOString() };
  }
}
