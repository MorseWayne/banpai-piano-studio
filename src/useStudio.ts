import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { piano } from './audio';
import { decodeMidi, type Attempt, type Lesson, type Note } from './model';
import { loadAttempts, loadPracticeProgress, save } from './storage';
import { mergePracticeProgress } from './progress';
import * as midi from './midi';
import { inputAudioTime } from './midiTiming';
import { PracticeEngine, type Completion, type Settings } from './practiceEngine';
import { LiveValue } from './practiceView';
export type { Settings } from './practiceEngine';
export function useStudio(lesson:Lesson, isImported: boolean) {
  const lastBar = Math.ceil(lesson.beats / lesson.meter) - 1;
  const initialEndBar = isImported ? Math.min(1, lastBar) : lastBar;
  const [settings,setSettings]=useState<Settings>({bpm:lesson.bpm,hands:'both',mode:'wait',metronome:true,clickVolume:.6,subdivisions:false,countIn:1,loop:false,accompaniment:true,startBar:0,endBar:initialEndBar,offset:0,hints:true});
  const [engine] = useState(() => new PracticeEngine(piano));
  const status = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().status);
  const [ready,setReady]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState('先听一遍示范，再按自己的速度开始。');
  const [down] = useState(() => new LiveValue(new Set<number>()));
  const [clickBeat] = useState(() => new LiveValue(-1));
  const [volume,setVolume]=useState(.55);
  const [attempts,setAttempts]=useState<Attempt[]>(loadAttempts),[result,setResult]=useState<Attempt|null>(null);
  const [practiceProgress, setPracticeProgress] = useState(() => mergePracticeProgress(loadPracticeProgress(), attempts));
  const [progressError, setProgressError] = useState('');
  const [devices,setDevices]=useState<midi.MidiPort[]>([]),[device,setDevice]=useState<midi.MidiPort|null>(null),[midiError,setMidiError]=useState('');
  const history = useRef(attempts);
  const inputHeld=useRef(new Map<number,symbol>()),currentDevice=useRef(device),standalone=useRef<{next:number,index:number}|null>(null);
  const [clicking,setClicking]=useState(false);const [pedal,setPedal]=useState(false);const settingsRef=useRef(settings),lessonRef=useRef(lesson);settingsRef.current=settings;lessonRef.current=lesson;currentDevice.current=device;
  const startRef=useRef<(demo?:boolean)=>Promise<void>>(async()=>{}),generation=useRef(0),loopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const callbackRef=useRef<(message:midi.MidiMessage)=>void>(()=>{});
  const midiSince = useRef(0), deviceRequest = useRef(0), audioRequest = useRef(0);
  const busy=status==='counting'||status==='running'||status==='demo';
  async function initialize() {
    const request = ++audioRequest.current, version = generation.current;
    setLoading(true);
    try {
      await piano.init();
      if (request === audioRequest.current) setReady(true);
      return true;
    } catch (e) {
      if (request === audioRequest.current && version === generation.current) setMessage(String(e));
      return false;
    } finally {
      if (request === audioRequest.current) setLoading(false);
    }
  }
  async function previewNotes(notes: Note[]) {
    const version = generation.current;
    if (engine.busy || !await initialize() || version !== generation.current || engine.busy) return;
    const at = piano.now;
    for (const note of notes) piano.play(note.midi, 80, at, Math.min(1.5, note.duration * 60 / settingsRef.current.bpm));
  }
  function clearKeys() {
    midiSince.current = performance.now();
    inputHeld.current.clear(); down.set(new Set()); setPedal(false);
  }
  function stop(clearMessage = true, resetPosition = false) {
    generation.current++;
    clearTimeout(loopTimer.current);
    standalone.current = null;
    setClicking(false); clickBeat.set(-1);
    engine.stop(resetPosition);
    clearKeys();
    if (clearMessage) setMessage('已停止，可以重新开始。');
  }
  function pause() {
    if (!engine.pause()) {
      if (engine.getSnapshot().status !== 'paused') stop(false);
      return;
    }
    generation.current++;
    clearTimeout(loopTimer.current);
    clearKeys();
    setMessage('已保留练习位置。准备好后点“继续练习”。');
  }
  function complete(completion: Completion) {
    clearKeys();
    const { attempt } = completion;
    if (attempt) {
      setResult(attempt);
      const next = [attempt, ...history.current.filter(previous => previous.id !== attempt.id)].slice(0, 200);
      history.current = next;
      setAttempts(next);
      setPracticeProgress(previous => mergePracticeProgress(previous, [attempt]));
      const saved = save('attempts', next);
      setMessage(!saved ? '本机存储空间不足，本次记录尚未保存。'
        : attempt.hit === attempt.total ? '完成这一轮。先放松双手，再决定是否继续。'
        : '这一轮已记录。可以缩短片段或分手再试一次。');
    } else {
      setMessage(completion.demo ? '示范结束。可以先分手、慢速尝试。'
        : '这一轮没有收到演奏输入。连接 MIDI 键盘或使用屏幕琴键再试一次。');
    }
    if (completion.loop) {
      const version = generation.current;
      loopTimer.current = setTimeout(() => {
        if (generation.current === version && settingsRef.current.loop && lessonRef.current.id === completion.lessonId)
          void startRef.current(false);
      }, 700);
    }
  }
  async function resume() {
    if (engine.getSnapshot().status !== 'paused') return;
    const version = generation.current;
    if (!await initialize() || version !== generation.current || engine.getSnapshot().status !== 'paused') return;
    clearKeys();
    const finished = engine.resume();
    if (finished) { complete(finished); return; }
    setMessage(engine.getSnapshot().status === 'running' ? '从刚才的音继续。' : '听完预备拍，从暂停位置继续。');
  }
  async function start(demo = false) {
    stop(false);
    const version = generation.current;
    setResult(null);
    if (!await initialize() || version !== generation.current) return;
    clearKeys();
    if (!engine.start(lessonRef.current, settingsRef.current, demo)) {
      setMessage('这个片段没有所选声部，请切换左右手或小节范围。');
      return;
    }
    setMessage(demo ? '听示范，观察谱面与指法。' : settingsRef.current.mode === 'wait'
      ? '按谱弹奏，弹对后进入下一组。' : '先听预备拍。拍子开始后，保持连续。');
  }
  startRef.current=start;
  function onDown(n:number,source='屏幕琴键',velocity=90,at=piano.now) {
    if(inputHeld.current.has(n))return;
    const press = Symbol();
    inputHeld.current.set(n,press);down.set(new Set(inputHeld.current.keys()));
    if(!ready){void initialize().then(ok=>{if(ok&&inputHeld.current.get(n)===press)piano.play(n,velocity,piano.now,undefined,true);});return;}
    piano.play(n,velocity,piano.now,undefined,true);
    const feedback = engine.press(n, at, source, settingsRef.current.hints);
    if (feedback) setMessage(feedback);
  }
  function releaseNote(n: number, at = piano.now) {
    if (inputHeld.current.delete(n)) down.set(new Set(inputHeld.current.keys()));
    piano.off(n);
    const finished = engine.release(n, at);
    if (finished) complete(finished);
  }
  // The UI piano passes extra event details after the pitch.
  function onUp(n: number) { releaseNote(n); }
  callbackRef.current = message => {
    if (message.timeMs < midiSince.current) return;
    const event = decodeMidi(message.data);
    if (!event) return;
    const at = inputAudioTime(message.timeMs, performance.now(), piano.now);
    if (event.type === 'on') onDown(event.note, 'MIDI', event.value, at);
    else if (event.type === 'off') releaseNote(event.note, at);
    else if (event.type === 'sustain') { piano.pedal(event.value >= 64); setPedal(event.value >= 64); }
    else stop();
  };
  async function refresh() {
    const request = deviceRequest.current;
    try {
      const next = await midi.ports();
      if (request !== deviceRequest.current) return;
      setDevices(next); setMidiError('');
      const d = currentDevice.current;
      if (d && !next.some(p => p.id === d.id)) {
        setDevice(null); stop(false);
        setMessage('MIDI 键盘已断开，练习已暂停。重新连接后再开始。');
        await midi.disconnect();
      }
    } catch (e) { if (request === deviceRequest.current) setMidiError(String(e)); }
  }
  async function connectDevice(id:string) {
    const request = ++deviceRequest.current;
    stop(false); setDevice(null); setMidiError('');
    try {
      await midi.disconnect();
      if (!id || request !== deviceRequest.current) return;
      if (!await initialize() || request !== deviceRequest.current) return;
      await midi.connect(id, message => callbackRef.current(message));
      if (request !== deviceRequest.current) return;
      setDevice(devices.find(d => d.id === id) || { id, name: 'MIDI 键盘' });
      setMessage('键盘已连接。按任意键试听。');
    } catch (e) { if (request === deviceRequest.current) setMidiError(String(e)); }
  }
  async function toggleClick() {
    if (clicking) { stop(false); return; }
    const version = generation.current;
    if (!await initialize() || version !== generation.current) return;
    stop(false);
    standalone.current = { next: piano.now + .1, index: 0 };
    setClicking(true);
  }
  useEffect(() => {
    const interval = setInterval(() => {
      const free = standalone.current, s = settingsRef.current, l = lessonRef.current;
      if (free) {
        while (free.next < piano.now + .1) {
          piano.click(free.next, free.index % l.meter === 0, s.clickVolume);
          free.next += 60 / s.bpm; free.index++;
        }
        clickBeat.set(Math.max(0, free.index - 1) % l.meter);
      }
      const finished = engine.tick();
      if (finished) complete(finished);
    }, 25);
    return () => clearInterval(interval);
  }, [engine]);
  useEffect(() => {
    stop(false, true);
    const parts = new Set(lesson.notes.map(note => note.hand));
    const hands = parts.size === 1 ? lesson.notes[0].hand : 'both';
    setSettings(previous => ({ ...previous, bpm: lesson.bpm, hands, startBar: 0, endBar: initialEndBar }));
    setResult(null);
    setMessage('先听一遍示范，再按自己的速度开始。');
    save('lastLesson', lesson.id);
  }, [lesson.id, initialEndBar]);
  useEffect(()=>{piano.setVolume(volume);},[volume]);
  useEffect(() => {
    setProgressError(save('practiceProgress', practiceProgress) ? '' : '章节练习进度保存失败，请释放本机存储空间后重试。');
  }, [practiceProgress]);
  useEffect(()=>{if(!device)return;const id=setInterval(()=>void refresh(),2500);return()=>clearInterval(id);},[device]);
  useEffect(() => {
    const blur = () => {
      for (const n of [...inputHeld.current.keys()]) onUp(n);
      piano.pedal(false); setPedal(false);
    };
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('blur', blur);
      generation.current++; deviceRequest.current++; audioRequest.current++;
      clearTimeout(loopTimer.current); inputHeld.current.clear();
      engine.stop(); void midi.disconnect();
    };
  }, [engine]);
  return {settings,setSettings,status,ready,loading,message,setMessage,engine,down,clickBeat,volume,setVolume,attempts,practiceProgress,progressError,result,devices,device,midiError,refresh,connectDevice,initialize,previewNotes,start,stop,pause,resume,onDown,onUp,busy,clicking,toggleClick,pedal};
}
