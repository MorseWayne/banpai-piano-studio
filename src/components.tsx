import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Annotation, Accidental, Dot } from 'vexflow';
import { noteName, type Note, type Lesson, type Hands } from './model';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';

export function Score({lesson,focusBar,active,hits,hands,busy,onBrowse,onBar}:{
  lesson:Lesson;focusBar:number;active:string[];hits:Set<string>;hands:Hands;busy:boolean;
  onBrowse:(bar:number)=>void;onBar:(bar:number)=>void;
}) {
  const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(700);
  const total = Math.ceil(lesson.beats / lesson.meter);
  const perPage = width < 570 ? 1 : 2;
  const bar = Math.floor(Math.min(total - 1, focusBar) / perPage) * perPage;
  const count = Math.min(perPage, total - bar);
  useEffect(()=>{const observer=new ResizeObserver(([e])=>setWidth(Math.max(1,Math.floor(e.contentRect.width))));if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    if(!ref.current)return;ref.current.replaceChildren();
    const renderer=new Renderer(ref.current,Renderer.Backends.SVG);renderer.resize(width,222);const ctx=renderer.getContext();
    const startX=16,barWidth=(width-32)/count;
    const durMap:Record<number,string>={.25:'16',.5:'8',.75:'8',1:'q',1.5:'q',2:'h',3:'h',4:'w'};
    const formatPitch=(m:number)=> {const names=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];return `${names[m%12]}/${Math.floor(m/12)-1}`;};
    for(let b=0;b<count;b++){
      const start=(bar+b)*lesson.meter;
      const treble=new Stave(startX+b*barWidth,6,barWidth),bass=new Stave(startX+b*barWidth,116,barWidth);
      if(b===0){treble.addClef('treble').addTimeSignature(`${lesson.meter}/4`);bass.addClef('bass').addTimeSignature(`${lesson.meter}/4`);}
      treble.setContext(ctx).draw();bass.setContext(ctx).draw();new StaveConnector(treble,bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();if(b===0)new StaveConnector(treble,bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
      const allVoices:Voice[]=[];
      for(const hand of ['right','left'] as const){
        const stave=hand==='right'?treble:bass,clef=hand==='right'?'treble':'bass';
        const list=lesson.notes.filter(n=>n.hand===hand&&n.beat>=start&&n.beat<start+lesson.meter);
        let cursor=0; const ticks:StaveNote[]=[];
        const makeRest=(duration:number)=>{let remain=duration;for(const d of [4,3,2,1.5,1,.75,.5,.25])while(remain>=d-.001){const note=new StaveNote({clef,keys:[hand==='right'?'b/4':'d/3'],duration:durMap[d]+'r'});if([.75,1.5,3].includes(d))Dot.buildAndAttach([note],{all:true});note.setStyle({fillStyle:'#adb3b4',strokeStyle:'#adb3b4'});ticks.push(note);remain-=d;}};
        for(const beat of [...new Set(list.map(n=>n.beat))].sort((a,b)=>a-b)){
          const group=list.filter(n=>n.beat===beat).sort((a,b)=>a.midi-b.midi),n=group[0];if(beat-start>cursor)makeRest(beat-start-cursor);
          const note=new StaveNote({clef,keys:group.map(n=>n.spelling||formatPitch(n.midi)),duration:durMap[n.duration]||'q',autoStem:true});
          if([.75,1.5,3].includes(n.duration))Dot.buildAndAttach([note],{all:true});
          group.forEach((n,i)=>{const pitch=n.spelling||formatPitch(n.midi);if(pitch.includes('#'))note.addModifier(new Accidental('#'),i);else if(pitch.split('/')[0].length>1&&pitch.includes('b'))note.addModifier(new Accidental('b'),i);});
          if(n.finger)note.addModifier(new Annotation(String(n.finger)).setVerticalJustification(Annotation.VerticalJustify.TOP),0);
          const selected=group.some(n=>active.includes(n.id));const done=group.every(n=>hits.has(n.id));
          const color=hands!=='both'&&hands!==hand?'#b9bcb9':selected?'#c46b27':done?'#3b8068':hand==='right'?'#344d82':'#71598c';
          note.setStyle({fillStyle:color,strokeStyle:color});ticks.push(note);cursor=beat-start+n.duration;
        }
        if(cursor<lesson.meter)makeRest(lesson.meter-cursor);
        const voice=new Voice({numBeats:lesson.meter,beatValue:4}).setStrict(false).addTickables(ticks);voice.setStave(stave);allVoices.push(voice);
      }
      new Formatter().joinVoices([allVoices[0]]).joinVoices([allVoices[1]]).format(allVoices,barWidth-(b===0?115:35));allVoices[0].draw(ctx,treble);allVoices[1].draw(ctx,bass);
    }
    ref.current.querySelector('svg')?.setAttribute('aria-label',`${lesson.title}，第 ${bar+1} 至 ${bar+count} 小节，钢琴大谱表`);
  },[lesson,bar,count,width,active.join(','),hits,hands]);
  return <section className="sheet" aria-label="练习乐谱">
    <div className="sheet-heading">
      <div className="score-legend"><span><i className="right" />右手</span><span><i className="left" />左手</span><span><i className="target" />目标音</span></div>
      <div className="page-arrows">
        <button className="icon-button" aria-label="上一页乐谱" disabled={busy || bar === 0} onClick={()=>onBrowse(bar-perPage)}><ChevronLeft size={16} /></button>
        <span>{count === 1 ? bar + 1 : `${bar+1}–${bar+count}`} / {total} 小节</span>
        <button className="icon-button" aria-label="下一页乐谱" disabled={busy || bar+count >= total} onClick={()=>onBrowse(bar+count)}><ChevronRight size={16} /></button>
      </div>
    </div>
    <div className="bar-labels">{Array.from({length:count},(_,i)=><button key={bar+i} disabled={busy} onClick={()=>onBar(bar+i)} title="从这一小节开始练习">第 {bar+i+1} 小节</button>)}</div>
    <div ref={ref} className="score-svg" role="img" aria-label="钢琴五线谱"/>
  </section>;
}


export function Fingering({notes,tip,video,onVideo}:{notes:Note[];tip:string;video:string;onVideo:(f:File)=>void}) {
  const [speed, setSpeed] = useState(1);
  const player = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (player.current) player.current.playbackRate = speed; }, [video,speed]);
  return <section className="hand-panel"><div className="panel-title"><h3>指法示范</h3><label className="file-button"><Upload size={14}/>导入视频<input aria-label="导入手部示范视频" type="file" accept="video/*" onChange={e=>{const f=e.target.files?.[0];if(f)onVideo(f);e.target.value='';}}/></label></div>
    {video?<><video ref={player} src={video} controls className="demo-video"/><label className="field-row">示范速度<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option></select></label></>:<div className="hands-illustration">
      {(['left','right'] as const).map(hand=><div className={`hand-diagram ${hand}`} key={hand}><svg viewBox="0 0 150 150" role="img" aria-label={`${hand==='left'?'左':'右'}手指法示意，1 为拇指，5 为小指`}>
        <path transform={hand==='left'?'translate(150,0) scale(-1,1)':undefined} d="M40 137 L37 109 Q20 91 18 73 Q18 62 27 64 L42 84 L42 36 Q42 25 51 25 Q59 25 59 36 L59 17 Q59 7 68 7 Q77 7 77 17 L77 30 Q77 17 86 17 Q95 17 95 30 L95 44 Q95 33 104 33 Q113 33 113 44 L113 99 Q115 118 107 137" className="hand-outline"/>
        {[{x:26,y:76,f:1},{x:50,y:40,f:2},{x:68,y:22,f:3},{x:86,y:34,f:4},{x:104,y:50,f:5}].map(p=><g key={p.f} className={notes.some(n=>n.hand===hand&&n.finger===p.f)?'finger-active':''}><circle cx={hand==='left'?150-p.x:p.x} cy={p.y} r="10"/><text x={hand==='left'?150-p.x:p.x} y={p.y+4} textAnchor="middle">{p.f}</text></g>)}
      </svg><span>{hand==='left'?'左手':'右手'} <b>{notes.filter(n=>n.hand===hand).map(n=>`${noteName(n.midi)}${n.finger?' · '+n.finger+' 指':''}`).join('、')||'自然休息'}</b></span></div>)}
    </div>}
    <p>{tip}</p>
  </section>;
}
