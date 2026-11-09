import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, History, KeyboardMusic, Library, Music2, Plus, Upload } from 'lucide-react';
import { lessons, goals } from './lessons';
import { type Lesson } from './model';
import { useStudio } from './useStudio';
import { loadImports, loadLearning, read, save } from './storage';
import { importMusicXML } from './import';
import { DeviceSettings } from './DeviceSettings';
import { PracticeRoom } from './PracticeRoom';
import { LessonStudy } from './LessonStudy';
import { readingFor } from './learning';

const navigation = [
  { id: 'practice', label: '练习室', icon: KeyboardMusic },
  { id: 'courses', label: '学习路径', icon: BookOpen },
  { id: 'songs', label: '想弹的歌', icon: Library },
  { id: 'history', label: '练习记录', icon: History },
] as const;
type Page = typeof navigation[number]['id'] | 'learn';

export default function App() {
  const [page, setPage] = useState<Page>(() => read('lastLesson', '') ? 'practice' : 'courses');
  const [imports, setImports] = useState<Lesson[]>(loadImports);
  const [lessonId, setLessonId] = useState(() => read('lastLesson', 'posture'));
  const lesson = [...lessons, ...imports].find(item => item.id === lessonId) ?? lessons[0];
  const studio = useStudio(lesson);
  const completed = new Set(studio.attempts.filter(attempt => attempt.hit === attempt.total && attempt.wrong === 0
    && attempt.assisted === false && attempt.fullLesson).map(attempt => attempt.lessonId));
  const completedCount = lessons.filter(item => completed.has(item.id)).length;
  const practiced = new Set(studio.attempts.map(attempt => attempt.lessonId));
  const [learning, setLearning] = useState(loadLearning);
  const [learningError, setLearningError] = useState('');
  const learned = new Set(lessons.filter(item => readingFor(item).checks.every((_, index) => learning[item.id]?.includes(String(index)))).map(item => item.id));
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
    if (!(next === 'practice' && studio.status === 'paused')) studio.stop(false);
    setPage(next);
    window.scrollTo(0, 0);
  }
  function selectLesson(id: string) {
    studio.stop(false);
    setLessonId(id);
    setVideoFile(null);
    navigate('practice');
  }
  function openLearning(id: string) {
    if (id === lesson.id) studio.pause();
    else { studio.stop(false); setVideoFile(null); }
    setLessonId(id); setPage('learn'); window.scrollTo(0, 0);
  }
  function updateLearning(checks: string[]) {
    const next = { ...learning, [lesson.id]: checks };
    if (!save('learning', next)) { setLearningError('学习进度保存失败，请释放本机存储空间后重试。'); return; }
    setLearning(next); setLearningError('');
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
          <nav aria-label="主导航">{navigation.map(item => <button key={item.id} aria-current={page === item.id || (page === 'learn' && item.id === 'courses') ? 'page' : undefined}
            onClick={() => navigate(item.id)}><item.icon size={16} />{item.label}</button>)}</nav>
          <DeviceSettings studio={studio} />
        </div>
      </header>
      <main className={page === 'practice' ? 'practice-page' : undefined}>
        {learningError && <p className="error" role="alert">{learningError}</p>}
        {page === 'practice' && <PracticeRoom key={lesson.id} lesson={lesson} studio={studio}
          onCourses={() => navigate('courses')} onHistory={() => navigate('history')} onLearning={() => openLearning(lesson.id)} />}
        {page === 'learn' && <LessonStudy key={lesson.id} lesson={lesson} checked={learning[lesson.id] ?? []}
          onCheck={updateLearning} onPractice={() => navigate('practice')} onBack={() => navigate('courses')}
          onPreview={notes => { void studio.previewNotes(notes); }} video={video} onVideo={setVideoFile} paused={studio.status === 'paused'} />}
        {page === 'courses' && <>
          <div className="page-heading"><div><h1>学习路径</h1><p>从坐姿与用指开始，逐步进入读谱、拍感和双手配合。</p></div>
            <div className="course-progress"><b>已学习 {learned.size} / {lessons.length} 课</b><progress value={learned.size} max={lessons.length} /></div>
          </div>
          <div className="course-overview"><span>已学习 <b>{learned.size}</b></span><span>已练习 <b>{lessons.filter(item => practiced.has(item.id)).length}</b></span><span>独立完成 <b>{completedCount}</b></span></div>
          {[...new Set(lessons.map(item => item.stage))].map(stage => <section className="course-section" key={stage} aria-label={stage}>
            <h2>{stage}</h2><div className="library-list">{lessons.filter(item => item.stage === stage).map(item => <article className="lesson-row course-row" key={item.id} aria-label={item.title}>
              <div className="course-description"><h3>{item.title}</h3><p>{item.subtitle}</p>
                <div className="course-status"><span data-done={learned.has(item.id)}>{learned.has(item.id) ? '已学习' : '待学习'}</span><span data-done={practiced.has(item.id)}>{practiced.has(item.id) ? '已练习' : '待练习'}</span><span data-done={completed.has(item.id)}>{completed.has(item.id) ? '独立完成' : '待独立完成'}</span></div></div>
              <div className="course-actions"><button className="soft-button" aria-label={`学习讲解 · ${item.title}`} onClick={() => openLearning(item.id)}><BookOpen size={15} />学习讲解</button>
                <button className="text-button" aria-label={`直接练习 · ${item.title}`} onClick={() => selectLesson(item.id)}>直接练习<ArrowRight size={15} /></button></div>
            </article>)}</div>
          </section>)}
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
