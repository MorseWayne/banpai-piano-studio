import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, History, KeyboardMusic, Library, Music2, Plus, Upload } from 'lucide-react';
import { lessons, goals } from './lessons';
import { type Lesson } from './model';
import { useStudio } from './useStudio';
import { loadImports, read, save } from './storage';
import { importMusicXML } from './import';
import { DeviceSettings } from './DeviceSettings';
import { PracticeRoom } from './PracticeRoom';

const navigation = [
  { id: 'practice', label: '练习室', icon: KeyboardMusic },
  { id: 'courses', label: '学习路径', icon: BookOpen },
  { id: 'songs', label: '想弹的歌', icon: Library },
  { id: 'history', label: '练习记录', icon: History },
] as const;
type Page = typeof navigation[number]['id'];

export default function App() {
  const [page, setPage] = useState<Page>('practice');
  const [imports, setImports] = useState<Lesson[]>(loadImports);
  const [lessonId, setLessonId] = useState(() => read('lastLesson', 'pulse'));
  const lesson = [...lessons, ...imports].find(item => item.id === lessonId) ?? lessons[0];
  const studio = useStudio(lesson);
  const completed = new Set(studio.attempts.filter(attempt => attempt.hit === attempt.total && attempt.wrong === 0
    && attempt.assisted === false && attempt.fullLesson).map(attempt => attempt.lessonId));
  const completedCount = lessons.filter(item => completed.has(item.id)).length;
  const [importError, setImportError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const importGoal = useRef('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [video, setVideo] = useState('');
  useEffect(() => {
    if (!videoFile) { setVideo(''); return; }
    const url = URL.createObjectURL(videoFile);
    setVideo(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  function navigate(next: Page) {
    if (page === next) return;
    studio.stop(false);
    setPage(next);
    window.scrollTo(0, 0);
  }
  function selectLesson(id: string) {
    setLessonId(id);
    setVideoFile(null);
    navigate('practice');
  }
  function requestImport(title = '') {
    importGoal.current = title;
    setImportError('');
    fileInput.current?.click();
  }
  async function loadScore(file: File) {
    try {
      const imported = importMusicXML(await file.text(), file.name);
      if (importGoal.current) imported.title = `${importGoal.current} · ${imported.title}`;
      const next = [...imports, imported];
      if (!save('imports', next)) throw new Error('本机存储空间不足，请减少导入的乐谱。');
      setImports(next);
      selectLesson(imported.id);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  }
  function exportHistory() {
    const blob = new Blob([JSON.stringify(studio.attempts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'banpai-practice.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar-inner">
          <a href="#" className="brand" aria-label="半拍练习室" onClick={event => { event.preventDefault(); navigate('practice'); }}>
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>半拍
          </a>
          <nav aria-label="主导航">{navigation.map(item => <button key={item.id} aria-current={page === item.id ? 'page' : undefined}
            onClick={() => navigate(item.id)}><item.icon size={16} />{item.label}</button>)}</nav>
          <DeviceSettings studio={studio} />
        </div>
      </header>
      <main className={page === 'practice' ? 'practice-page' : undefined}>
        {page === 'practice' && <PracticeRoom key={lesson.id} lesson={lesson} studio={studio}
          onCourses={() => navigate('courses')} onHistory={() => navigate('history')} video={video} onVideo={setVideoFile} />}
        {page === 'courses' && <>
          <div className="page-heading"><div><h1>学习路径</h1><p>从单音拍感到双手配合，按顺序练习，也可以直接选课。</p></div>
            <div className="course-progress"><b>{completedCount} / {lessons.length} 课独立完成</b><progress value={completedCount} max={lessons.length} /></div>
          </div>
          <div className="library-list">{lessons.map(item => <button className="lesson-row" key={item.id} onClick={() => selectLesson(item.id)}>
            <div><small>{item.stage}</small><h2>{item.title}</h2><p>{item.subtitle}</p></div>
            <span className="row-meta">{item.bpm} BPM · {Math.ceil(item.beats / item.meter)} 小节</span>
            <span className="row-action">{completed.has(item.id) && <Check size={15} />}
              {completed.has(item.id) ? '独立完成过' : item.id === lesson.id ? '继续练习' : '练习'}<ChevronRight size={16} /></span>
          </button>)}</div>
        </>}
        {page === 'songs' && <>
          <div className="page-heading"><div><h1>想弹的歌</h1><p>导入自己的简化谱，分手或分小节练习。</p></div>
            <button className="primary-button" onClick={() => requestImport()}><Upload size={16} />导入 MusicXML</button>
          </div>
          <input ref={fileInput} hidden type="file" accept=".musicxml,.xml" onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void loadScore(file);
          }} />
          {importError && <p className="error import-error" role="alert">{importError}</p>}
          <h2 className="section-heading">我的练习片段 <small>{imports.length}</small></h2>
          {imports.length ? <div className="library-list">{imports.map(item => <button className="lesson-row" key={item.id} onClick={() => selectLesson(item.id)}>
            <div><h3>{item.title}</h3><p>{item.source} · {Math.ceil(item.beats / item.meter)} 小节</p></div><ArrowRight size={17} />
          </button>)}</div> : <div className="empty-state"><Music2 size={28} /><h3>还没有导入的乐谱</h3>
            <p>支持未压缩的 .musicxml 和 .xml，固定 3/4 或 4/4 拍，最大 2 MB。</p></div>}
          <h2 className="section-heading">目标曲目</h2>
          <div className="library-list">{goals.map(goal => <div className="lesson-row" key={goal.title}>
            <div><h3>{goal.title}</h3><p>{goal.artist} · {goal.tag}</p></div>
            <button className="soft-button" onClick={() => requestImport(goal.title)}><Plus size={15} />添加练习片段</button>
          </div>)}</div>
          <p className="library-note">三首目标曲目需自行导入有权使用的乐谱。</p>
        </>}
        {page === 'history' && <>
          <div className="page-heading"><div><h1>练习记录</h1><p>本机已记录 {studio.attempts.length} 轮练习，独立完成 {completedCount} 门基础练习。</p></div>
            <button className="soft-button" onClick={exportHistory}><ArrowDownToLine size={16} />导出记录</button></div>
          {studio.attempts.length ? <div className="history-table"><table><thead><tr>
            {['练习', '模式 / 速度', '命中 / 总音数', '错音', '提前 / 滞后', '时值偏差', '输入', '时间'].map(label => <th key={label} scope="col">{label}</th>)}
          </tr></thead><tbody>{studio.attempts.map(a => <tr key={a.id}>
            <td><button className="text-button" onClick={() => selectLesson(a.lessonId)}>{a.title}</button><small>{a.hands === 'both' ? '双手' : a.hands === 'left' ? '左手' : '右手'}</small></td>
            <td>{a.mode === 'wait' ? '找音' : `跟拍 · ${a.bpm} BPM`}</td><td>{a.hit}/{a.total}</td><td>{a.wrong}</td>
            <td>{a.mode === 'wait' ? '未评分' : `${a.early} / ${a.late}`}</td><td>{a.mode === 'wait' ? '未评分' : a.durationErrors}</td>
            <td>{a.input}</td><td>{new Date(a.date).toLocaleString('zh-CN', { month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' })}</td>
          </tr>)}</tbody></table></div> : <div className="empty-state"><History size={30} /><h2>还没有练习记录</h2>
            <p>弹完一轮后，可在这里查看音准与节奏反馈。</p>
            <button className="primary-button" onClick={() => navigate('practice')}>去练习<ArrowRight size={15} /></button></div>}
        </>}
      </main>
    </div>
  );
}
