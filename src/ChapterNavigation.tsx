import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, ChevronDown, History, List, X } from 'lucide-react';
import type { Lesson } from './model';
import type { PracticeProgress } from './progress';

type Chapter = { title: string; lessons: Lesson[] };
export type DirectoryView = 'all' | 'history';

export function ChapterNavigation({ chapters, imports, lesson, progress, recentChapters, view, onBrowse, onClose, onSelect }: {
  chapters: Chapter[]; imports: Lesson[]; lesson: Lesson; progress: PracticeProgress;
  recentChapters: Lesson[]; view: DirectoryView | null; onBrowse: (view: DirectoryView) => void;
  onClose: () => void; onSelect: (id: string) => void;
}) {
  const [browsing, setBrowsing] = useState(lesson.stage);
  const selectedChapter = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const groups = imports.length ? [...chapters, { title: imports[0].stage, lessons: imports }] : chapters;
  const chapter = groups.find(group => group.title === browsing) ?? groups[0];
  const index = chapters.findIndex(group => group.title === lesson.stage);
  const previousChapter = chapters[index - 1];
  const previous = recentChapters.find(item => item.stage === previousChapter?.title) ?? previousChapter?.lessons[0];
  const next = index >= 0 ? chapters[index + 1]?.lessons[0] : undefined;

  return <nav className="lesson-path" aria-label="练习章节">
    <Dialog.Root open={view !== null} onOpenChange={open => {
      if (open) { setBrowsing(lesson.stage); onBrowse('all'); }
      else onClose();
    }}>
      <Dialog.Trigger className="chapter-picker" title="打开章节目录" aria-label={`章节目录，当前为${lesson.stage}`}>
        <List size={15} />切换章节<span>{lesson.stage}</span><ChevronDown size={13} />
      </Dialog.Trigger>
      <button className="chapter-jump" aria-haspopup="dialog" onClick={() => onBrowse('history')}><History size={14} />历史章节</button>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="chapter-directory" aria-describedby={undefined} onOpenAutoFocus={event => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          if (view === 'all' && selectedChapter.current?.offsetWidth) {
            event.preventDefault();
            selectedChapter.current.focus();
          }
        }} onCloseAutoFocus={event => {
          if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
        }}>
          <div className="panel-title"><Dialog.Title>{view === 'history' ? '历史章节' : '章节目录'}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="关闭章节目录"><X size={18} /></Dialog.Close>
          </div>
          {view === 'history' ? <>
            {recentChapters.length ? <ol className="recent-chapters">
              {recentChapters.map(item => <li key={item.stage}><button onClick={() => onSelect(item.id)}>
                <span><small>{item.stage}</small><strong>{item.title}</strong></span><ArrowRight size={16} />
              </button></li>)}
            </ol> : <p className="recent-empty">还没有打开过其他练习。</p>}
            <div className="directory-footer"><button className="text-button" onClick={() => {
              setBrowsing(lesson.stage); onBrowse('all');
            }}>浏览全部章节<ArrowRight size={15} /></button></div>
          </> : <><label className="chapter-select">章节
            <select value={chapter.title} onChange={event => setBrowsing(event.target.value)}>
              {groups.map(group => <option key={group.title}>{group.title}</option>)}
            </select>
          </label>
          <div className="chapter-columns">
            <nav className="chapter-list" aria-label="选择章节">{groups.map(group =>
              <button key={group.title} ref={group === chapter ? selectedChapter : undefined}
                aria-pressed={group === chapter} onClick={() => setBrowsing(group.title)}>{group.title}</button>)}
            </nav>
            <section className="chapter-lessons" aria-label={chapter.title + '的练习'}>
              <h3>{chapter.title}</h3>
              {chapter.lessons.map(item => {
                const current = item.id === lesson.id;
                const level = progress[item.id];
                const done = level === 'complete' || level === 'independent';
                return <button key={item.id} aria-current={current ? 'page' : undefined} onClick={() => {
                  if (current) onClose(); else onSelect(item.id);
                }}>
                  <span>{item.title}</span>
                  {current && <small>当前练习</small>}
                  {done ? <Check size={16} aria-label="已完成" /> : level === 'practiced' && <small>练过</small>}
                </button>;
              })}
            </section>
          </div></>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {previous && <button className="chapter-jump" title={previous.stage + ' · ' + previous.title}
      onClick={() => onSelect(previous.id)}><ArrowLeft size={13} />上一章</button>}
    {next && <button className="chapter-jump" title={next.stage + ' · ' + next.title}
      onClick={() => onSelect(next.id)}>下一章<ArrowRight size={13} /></button>}
  </nav>;
}
