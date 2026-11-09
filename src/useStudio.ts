import { useEffect, useMemo, useRef, useState } from 'react';
import { piano } from './audio';
import { Judge, decodeMidi, groupNotes, matchesHand, type Attempt, type Hands, type Lesson, type Mode, type Note } from './model';
import { loadAttempts, loadPracticeProgress, save } from './storage';
import { mergePracticeProgress } from './progress';
import * as midi from './midi';
export interface Settings { bpm:number; hands:Hands; mode:Mode; metronome:boolean; clickVolume:number; subdivisions:boolean; countIn:number; loop:boolean; accompaniment:boolean; startBar:number; endBar:number; offset:number; hints:boolean }
interface Run { lesson:Lesson; settings:Settings; judge:Judge; notes:Note[]; all:Note[]; start:number; length:number; startBeat:number; resumeBeat:number; demo:boolean; scheduled:number; input:Set<string>; assisted:boolean }
export function useStudio(lesson:Lesson, isImported: boolean) {
  const lastBar = Math.ceil(lesson.beats / lesson.meter) - 1;
  const initialEndBar = isImported ? Math.min(1, lastBar) : lastBar;
  const [settings,setSettings]=useState<Settings>({bpm:lesson.bpm,hands:'both',mode:'wait',metronome:true,clickVolume:.6,subdivisions:false,countIn:1,loop:false,accompaniment:true,startBar:0,endBar:initialEndBar,offset:0,hints:true});
  const [status,setStatus]=useState<'idle'|'counting'|'running'|'demo'|'finished'|'paused'>('idle');
  const [ready,setReady]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState('先听一遍示范，再按自己的速度开始。');
  const [down,setDown]=useState(new Set<number>()),[active,setActive]=useState<string[]>([]),[hits,setHits]=useState(new Set<string>());
  const [beat,setBeat]=useState(-1),[position,setPosition]=useState(0),[volume,setVolume]=useState(.55);
  const [attempts,setAttempts]=useState<Attempt[]>(loadAttempts),[result,setResult]=useState<Attempt|null>(null);
  const [practiceProgress, setPracticeProgress] = useState(() => mergePracticeProgress(loadPracticeProgress(), attempts));
  const [progressError, setProgressError] = useState('');
  const [devices,setDevices]=useState<midi.MidiPort[]>([]),[device,setDevice]=useState<midi.MidiPort|null>(null),[midiError,setMidiError]=useState('');
  const run=useRef<Run|null>(null), inputHeld=useRef(new Map<number,string>()),currentDevice=useRef(device),standalone=useRef<{next:number,index:number}|null>(null);
  const pausedRun = useRef<{ run: Run; beat: number } | null>(null);
  const [clicking,setClicking]=useState(false);const [pedal,setPedal]=useState(false);const settingsRef=useRef(settings),lessonRef=useRef(lesson);settingsRef.current=settings;lessonRef.current=lesson;currentDevice.current=device;
  const startRef=useRef<(demo?:boolean)=>Promise<void>>(async()=>{}),generation=useRef(0),loopTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const callbackRef=useRef<(data:number[])=>void>(()=>{});
  const busy=status==='counting'||status==='running'||status==='demo';
  async function initialize() { setLoading(true);try{await piano.init();setReady(true);return true;}catch(e){setMessage(String(e));return false;}finally{setLoading(false);} }
  async function previewNotes(notes: Note[]) {
    const version = generation.current;
    if (run.current || !await initialize() || version !== generation.current || run.current) return;
    const at = piano.now;
    for (const note of notes) piano.play(note.midi, 80, at, Math.min(1.5, note.duration * 60 / settingsRef.current.bpm));
  }
  function stop(clearMessage=true) {generation.current++;clearTimeout(loopTimer.current);run.current=null;pausedRun.current=null;standalone.current=null;setClicking(false);piano.stop();inputHeld.current.clear();setDown(new Set());setPedal(false);setStatus('idle');setBeat(-1);setActive([]);if(clearMessage)setMessage('已停止，可以重新开始。');}
  function pause() {
    const current = run.current;
    if (!current) { if (!pausedRun.current) stop(false); return; }
    generation.current++;
    clearTimeout(loopTimer.current);
    const beat = current.settings.mode === 'wait' && !current.demo
      ? current.judge.current[0]?.beat ?? current.length
      : Math.max(current.resumeBeat, Math.min(current.length, (piano.now - current.start) * current.settings.bpm / 60));
    pausedRun.current = { run: current, beat };
    current.assisted = true;
    run.current = null;
    // Pausing interrupts held notes. Resume judges the remaining attacks and
    // excludes the interrupted note releases from duration feedback.
    current.judge.pending.clear();
    current.judge.held.clear();
    current.judge.groupPressed.clear();
    const remaining = current.settings.mode === 'wait' && !current.demo ? current.judge.current
      : groupNotes(current.notes).find(group => group.some(note => note.beat + note.duration > beat));
    setActive((remaining ?? []).map(note => note.id));
    piano.stop(); inputHeld.current.clear(); setDown(new Set()); setPedal(false);
    setPosition(current.startBeat + beat); setStatus('paused'); setBeat(-1);
    setMessage('已保留练习位置。准备好后点“继续练习”。');
  }
  function scheduleAudio(current: Run, from: number) {
    const seconds = 60 / current.settings.bpm;
    for (const note of current.all) {
      if (note.beat + note.duration <= from) continue;
      if (current.demo || (current.settings.accompaniment && current.settings.hands !== 'both' && !matchesHand(note, current.settings.hands))) {
        const onset = Math.max(note.beat, from);
        piano.play(note.midi, note.hand === 'left' ? 60 : 85, current.start + onset * seconds, (note.beat + note.duration - onset) * seconds * .94);
      }
    }
  }
  async function resume() {
    const saved = pausedRun.current;
    if (!saved) return;
    const version = generation.current;
    if (!await initialize() || version !== generation.current || pausedRun.current !== saved) return;
    piano.stop(); inputHeld.current.clear(); setDown(new Set());
    const current = saved.run;
    if (saved.beat >= current.length) {
      pausedRun.current = null;
      finish(current);
      return;
    }
    const wait = current.settings.mode === 'wait' && !current.demo;
    const countIn = wait ? 0 : current.settings.countIn * current.lesson.meter;
    current.resumeBeat = saved.beat;
    current.start = piano.now + .12 + (countIn - saved.beat) * 60 / current.settings.bpm;
    const step = current.settings.subdivisions ? .5 : 1;
    current.scheduled = Math.ceil(saved.beat / step) * step;
    for (let index = 0; index < countIn; index++) {
      piano.click(piano.now + .12 + index * 60 / current.settings.bpm, index % current.lesson.meter === 0, current.settings.clickVolume);
    }
    pausedRun.current = null; run.current = current;
    setStatus(wait ? 'running' : 'counting');
    setMessage(wait ? '从刚才的音继续。' : '听完预备拍，从暂停位置继续。');
    if (!wait) scheduleAudio(current, saved.beat);
  }
  function finish(r:Run) {
    r.judge.finish(r.length);run.current=null;piano.stop();inputHeld.current.clear();setDown(new Set());setStatus('finished');setActive([]);setBeat(-1);
    if(!r.demo&&r.input.size){const a:Attempt={id:crypto.randomUUID(),date:new Date().toISOString(),lessonId:r.lesson.id,title:r.lesson.title,bpm:r.settings.bpm,mode:r.settings.mode,hands:r.settings.hands,hit:r.judge.hits.size,total:r.notes.length,wrong:r.judge.wrong,early:r.judge.early,late:r.judge.late,durationErrors:r.judge.durationErrors,input:[...r.input].join(' / '),assisted:r.assisted,fullLesson:r.notes.length===r.lesson.notes.length};
      setResult(a);setAttempts(prev=>{const next=[a,...prev].slice(0,200);if(!save('attempts',next))setMessage('本机存储空间不足，本次记录尚未保存。');return next;});
      setPracticeProgress(previous => mergePracticeProgress(previous, [a]));
      setMessage(a.hit===a.total?'完成这一轮。先放松双手，再决定是否继续。':'这一轮已记录。可以缩短片段或分手再试一次。');
    }else setMessage(r.demo?'示范结束。可以先分手、慢速尝试。':'这一轮没有收到演奏输入。连接 MIDI 键盘或使用屏幕琴键再试一次。');
    if(r.settings.loop&&!r.demo){loopTimer.current=setTimeout(()=>{if(!run.current&&settingsRef.current.loop&&lessonRef.current.id===r.lesson.id)void startRef.current(false);},700);}
  }
  async function start(demo=false) {
    stop(false);const version=generation.current;setResult(null);if(!await initialize()||version!==generation.current)return;
    const s={...settingsRef.current},l=lessonRef.current;
    const startBeat=s.startBar*l.meter,length=(s.endBar-s.startBar+1)*l.meter;
    const all=l.notes.filter(n=>n.beat>=startBeat&&n.beat<startBeat+length).map(n=>({...n,beat:n.beat-startBeat}));
    const selected=all.filter(n=>matchesHand(n,s.hands));
    if(!selected.length){setMessage('这个片段没有所选声部，请切换左右手或小节范围。');return;}
    const wait=!demo&&s.mode==='wait';
    const startTime=piano.now+.12+(wait?0:s.countIn*l.meter*60/s.bpm);
    const r:Run={lesson:l,settings:s,notes:selected,all,judge:new Judge(selected,s.mode),start:startTime,length,startBeat,resumeBeat:0,demo,scheduled:-s.countIn*l.meter,input:new Set(),assisted:s.hints};run.current=r;
    setHits(new Set());setPosition(startBeat);setStatus(wait?'running':'counting');setMessage(demo?'听示范，观察谱面与指法。':wait?'按谱弹奏，弹对后进入下一组。':'先听预备拍。拍子开始后，保持连续。');
    setActive(wait?r.judge.current.map(n=>n.id):[]);
    if(!wait) scheduleAudio(r, 0);
  }
  startRef.current=start;
  function onDown(n:number,source='屏幕琴键',velocity=90) {
    if(inputHeld.current.has(n))return;
    inputHeld.current.set(n,source);setDown(new Set(inputHeld.current.keys()));
    if(!ready){void initialize().then(ok=>{if(ok&&inputHeld.current.has(n))piano.play(n,velocity,piano.now,undefined,true);});return;}
    piano.play(n,velocity,piano.now,undefined,true);
    const r=run.current;if(!r||r.demo||(r.settings.mode==='wait'&&!r.judge.current.length))return;
    const currentBeat=(piano.now-r.start)*r.settings.bpm/60-r.settings.offset/1000*r.settings.bpm/60;
    if(r.settings.mode==='rhythm'&&(currentBeat<r.resumeBeat-.15||currentBeat>=r.length+.4))return;
    r.assisted ||= settingsRef.current.hints;r.input.add(source);const verdict=r.judge.on(n,currentBeat);setHits(new Set(r.judge.hits));
    if(verdict==='wrong')setMessage(r.settings.mode==='wait'?'音高有偏差，请看谱再试一次。':'继续跟着拍子走，结束后再回顾。');
    if(r.settings.mode==='wait') {setActive(r.judge.current.map(n=>n.id));if(r.judge.current.length){setPosition(r.startBeat+r.judge.current[0].beat);if(verdict==='correct')setMessage('找到了。松开琴键，继续下一组。');}else setMessage('最后一个音找到了。自然松开琴键，完成这一轮。');}
  }
  function onUp(n:number) {inputHeld.current.delete(n);setDown(new Set(inputHeld.current.keys()));piano.off(n);const r=run.current;if(r&&!r.demo){r.judge.off(n,(piano.now-r.start)*r.settings.bpm/60-r.settings.offset/1000*r.settings.bpm/60);if(r.settings.mode==='wait'&&!r.judge.current.length&&!inputHeld.current.size)finish(r);}}
  callbackRef.current=(data)=>{const event=decodeMidi(data);if(!event)return;if(event.type==='on')onDown(event.note,'MIDI',event.value);else if(event.type==='off')onUp(event.note);else if(event.type==='sustain'){piano.pedal(event.value>=64);setPedal(event.value>=64);}else stop();};
  async function refresh(){try{const next=await midi.ports();setDevices(next);setMidiError('');const d=currentDevice.current;if(d&&!next.some(p=>p.id===d.id)){await midi.disconnect();setDevice(null);stop(false);setMessage('MIDI 键盘已断开，练习已暂停。重新连接后再开始。');}}catch(e){setMidiError(String(e));}}
  async function connectDevice(id:string){try{stop(false);await midi.disconnect();setDevice(null);if(!id)return;if(!await initialize())return;await midi.connect(id,data=>callbackRef.current(data));const port=devices.find(d=>d.id===id);setDevice(port||{id,name:'MIDI 键盘'});setMidiError('');setMessage('键盘已连接。按任意键试听。');}catch(e){setMidiError(String(e));}}
  async function toggleClick(){if(clicking){standalone.current=null;piano.stop();setClicking(false);setBeat(-1);return;}if(!await initialize())return;stop(false);standalone.current={next:piano.now+.1,index:0};setClicking(true);}
  useEffect(()=>{const interval=setInterval(()=>{
    const free=standalone.current,s=settingsRef.current,l=lessonRef.current;
    if(free){while(free.next<piano.now+.1){piano.click(free.next,free.index%l.meter===0,s.clickVolume);free.next+=60/s.bpm;free.index++;}setBeat(Math.max(0,free.index-1)%l.meter);}
    const r=run.current;if(!r||(!r.demo&&r.settings.mode==='wait'))return;
    const t=(piano.now-r.start)*r.settings.bpm/60,step=r.settings.subdivisions?.5:1;
    while(r.scheduled<=t+.15*r.settings.bpm/60&&r.scheduled<r.length){const at=r.start+r.scheduled*60/r.settings.bpm;if((r.settings.metronome||r.scheduled<r.resumeBeat)&&at>=piano.now-.02)piano.click(Math.max(at,piano.now),Math.abs(r.scheduled%r.lesson.meter)<.001,r.settings.clickVolume,r.scheduled%1!==0);r.scheduled+=step;}
    const displayBeat = t < r.resumeBeat ? t - r.resumeBeat + r.settings.countIn * r.lesson.meter : t;
    setStatus(t<r.resumeBeat?'counting':r.demo?'demo':'running');setBeat(((Math.floor(displayBeat)%r.lesson.meter)+r.lesson.meter)%r.lesson.meter);setPosition(r.startBeat+Math.max(r.resumeBeat,t));
    if(t>=r.resumeBeat){const ids=r.notes.filter(n=>n.beat<=t&&n.beat+n.duration>t).map(n=>n.id);setActive(prev=>prev.join(',')===ids.join(',')?prev:ids);}
    if(t>=r.length+.45)finish(r);
  },25);return()=>clearInterval(interval);},[]);
  useEffect(() => {
    stop(false);
    const parts = new Set(lesson.notes.map(note => note.hand));
    const hands = parts.size === 1 ? lesson.notes[0].hand : 'both';
    setSettings(previous => ({ ...previous, bpm: lesson.bpm, hands, startBar: 0, endBar: initialEndBar }));
    setPosition(0); setHits(new Set()); setResult(null);
    setMessage('先听一遍示范，再按自己的速度开始。');
    save('lastLesson', lesson.id);
  }, [lesson.id, initialEndBar]);
  useEffect(()=>{piano.setVolume(volume);},[volume]);
  useEffect(() => {
    setProgressError(save('practiceProgress', practiceProgress) ? '' : '章节练习进度保存失败，请释放本机存储空间后重试。');
  }, [practiceProgress]);
  useEffect(()=>{if(!device)return;const id=setInterval(()=>void refresh(),2500);return()=>clearInterval(id);},[device]);
  useEffect(()=>{const blur=()=>{if(inputHeld.current.size){for(const n of [...inputHeld.current.keys()])onUp(n);}piano.pedal(false);setPedal(false);};window.addEventListener('blur',blur);return()=>{window.removeEventListener('blur',blur);generation.current++;clearTimeout(loopTimer.current);piano.stop();void midi.disconnect();};},[]);
  const target = useMemo(() => status === 'idle' || (status === 'counting' && !active.length)
    ? groupNotes(lesson.notes.filter(note => matchesHand(note, settings.hands)
      && note.beat >= settings.startBar * lesson.meter && note.beat < (settings.endBar + 1) * lesson.meter))[0] || []
    : lesson.notes.filter(note => active.includes(note.id)), [lesson, active, status, settings.hands, settings.startBar, settings.endBar]);
  return {settings,setSettings,status,ready,loading,message,setMessage,down,target,hits,beat,position,volume,setVolume,attempts,practiceProgress,progressError,result,devices,device,midiError,refresh,connectDevice,initialize,previewNotes,start,stop,pause,resume,onDown,onUp,busy,clicking,toggleClick,pedal};
}
