import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { NativeMidiClock, sampleNativeClock } from './midiTiming';
export interface MidiPort { id: string; name: string }
export interface MidiMessage {
  data: number[];
  timeMs: number; // Event time in the page's performance.now() clock.
  source: 'midir' | 'web-midi' | 'arrival';
  session: string;
}
interface NativePacket { data: number[]; timestampUs: number; callbackUs: number; session: string }
let access: MIDIAccess | undefined; let current: MIDIInput | undefined; let unlisten: UnlistenFn | undefined;
let activeSession: string | undefined;
let pending = Promise.resolve();
export async function ports(): Promise<MidiPort[]> {
  if(isTauri()) return invoke('midi_ports');
  if(!navigator.requestMIDIAccess) throw new Error('当前浏览器不支持 MIDI。请使用 Windows 桌面版或 Chrome / Edge。');
  access ||= await navigator.requestMIDIAccess({sysex:false});
  return [...access.inputs.values()].filter(p=>p.state==='connected').map(p=>({id:p.id,name:p.name||'MIDI 键盘'}));
}
async function closePort() {
  unlisten?.(); unlisten = undefined;
  if (current) {
    const input = current;
    current = undefined;
    input.onmidimessage = null;
    await input.close();
  }
  if (isTauri()) await invoke('midi_disconnect');
}

// Serialize port ownership. A superseded listener stops accepting packets
// immediately, even if the underlying open/close command is still in flight.
function enqueue(change: () => Promise<void>) {
  const task = pending.then(change);
  pending = task.catch(() => {});
  return task;
}
export function disconnect() {
  activeSession = undefined;
  return enqueue(closePort);
}
export function connect(id: string, callback: (message: MidiMessage) => void) {
  const session = crypto.randomUUID();
  activeSession = session;
  return enqueue(async () => {
    if (activeSession !== session) return;
    await closePort();
    if (activeSession !== session) return;
    if (isTauri()) {
      const clock = new NativeMidiClock(await sampleNativeClock(() => invoke<number>('midi_clock_us')));
      unlisten = await listen<NativePacket>('midi-message', ({ payload }) => {
        if (payload.session !== session || activeSession !== session) return;
        const timeMs = clock.eventTimeMs(payload.timestampUs, payload.callbackUs, performance.now());
        callback({ data: payload.data, timeMs, source: 'midir', session });
      });
      try {
        if (activeSession === session) {
          const startedByUs = await invoke<number | null>('midi_connect', { id, session });
          if (startedByUs !== null) clock.observeOriginBound(startedByUs);
        }
      } catch (error) {
        unlisten(); unlisten = undefined;
        throw error;
      }
      return;
    }
    const input = access?.inputs.get(id);
    if (!input) throw new Error('设备已断开，请重新连接。');
    await input.open();
    current = input;
    input.onmidimessage = event => {
      if (!event.data || activeSession !== session) return;
      const now = performance.now();
      const valid = Number.isFinite(event.timeStamp) && event.timeStamp > 0 && event.timeStamp <= now;
      callback({ data: Array.from(event.data), timeMs: valid ? event.timeStamp : now,
        source: valid ? 'web-midi' : 'arrival', session });
    };
  });
}
