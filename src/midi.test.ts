import { expect, it, vi } from 'vitest';
import { connect, disconnect } from './midi';

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
