type Voice = { source: AudioBufferSourceNode; gain: GainNode; released: boolean; pitch: number; user: boolean };
const samples = [{n:'C2',m:36},{n:'Fs2',m:42},{n:'C3',m:48},{n:'Fs3',m:54},{n:'C4',m:60},{n:'Fs4',m:66},{n:'C5',m:72},{n:'Fs5',m:78},{n:'C6',m:84}];
export class PianoAudio {
  context?: AudioContext; master?: GainNode; buffers = new Map<number,AudioBuffer>(); voices = new Set<Voice>();
  live = new Map<number, Voice>(); held = new Set<number>(); sustain = false; loading?: Promise<void>; volume = .55;
  get now() { return this.context?.currentTime || 0; }
  get latency() { return Math.round(((this.context?.baseLatency || 0) + (this.context?.outputLatency || 0)) * 1000); }
  async init() {
    if (!this.context) { this.context = new AudioContext({latencyHint:'interactive'}); this.master = this.context.createGain(); this.master.gain.value=this.volume; this.master.connect(this.context.destination); }
    await this.context.resume();
    if (!this.loading) this.loading = Promise.all(samples.map(async s => {
      const response = await fetch(`/samples/${s.n}.mp3`); if (!response.ok) throw new Error('钢琴音色加载失败，请重启应用。');
      this.buffers.set(s.m, await this.context!.decodeAudioData(await response.arrayBuffer()));
    })).then(() => {}).catch(e => { this.loading=undefined; throw e; });
    await this.loading;
  }
  setVolume(v: number) { this.volume=v; this.master?.gain.setTargetAtTime(v,this.now,.03); }
  play(pitch: number, velocity=90, at=this.now, duration?: number, user=false) {
    if (!this.context || !this.master || !this.buffers.size) return;
    if (user) { const old = this.live.get(pitch); if(old) this.release(old); this.held.add(pitch); }
    const nearest = [...this.buffers.keys()].sort((a,b)=>Math.abs(a-pitch)-Math.abs(b-pitch))[0];
    const source=this.context.createBufferSource(), gain=this.context.createGain();
    source.buffer=this.buffers.get(nearest)!; source.playbackRate.value=2**((pitch-nearest)/12);
    const strength=Math.max(.02,velocity/127)*.7; gain.gain.value=strength;
    source.connect(gain); gain.connect(this.master);
    const voice={source,gain,released:false,pitch,user}; this.voices.add(voice); if(user)this.live.set(pitch,voice);
    source.onended=()=>{this.voices.delete(voice); if(this.live.get(pitch)===voice)this.live.delete(pitch); source.disconnect(); gain.disconnect();};
    source.start(Math.max(at,this.now));
    if(duration !== undefined) this.release(voice,at+duration);
  }
  release(voice: Voice, at=this.now) {
    if(voice.released)return; voice.released=true;
    voice.gain.gain.setTargetAtTime(.0001,Math.max(at,this.now),.09); voice.source.stop(Math.max(at,this.now)+.65);
  }
  off(pitch: number) { this.held.delete(pitch); const v=this.live.get(pitch); if(v&&!this.sustain)this.release(v); }
  pedal(on: boolean) { this.sustain=on; if(!on)for(const [pitch,v]of this.live)if(!this.held.has(pitch))this.release(v); }
  click(at: number, strong: boolean, level: number, sub=false) {
    if(!this.context||!this.master)return;
    const oscillator=this.context.createOscillator(), gain=this.context.createGain();
    oscillator.frequency.value=sub?640:strong?1200:850; gain.gain.setValueAtTime(Math.max(.0001,level*.24),at); gain.gain.exponentialRampToValueAtTime(.0001,at+.045);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(at); oscillator.stop(at+.05);
    this.clicks.add(oscillator); oscillator.onended=()=>{this.clicks.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  }
  clicks = new Set<OscillatorNode>();
  stop() { for(const v of this.voices){try{v.source.stop();}catch{/* already ended */}} for(const o of this.clicks){try{o.stop();}catch{/* ended */}}this.voices.clear();this.clicks.clear();this.live.clear();this.held.clear();this.sustain=false; }
}
export const piano = new PianoAudio();
