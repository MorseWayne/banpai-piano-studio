import { useEffect, useRef, useState } from 'react';
import { noteName, type Note } from './model';
import { Upload } from 'lucide-react';


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
