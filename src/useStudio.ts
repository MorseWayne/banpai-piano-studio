import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { piano } from './audio';
import { decodeMidi, type Attempt, type Lesson, type Note } from './model';
import { deviceTimingKey, loadAttempts, loadMeasurement, loadOffset, loadPracticeProgress, save } from './storage';
import { mergePracticeProgress } from './progress';
import * as midi from './midi';
import { ClockContinuity, inputAudioTime, MidiDeliveryWindow, type TimingMeasurement } from './midiTiming';
import { PracticeEngine, type Completion, type Settings } from './practiceEngine';
import { LiveValue } from './practiceView';
export type { Settings } from './practiceEngine';
export function useStudio(lesson:Lesson, isImported: boolean) {
  const lastBar = Math.ceil(lesson.beats / lesson.meter) - 1;
  const initialEndBar = isImported ? Math.min(1, lastBar) : lastBar;
  const [settings,setSettings]=useState<Settings>(() => ({bpm:lesson.bpm,hands:'both',mode:'wait',metronome:true,clickVolume:.6,subdivisions:false,countIn:1,loop:false,accompaniment:true,startBar:0,endBar:initialEndBar,offset:loadOffset(),hints:true}));
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
  const inputHeld=useRef(new Map<number,{ offset: number }>()),currentDevice=useRef(device),standalone=useRef<{next:number,index:number}|null>(null);
  const [clicking,setClicking]=useState(false);const [pedal,setPedal]=useState(false);const settingsRef=useRef(settings),lessonRef=useRef(lesson);settingsRef.current=settings;lessonRef.current=lesson;
  const startRef=useRef<(demo?:boolean)=>Promise<void>>(async()=>{}),generation=useRef(0),loopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const callbackRef=useRef<(message:midi.MidiMessage)=>void>(()=>{});
  const midiSince = useRef(0), deviceRequest = useRef(0), audioRequest = useRef(0);
  const desiredPort = useRef<midi.MidiPort | null>(null);
  const checkClock = useRef<() => boolean>(() => true);
  const reopening = useRef<Promise<boolean> | null>(null);
  const delays = useRef(new MidiDeliveryWindow());
  const [measurement, setMeasurement] = useState<TimingMeasurement | null>(null);
  const [timingNotice, setTimingNotice] = useState('');
  const screenOffset = useRef(settings.offset);
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
  async function preparePlayback() {
    if (!await initialize() || !checkClock.current()) return false;
    return !reopening.current || await reopening.current;
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
  function interruptPlayback() {
    generation.current++;
    clearTimeout(loopTimer.current);
    standalone.current = null; setClicking(false); clickBeat.set(-1);
    // The audio clock may have advanced through sleep before the WebView got control.
    if (!engine.pause(engine.getSnapshot().position)) piano.stop();
    clearKeys();
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
    if (!await preparePlayback() || version !== generation.current || engine.getSnapshot().status !== 'paused') return;
    clearKeys();
    const finished = engine.resume();
    if (finished) { complete(finished); return; }
    setMessage(engine.getSnapshot().status === 'running' ? '从刚才的音继续。' : '听完预备拍，从暂停位置继续。');
  }
  async function start(demo = false) {
    stop(false);
    const version = generation.current;
    setResult(null);
    if (!await preparePlayback() || version !== generation.current) return;
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
    if (!checkClock.current()) return;
    if(inputHeld.current.has(n))return;
    const press = { offset: source === 'MIDI' ? settingsRef.current.offset : screenOffset.current };
    inputHeld.current.set(n,press);down.set(new Set(inputHeld.current.keys()));
    if(!ready){void initialize().then(ok=>{if(ok&&inputHeld.current.get(n)===press)piano.play(n,velocity,piano.now,undefined,true);});return;}
    piano.play(n,velocity,piano.now,undefined,true);
    const feedback = engine.press(n, at, source, settingsRef.current.hints, press.offset);
    if (feedback) setMessage(feedback);
  }
  function releaseNote(n: number, at = piano.now) {
    const offset = inputHeld.current.get(n)?.offset;
    if (inputHeld.current.delete(n)) down.set(new Set(inputHeld.current.keys()));
    piano.off(n);
    const finished = engine.release(n, at, offset);
    if (finished) complete(finished);
  }
  // The UI piano passes extra event details after the pitch.
  function onUp(n: number) { if (checkClock.current()) releaseNote(n); }
  callbackRef.current = message => {
    if (!checkClock.current() || reopening.current || message.timeMs < midiSince.current) return;
    const event = decodeMidi(message.data);
    if (!event) return;
    const receivedMs = performance.now();
    if (message.source !== 'arrival' && (event.type === 'on' || event.type === 'off')) {
      delays.current.record(receivedMs - message.timeMs);
    }
    const at = inputAudioTime(message.timeMs, receivedMs, piano.now);
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
        desiredPort.current = null; deviceRequest.current++; selectInput(null); interruptPlayback();
        setMessage('MIDI 键盘已断开，练习已暂停。重新连接后再开始。');
        await midi.disconnect();
      }
    } catch (e) { if (request === deviceRequest.current) setMidiError(String(e)); }
  }
  function selectInput(port: midi.MidiPort | null) {
    currentDevice.current = port;
    setDevice(port);
    const offset = port ? loadOffset(port.id) : screenOffset.current;
    setSettings(previous => ({ ...previous, offset }));
    delays.current = new MidiDeliveryWindow();
    setMeasurement(port ? loadMeasurement(port.id) : null);
    setTimingNotice('');
  }
  async function openInput(port: midi.MidiPort, request: number) {
    try {
      await midi.connect(port.id, message => {
        if (request === deviceRequest.current) callbackRef.current(message);
      });
      if (request !== deviceRequest.current) return false;
      selectInput(port);
      setMidiError('');
      return true;
    } catch (e) {
      if (request === deviceRequest.current) {
        desiredPort.current = null;
        selectInput(null);
        setMidiError(String(e));
        setMessage('MIDI 连接失败，请在设备设置中重新选择键盘。');
      }
      return false;
    }
  }
  async function connectDevice(id:string) {
    const request = ++deviceRequest.current;
    const port = id ? devices.find(d => d.id === id) ?? { id, name: 'MIDI 键盘' } : null;
    desiredPort.current = port;
    reopening.current = null;
    interruptPlayback(); selectInput(null); setMidiError('');
    try {
      await midi.disconnect();
      if (!port || request !== deviceRequest.current) return;
      if (!await initialize()) {
        if (request === deviceRequest.current) desiredPort.current = null;
        return;
      }
      if (request !== deviceRequest.current) return;
      if (await openInput(port, request)) setMessage(engine.getSnapshot().status === 'paused'
        ? '键盘已连接，可从已保留的位置继续练习。' : '键盘已连接。按任意键试听。');
    } catch (e) {
      if (request === deviceRequest.current) {
        desiredPort.current = null; setMidiError(String(e));
      }
    }
  }
  function setOffset(value: number) {
    const id = currentDevice.current?.id;
    if (!id) screenOffset.current = value;
    setSettings(previous => ({ ...previous, offset: value }));
    setTimingNotice(save(deviceTimingKey(id) + ':offset', value) ? '' : '补偿值已在本次会话生效，本机保存失败。');
  }
  function measureTiming() {
    const port = currentDevice.current;
    if (!port) return;
    const output = piano.context?.outputLatency;
    const value = delays.current.measure(typeof output === 'number' && Number.isFinite(output) ? output * 1000 : null);
    if (!value) { setTimingNotice('请先用 MIDI 键盘弹奏几个音，再记录测量。'); return; }
    setMeasurement(value);
    setTimingNotice(save(deviceTimingKey(port.id) + ':measurement', value) ? '测量已保存到此设备。' : '本次测量保存失败。');
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
      if (!checkClock.current()) return;
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
    const context = piano.context;
    if (!ready || !context) return;
    const continuity = new ClockContinuity(Date.now());
    let frozen = false;
    const observe = () => {
      const available = !frozen && context.state === 'running';
      const change = continuity.observe(Date.now(), available);
      if (change === 'interrupted' || change === 'gap') {
        interruptPlayback();
        if (engine.getSnapshot().status === 'paused') {
          setMessage('计时中断，已保留练习位置。准备好后点“继续练习”。');
        }
        deviceRequest.current++;
        reopening.current = null;
        if (desiredPort.current) void midi.disconnect().catch(e => setMidiError(String(e)));
      }
      if (change === 'restored' || change === 'gap') {
        clearKeys();
        const port = desiredPort.current;
        if (port) {
          const task = openInput(port, ++deviceRequest.current);
          reopening.current = task;
          void task.finally(() => { if (reopening.current === task) reopening.current = null; });
        }
      }
      return available;
    };
    const freeze = () => { frozen = true; observe(); };
    const wake = () => { frozen = false; observe(); };
    const hide = (event: PageTransitionEvent) => { if (event.persisted) freeze(); };
    const show = (event: PageTransitionEvent) => { if (event.persisted) wake(); };
    checkClock.current = observe;
    observe();
    context.addEventListener('statechange', observe);
    document.addEventListener('freeze', freeze);
    document.addEventListener('resume', wake);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      checkClock.current = () => true;
      context.removeEventListener('statechange', observe);
      document.removeEventListener('freeze', freeze);
      document.removeEventListener('resume', wake);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [ready, engine]);
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
  return {settings,setSettings,status,ready,loading,message,setMessage,engine,down,clickBeat,volume,setVolume,attempts,practiceProgress,progressError,result,devices,device,midiError,refresh,connectDevice,setOffset,measurement,measureTiming,timingNotice,initialize,previewNotes,start,stop,pause,resume,onDown,onUp,busy,clicking,toggleClick,pedal};
}
