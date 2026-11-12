import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, Headphones, Music2, Play, Square } from 'lucide-react';
import { Score } from './Score';
import { Keyboard } from './Keyboard';
import { cleanFirstRead, echoSteps, guidedScores, loadEchoProgress, transferScores } from './echoCourse';
import { save } from './storage';
import type { Attempt, Lesson, Mode } from './model';
import type { useStudio } from './useStudio';
import './echoWorkshop.css';

type Studio = ReturnType<typeof useStudio>;
const computerKeys: Record<string, number> = { KeyZ: 48, KeyX: 50, KeyA: 60, KeyS: 62, KeyD: 64 };

function MusicDesk({ studio, score, step, firstBar, browse, setBrowse }: {
  studio: Studio; score: Lesson; step: number; firstBar: number; browse: number; setBrowse: (bar: number) => void;
}) {
  const { engine } = studio;
  const activeIds = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().active);
  const hits = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().hits);
  const down = useSyncExternalStore(studio.down.subscribe, studio.down.getSnapshot);
  const following = studio.busy || studio.status === 'paused';
  const active = step === 4 ? [] : score.notes.filter(n => activeIds.includes(n.id));
  const live = useRef(studio);
  live.current = studio;
  useEffect(() => {
    const held = new Set<string>();
    function keydown(event: KeyboardEvent) {
      const pitch = computerKeys[event.code];
      if (pitch === undefined || event.ctrlKey || event.altKey || event.metaKey || event.repeat ||
        document.querySelector('[role="dialog"]') || (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable=true]'))) return;
      if (live.current.status !== 'running') return;
      event.preventDefault(); held.add(event.code); live.current.onDown(pitch, '电脑键盘');
    }
    function keyup(event: KeyboardEvent) {
      if (held.delete(event.code)) live.current.onUp(computerKeys[event.code]);
    }
    const clear = () => { for (const code of held) live.current.onUp(computerKeys[code]); held.clear(); };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', clear);
    return () => { clear(); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clear); };
  }, []);
  return <div className="echo-desk">
    <Score key={score.id} purpose="study" label={step === 4 ? '首读乐谱' : '练习乐谱'} audition={step !== 4} lesson={score} hands={step === 2 ? 'left' : step === 3 ? 'both' : 'right'}
      active={active} hits={hits} busy={following} startBar={firstBar} focusBar={browse} cursorBeat={undefined}
      follow={following ? { view: engine, endBar: score.beats / score.meter - 1, showCursor: step !== 4 } : undefined}
      onPreview={notes => { void studio.previewNotes(notes); }} onBrowse={setBrowse} onBar={setBrowse} />
    <p className="echo-live" role="status">{studio.message}</p>
    <Keyboard down={down} target={active} low={48} high={72} onDown={studio.onDown} onUp={studio.onUp} />
    <p className="echo-key-guide">{step === 3 ? '合手可用 MIDI 琴或同时按电脑键。' : '可用屏幕琴键、电脑键盘或 MIDI 琴。'}
      {step !== 2 && <span>右手 <kbd>A</kbd> C4 · <kbd>S</kbd> D4 · <kbd>D</kbd> E4</span>}
      {(step === 2 || step === 3) && <span>左手 <kbd>Z</kbd> C3 · <kbd>X</kbd> D3</span>}</p>
  </div>;
}

