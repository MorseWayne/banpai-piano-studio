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
