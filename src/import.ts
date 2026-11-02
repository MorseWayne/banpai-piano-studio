import type { Lesson, Note } from './model';
export function importMusicXML(xml: string, filename: string): Lesson {
  if(xml.length>2_000_000)throw new Error('请导入小于 2 MB 的 MusicXML 片段。');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)) xml=xml.replace(/<!DOCTYPE[^>]*>/gi,'');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')||!doc.querySelector('score-partwise'))throw new Error('需要未压缩的 .musicxml 或 .xml 乐谱文件。');
  if(doc.querySelector('repeat, time-modification, grace, tie'))throw new Error('首版暂不支持反复记号、连音线、装饰音和连音组，请先导出简化片段。');
  const parts=[...doc.querySelectorAll('score-partwise > part')];
  if(parts.length>2)throw new Error('请导出钢琴单独声部（最多两个声部）。');
  const notes:Note[]=[];let meter=4,maxBeat=0;
  const value=(node:Element,tag:string,fallback='')=>node.querySelector(tag)?.textContent||fallback;
  for(const [partIndex,part] of parts.entries()) {
    let divisions=1,measureStart=0;
    for(const measure of [...part.querySelectorAll(':scope > measure')]) {
      const division=measure.querySelector('attributes > divisions'); if(division)divisions=Number(division.textContent);
      if(!divisions||divisions<0)throw new Error('乐谱的时值单位无效。');
      const time=measure.querySelector('attributes > time');
      if(time){const beats=Number(value(time,'beats','4')),denom=Number(value(time,'beat-type','4'));if(denom!==4||![3,4].includes(beats))throw new Error('首版导入支持 3/4、4/4 拍。');if(measureStart>0&&meter!==beats)throw new Error('请先导出不变拍号的片段。');meter=beats;}
      let cursor=0,lastStart=0,extent=0;
      for(const child of [...measure.children]) {
        const duration=Number(value(child,'duration','0'))/divisions;
        if(child.tagName==='backup'){cursor-=duration;continue;}
        if(child.tagName==='forward'){cursor+=duration;continue;}
        if(child.tagName!=='note')continue;
        const chord=!!child.querySelector('chord');const start=chord?lastStart:cursor;
        if(![.25,.5,.75,1,1.5,2,3,4].includes(duration)||start<0||start+duration>meter+.001)throw new Error('请使用完整小节，音符时值须在一个小节内。');
        if(!child.querySelector('rest')) {
          const step=value(child,'pitch > step'),octave=Number(value(child,'pitch > octave','-9')),alter=Number(value(child,'pitch > alter','0'));
          const offset:Record<string,number>={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
          const midi=(octave+1)*12+offset[step]+alter;
          if(!Number.isFinite(midi)||midi<21||midi>108||Math.abs(alter)>1)throw new Error('乐谱包含暂不支持的音高。');
          const staff=Number(value(child,'staff','1'));const clef=value(part,'clef > sign','G');
          const hand=staff===2||partIndex===1||(parts.length===1&&clef==='F')?'left':'right';
          const finger=Number(value(child,'notations technical fingering','0'));
          notes.push({id:`import-${notes.length}`,midi,beat:measureStart+start,duration,hand,finger:finger>=1&&finger<=5?finger:undefined,spelling:`${step.toLowerCase()}${alter===-1?'b':alter===1?'#':''}/${octave}`});
        }
        lastStart=start;if(!chord)cursor+=duration;extent=Math.max(extent,start+duration);
      }
      if(extent>meter+.001)throw new Error('小节内容超出拍号，请先检查原谱。');
      measureStart+=meter;maxBeat=Math.max(maxBeat,measureStart);
    }
  }
  if(!notes.length)throw new Error('这份乐谱没有可练习的音符。');
  if(notes.length>512||maxBeat>128)throw new Error('先截取 32 小节以内的钢琴片段再导入。');
  for(const n of notes){if(notes.some(o=>o.id!==n.id&&o.hand===n.hand&&o.beat<n.beat&&o.beat+o.duration>n.beat+.001))throw new Error('首版暂不支持同一只手内交叠的多个声部，请导出简化谱。');if(notes.some(o=>o.hand===n.hand&&o.beat===n.beat&&o.duration!==n.duration))throw new Error('和弦中的各音需要相同时值。');}
  const title=doc.querySelector('work-title, movement-title')?.textContent?.trim()||filename.replace(/\.(musicxml|xml)$/i,'');
  return {id:`import-${Date.now()}`,title,subtitle:'你的本地乐谱 · 可分手练习、选小节循环',stage:'导入的乐谱',bpm:60,beats:maxBeat,meter,notes:notes.sort((a,b)=>a.beat-b.beat),theory:{title:'先读谱，再听，再分手',body:'选一到两个小节，先听示范。分别熟悉每只手的音符和节奏，再以舒适的速度合手。指法以导入谱面为准。',example:'分手 → 慢速合手 → 连贯'},tip:'可导入这段乐句的手部示范视频。未标注指法的音符不会自动猜测指法。',source:`本地导入 · ${filename}`};
}