export function EchoWorkshop({ studio, onBack }: { studio: Studio; onBack: () => void }) {
  const [progress, setProgress] = useState(loadEchoProgress);
  const [storageOk, setStorageOk] = useState(true);
  useEffect(() => { setStorageOk(save('echoWorkshop', progress)); }, [progress]);
  const { step } = progress;
  const [transfer, setTransfer] = useState<Lesson>();
  const [firstBar, setFirstBar] = useState(0);
  const [browse, setBrowse] = useState(0);
  const [mode, setMode] = useState<Mode>('wait');
  const [heard, setHeard] = useState(false);
  const [answer, setAnswer] = useState('');
  const [report, setReport] = useState('');
  const score = step < 4 ? guidedScores[step] : transfer;

  function markDone(index: number) {
    setProgress(p => p.done.includes(index) ? p : { ...p, done: [...p.done, index] });
  }
  function select(next: number) {
    studio.stop(false, true); studio.setMessage('准备好后开始练习。');
    setFirstBar(0); setBrowse(0); setMode('wait'); setReport(''); setTransfer(undefined);
    setAnswer(''); setHeard(false); setProgress(p => ({ ...p, step: next }));
  }
  function begin(piece: Lesson, demo = false, fresh = false) {
    setReport(''); setBrowse(firstBar);
    void studio.start(demo, { lesson: piece,
      settings: { hands: step === 2 ? 'left' : step === 3 ? 'both' : 'right', mode, hints: step !== 4,
        startBar: firstBar, endBar: piece.beats / piece.meter - 1 },
      onComplete: attempt => {
        if (demo) { if (step === 0) setHeard(true); return; }
        if (!attempt) return;
        review(attempt, fresh);
      },
    });
  }
  function review(attempt: Attempt, fresh: boolean) {
    const tally = `弹中 ${attempt.hit}/${attempt.total} 个音，错音 ${attempt.wrong} 次。`;
    if (step === 4) {
      const pass = cleanFirstRead(attempt, fresh);
      if (pass) setProgress(p => {
        const passed = [...new Set([...p.passed, attempt.lessonId])];
        return { ...p, passed, done: passed.length >= 2 ? [...new Set([...p.done, 4])] : p.done };
      });
      setReport(tally + (pass ? '本条首读通过。' : fresh ? '这条已作为练习，换谱可再检验。' : '这次是复练。'));
      return;
    }
    const steady = attempt.mode === 'wait' || !(attempt.early || attempt.late || attempt.durationErrors);
    const passed = attempt.fullLesson && attempt.hit === attempt.total && !attempt.wrong && steady;
    if (passed) markDone(step);
    setReport(tally + (attempt.mode === 'rhythm' ? `提前 ${attempt.early}、滞后 ${attempt.late}、时值偏差 ${attempt.durationErrors}。` : '') +
      (passed ? '本步已完成。' : firstBar ? '回到整首，把这一处接进乐句。' : '再弹一遍，先放慢出错的交接处。'));
  }
  function openScore() {
    const unseen = transferScores.filter(item => !progress.seen.includes(item.id));
    const pool = unseen.length ? unseen : transferScores.filter(item => item.id !== transfer?.id);
    const piece = pool[Math.floor(Math.random() * pool.length)];
    setTransfer(piece);
    setProgress(p => ({ ...p, seen: [...new Set([...p.seen, piece.id])] }));
    begin(piece, false, !!unseen.length);
  }
  function choose(descends: boolean) {
    setAnswer(descends ? '答对了。第二句从 E 回到 C，最后的 C 占两拍。' : '再听第二句：跟着第一个音哼到最后一个音，感受声音往哪边走。');
    if (descends) markDone(0);
  }
  const blocked = studio.busy || studio.loading;
  const remaining = transferScores.length - progress.seen.length;
  return <article className={'echo-workshop' + (step > 0 && score ? ' with-score' : '')}>
    <button className="text-button echo-back" onClick={onBack}><ArrowLeft size={15} />学习路径</button>
    <header className="echo-title"><div><p>钢琴小曲研习</p><h1>窗边的回声</h1></div>
      <div className="echo-meter"><strong>{progress.done.length} / 5</strong><small>步已完成</small></div></header>
    <nav className="echo-steps" aria-label="小曲学习步骤">{echoSteps.map((item, i) =>
      <button key={item.name} aria-current={step === i ? 'step' : undefined} onClick={() => { if (step !== i) select(i); }}>
        <span>{progress.done.includes(i) ? <Check size={14} aria-label="已完成" /> : i + 1}</span>{item.name}</button>)}</nav>
    <section className="echo-task">
      <h2>{echoSteps[step].title}</h2><p>{echoSteps[step].instruction}</p>
      {step === 0 ? <>
        <div className="echo-listen"><div><Headphones size={23} /><span>问句 <i>·</i> 答句</span></div>
          <button className="primary-button" disabled={studio.loading} onClick={() => blocked ? studio.stop() : begin(guidedScores[0], true)}>
            {blocked ? <Square size={15} /> : <Play size={15} />}{blocked ? '停止播放' : '听两小节'}</button></div>
        <p>{heard ? '第二句的最后一个音，比它的起音怎样？' : '听完两小节后，选出第二句的走向。'}</p>
        <div className="echo-actions"><button className="soft-button" disabled={!heard} onClick={() => choose(false)}>更高</button>
          <button className="soft-button" disabled={!heard} onClick={() => choose(true)}>更低</button></div>
        <p className="echo-answer" role="status">{answer || (studio.status !== 'idle' || studio.loading ? studio.message : '')}</p>
      </> : <>
        {step === 3 && <div className="echo-options"><label>练习范围 <select disabled={blocked} value={firstBar} onChange={e => {
          studio.stop(false, true); setFirstBar(+e.target.value); setBrowse(+e.target.value); setReport('');
        }}><option value={0}>完整四小节</option><option value={2}>第 3–4 小节 · 换低音</option></select></label>
          <label>方式 <select disabled={blocked} value={mode} onChange={e => { studio.stop(false, true); setMode(e.target.value as Mode); setReport(''); }}>
            <option value="wait">按自己的速度找音</option><option value="rhythm">跟拍 · 50 BPM</option></select></label></div>}
        {step === 4 && <p className="echo-evidence">独立首读 <b>{Math.min(2, progress.passed.length)} / 2</b> 条通过 · 还有 {remaining} 条新谱。两条不同新谱首遍无错音，即完成本步；这里检验音高顺序。</p>}
        <div className="echo-actions">
          {blocked || studio.status === 'paused' ? <button className="soft-button" onClick={() => { studio.stop(); setReport(''); }}><Square size={15} />结束本轮</button>
            : step === 4 ? <><button className="primary-button" onClick={openScore}><Music2 size={16} />{remaining ? '打开一条新谱' : '抽一条谱复练'}</button>
              {score && <button className="soft-button" onClick={() => begin(score)}>复练这条谱</button>}</>
              : <><button className="primary-button" onClick={() => begin(score!)}><Play size={15} />开始练习</button>
                <button className="soft-button" onClick={() => begin(score!, true)}><Headphones size={16} />听示范</button></>}
          {studio.status === 'paused' && <button className="soft-button" onClick={() => void studio.resume()}>继续练习</button>}
        </div>
        {report && <p className="echo-report" role="status">{report}</p>}
      </>}
      {progress.done.includes(step) && step < 4 && <button className="text-button echo-next" onClick={() => select(step + 1)}>下一步 · {echoSteps[step + 1].name}<ArrowRight size={15} /></button>}
      {step === 4 && progress.done.includes(4) && <p className="echo-report">已独立读出两条不同的新旋律。</p>}
    </section>
    {step > 0 && score && <MusicDesk studio={studio} score={score} step={step} firstBar={firstBar} browse={browse} setBrowse={setBrowse} />}
    {!storageOk && <p className="error" role="alert">本次进度可继续使用，本机保存失败。</p>}
  </article>;
}
