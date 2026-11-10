import { expect, it, vi } from 'vitest';
import { connect, disconnect } from './midi';
import { inputAudioTime, inputBeat } from './midiTiming';

const ipc = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: ipc.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/api/event', () => ({ listen: ipc.listen }));

it('drops queued packets from a previous native connection, including while disconnect is pending', async () => {
  const unlisten = vi.fn();
  ipc.listen.mockResolvedValue(unlisten);
  ipc.invoke.mockImplementation(async command => {
    if (command === 'midi_clock_us' || command === 'midi_connect') return performance.now() * 1000;
  });
  const receive = vi.fn();
  await connect('port', receive);
  await connect('port', receive);
  const [oldSession, session] = ipc.invoke.mock.calls
    .filter(([command]) => command === 'midi_connect').map(([, args]) => args.session);
  const [oldListener, listener] = ipc.listen.mock.calls.map(([, callback]) => callback);
  const payload = { data: [0x90, 60, 90], timestampUs: 0, callbackUs: performance.now() * 1000, session: oldSession };
  oldListener({ payload });
  listener({ payload });
  expect(receive).not.toHaveBeenCalled();
  payload.session = session;
  listener({ payload });
  expect(receive).toHaveBeenCalledWith({ data: payload.data, timeMs: expect.any(Number), source: 'midir', session });
  const closing = disconnect();
  listener({ payload });
  await closing;
  expect(receive).toHaveBeenCalledTimes(1);
  expect(unlisten).toHaveBeenCalledTimes(2);
});

it('resamples both native clock origins when the same port reopens after sleep', async () => {
  let pageMs = 500, hostUs = 9000000;
  const now = vi.spyOn(performance, 'now').mockImplementation(() => pageMs);
  ipc.invoke.mockClear();
  ipc.listen.mockClear().mockResolvedValue(() => {});
  ipc.invoke.mockImplementation(async cmd => (cmd === 'midi_clock_us' || cmd === 'midi_connect') ? hostUs : undefined);
  const beats: number[] = [];
  let audioStart = 10;
  try {
    for (let round = 0; round < 2; round++) {
      await connect('port', event => {
        const audioNow = audioStart + .62;
        beats.push(inputBeat(inputAudioTime(event.timeMs, pageMs, audioNow), audioStart, 120, 0));
      });
      const [, { session }] = ipc.invoke.mock.calls.filter(([cmd]) => cmd === 'midi_connect').at(-1)!;
      const [, listener] = ipc.listen.mock.calls.at(-1)!;
      pageMs += 620;
      listener({ payload: { data: [0x90,60,90], timestampUs: 500000, callbackUs: hostUs + 540000, session } });
      await disconnect();
      // The host advanced through sleep while page and audio clocks barely moved.
      pageMs += 100; hostUs += 600000000; audioStart += .9;
    }
    expect(beats).toHaveLength(2);
    beats.forEach(beat => expect(beat).toBeCloseTo(1));
  } finally { now.mockRestore(); await disconnect(); }
});
