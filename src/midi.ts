import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
export interface MidiPort { id: string; name: string }
let access: MIDIAccess | undefined; let current: MIDIInput | undefined; let unlisten: UnlistenFn | undefined;
export async function ports(): Promise<MidiPort[]> {
  if(isTauri()) return invoke('midi_ports');
  if(!navigator.requestMIDIAccess) throw new Error('当前浏览器不支持 MIDI。请使用 Windows 桌面版或 Chrome / Edge。');
  access ||= await navigator.requestMIDIAccess({sysex:false});
  return [...access.inputs.values()].filter(p=>p.state==='connected').map(p=>({id:p.id,name:p.name||'MIDI 键盘'}));
}
export async function disconnect() { unlisten?.();unlisten=undefined;if(current){current.onmidimessage=null;await current.close();current=undefined;}if(isTauri())await invoke('midi_disconnect'); }
export async function connect(id:string, callback:(bytes:number[])=>void) {
  await disconnect();
  if(isTauri()) {unlisten=await listen<{data:number[]}>('midi-message',e=>callback(e.payload.data));try{await invoke('midi_connect',{id});}catch(e){unlisten?.();unlisten=undefined;throw e;}return;}
  const input=access?.inputs.get(id); if(!input)throw new Error('设备已断开，请重新连接。');
  await input.open(); current=input; input.onmidimessage=e=>{if(e.data)callback(Array.from(e.data));};
}
