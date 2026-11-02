import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, Annotation, Accidental, Dot } from 'vexflow';
import { noteName, type Note, type Lesson, type Hands } from './model';
import { Upload, Hand as HandIcon } from 'lucide-react';

export function Score({lesson,bar,active,hits,hands,onBar}:{lesson:Lesson;bar:number;active:string[];hits:Set<string>;hands:Hands;onBar:(b:number)=>void}) {
  const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(700);
  useEffect(()=>{const observer=new ResizeObserver(([e])=>setWidth(Math.max(480,e.contentRect.width)));if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{
    if(!ref.current)return;ref.current.replaceChildren();
    const renderer=new Renderer(ref.current,Renderer.Backends.SVG);renderer.resize(width,254);const ctx=renderer.getContext();
    const count=Math.min(2,Math.ceil(lesson.beats/lesson.meter)-bar); const startX=14,barWidth=(width-28)/Math.max(1,count);
    const durMap:Record<number,string>={.25:'16',.5:'8',.75:'8',1:'q',1.5:'q',2:'h',3:'h',4:'w'};
    const formatPitch=(m:number)=> {const names=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];return `${names[m%12]}/${Math.floor(m/12)-1}`;};
    for(let b=0;b<count;b++){
      const start=(bar+b)*lesson.meter;
      const treble=new Stave(startX+b*barWidth,16,barWidth),bass=new Stave(startX+b*barWidth,126,barWidth);
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
  },[lesson,bar,width,active.join(','),hits,hands]);
  return <div className="score-wrap"><div className="bar-labels">{Array.from({length:Math.min(2,Math.ceil(lesson.beats/lesson.meter)-bar)},(_,i)=><button key={i} onClick={()=>onBar(bar+i)} title="从这一小节开始">第 {bar+i+1} 小节</button>)}</div><div className="score-scroll"><div ref={ref} className="score-svg" role="img" aria-label="钢琴五线谱"/></div></div>;
}

export function Keyboard({down,target,onDown,onUp,low=48,high=76}:{down:Set<number>;target:Note[];onDown:(n:number)=>void;onUp:(n:number)=>void;low?:number;high?:number}) {
  const keys=Array.from({length:high-low+1},(_,i)=>low+i);const black=(n:number)=>[1,3,6,8,10].includes(n%12);const whites=keys.filter(n=>!black(n));
  return <div className="piano-scroll"><div className="piano" style={{minWidth:Math.max(480,whites.length*29)}}>
    {keys.map(n=>{const isBlack=black(n),position=keys.filter(k=>k<n&&!black(k)).length;const note=target.find(k=>k.midi===n);
      return <button key={n} aria-label={`${noteName(n)} 琴键`} className={`piano-key ${isBlack?'black':'white'} ${down.has(n)?'pressed':''} ${note?'target '+note.hand:''}`} style={{left:`${(position-(isBlack?.32:0))/whites.length*100}%`,width:`${(isBlack?.64:1)/whites.length*100}%`}}
       onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onDown(n);}} onPointerUp={()=>onUp(n)} onPointerCancel={()=>onUp(n)} onLostPointerCapture={()=>onUp(n)} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();onDown(n);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();onUp(n);}}}>
        {note&&<span className="finger-dot">{note.finger||'•'}</span>}<span className="key-name">{n%12===0?noteName(n):note?'C D E F G A B'.split(' ')[[0,2,4,5,7,9,11].indexOf(n%12)]||'':''}</span>
      </button>;
    })}
  </div></div>;
}

export function Fingering({notes,tip,video,onVideo}:{notes:Note[];tip:string;video:string;onVideo:(f:File)=>void}) {
  return <section className="hand-panel"><div className="panel-heading"><span><HandIcon size={16}/> 指法与动作</span><label className="icon-button upload-video" title="导入本地手部示范"><Upload size={15}/><input type="file" accept="video/*" onChange={e=>{const f=e.target.files?.[0];if(f)onVideo(f);e.target.value='';}}/></label></div>
    {video?<video src={video} controls className="demo-video"/>:<div className="hands-illustration">
      {(['left','right'] as const).map(hand=><div className={`hand-diagram ${hand}`} key={hand}><svg viewBox="0 0 150 150" role="img" aria-label={`${hand==='left'?'左':'右'}手指法示意，1 为拇指，5 为小指`}>
        <path transform={hand==='left'?'translate(150,0) scale(-1,1)':undefined} d="M40 137 L37 109 Q20 91 18 73 Q18 62 27 64 L42 84 L42 36 Q42 25 51 25 Q59 25 59 36 L59 17 Q59 7 68 7 Q77 7 77 17 L77 30 Q77 17 86 17 Q95 17 95 30 L95 44 Q95 33 104 33 Q113 33 113 44 L113 99 Q115 118 107 137" className="hand-outline"/>
        {[{x:26,y:76,f:1},{x:50,y:40,f:2},{x:68,y:22,f:3},{x:86,y:34,f:4},{x:104,y:50,f:5}].map(p=><g key={p.f} className={notes.some(n=>n.hand===hand&&n.finger===p.f)?'finger-active':''}><circle cx={hand==='left'?150-p.x:p.x} cy={p.y} r="10"/><text x={hand==='left'?150-p.x:p.x} y={p.y+4} textAnchor="middle">{p.f}</text></g>)}
      </svg><span>{hand==='left'?'左手':'右手'} <b>{notes.filter(n=>n.hand===hand).map(n=>`${noteName(n.midi)}${n.finger?' · '+n.finger+' 指':''}`).join('、')||'自然休息'}</b></span></div>)}
    </div>}
    <p className="hand-tip">{tip}</p><p className="micro">{video?'本地视频 · 可用播放器控制慢放与重复观看':'指法示意用于落键定位；真实手型请对照教师示范。可上传本地视频。'}</p>
  </section>;
}
