import type { Lesson, Note, Hand } from './model';
import { repertoire } from './repertoire';
import { beginnerStudies } from './beginnerStudies';
import { pulseAndFingerStudies } from './pulseAndFingerStudies';
function line(pitches: number[], durations: number[], hand: Hand, fingers: number[]): Note[] {
  let beat = 0; return pitches.map((midi,i) => { const note = { id: `${hand}-${i}`, midi, beat, duration: durations[i], hand, finger: fingers[i] }; beat += durations[i]; return note; });
}
const right = (p: number[], d: number[], f: number[]) => line(p,d,'right',f);
const left = (p: number[], d: number[], f: number[]) => line(p,d,'left',f);
const existingLessons: Lesson[] = [
  { id:'pulse', title:'让一个音，跟上拍子', subtitle:'先听，再用右手弹出稳定的四拍。', stage:'01 · 拍感与触键', bpm:60, beats:8, meter:4,
    notes:right([60,60,60,60,60,60,60,60],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]),
    theory:{title:'一拍，是音乐的脚步',body:'在本练习的 4/4 拍里，每小节有四拍，四分音符占一拍。听到第一声重拍后，继续均匀地数 1、2、3、4。',example:'♩  ♩  ♩  ♩    ·    每拍弹一次'},tip:'拇指自然落键。肩膀放松，先找到舒服的高度。按下后松开，给下一个音留出空间。',source:'原创预备练习'},
  { id:'right', title:'让旋律走两步', subtitle:'右手在固定位置，连接三个相邻的音。',stage:'02 · 右手与识谱',bpm:56,beats:8,meter:4,
    notes:right([60,62,64,62,60,62,64],[1,1,1,1,1,1,2],[1,2,3,2,1,2,3]),
    theory:{title:'音高改变，拍子继续',body:'谱面上的位置表示音高，音符的形状表示时值。最后一个空心音符是二分音符，需要保持两拍。',example:'C → D → E    ·    1 → 2 → 3 指'},tip:'用拇指、食指、中指完成这段音型。移动手指时让手腕保持自然，练习中可以随时休息。',source:'原创预备练习'},
  { id:'left', title:'给左手一点时间',subtitle:'单独练左手，听见低音的支撑。',stage:'03 · 左手与低音谱',bpm:54,beats:8,meter:4,
    notes:left([48,50,52,48],[2,2,2,2],[5,4,3,5]),
    theory:{title:'低音谱表，也有自己的位置',body:'这一行使用低音谱号。每个音保持两拍，在第 1、3 拍进入。右手可以自然休息。',example:'弹 — 保持 — 弹 — 保持'},tip:'左手小指、无名指、中指依次尝试。先分清指法，再寻找稳定的拍点。',source:'原创预备练习'},
  { id:'together',title:'两只手，一起落下',subtitle:'两只手弹不同的音，做相同的动作。',stage:'04 · 双手同步',bpm:50,beats:8,meter:4,
    notes:[...right([60,60,62,60],[2,2,2,2],[1,1,2,1]),...left([48,48,50,48],[2,2,2,2],[5,5,4,5])],
    theory:{title:'上下对齐的音，一起开始',body:'大谱表把左右手放在一起。竖直对齐的音符在同一拍进入。这次两只手都保持两拍。',example:'右手  ● — ● —     左手  ● — ● —'},tip:'先看两只手的起始位置。用找音模式尝试同时按下，熟悉后再打开跟拍练习。',source:'原创预备练习'},
  { id:'independence',title:'一只手保持，一只手前进',subtitle:'从两个音开始，慢慢建立双手分工。',stage:'05 · 双手独立',bpm:50,beats:8,meter:4,
    notes:[...right([60,62,64,62,60,62,64],[1,1,1,1,1,1,2],[1,2,3,2,1,2,3]),...left([48,48],[4,4],[5,5])],
    theory:{title:'两种时值，一条时间线',body:'左手的全音符保持四拍，右手继续弹奏。左手持续的低音像地面，右手旋律在上面移动。',example:'左手保持 4 拍，右手独立行动'},tip:'先选左手练习，再选右手。合手困难时，选择“第一小节”循环，暂时保持慢速。',source:'原创预备练习'},
  { id:'phrase',title:'把小练习，弹成一句音乐',subtitle:'旋律与简化低音，组成两小节的小乐句。',stage:'06 · 乐句准备',bpm:56,beats:8,meter:4,
    notes:[...right([64,62,60,62,64,67,64],[1,1,2,1,1,1,1],[3,2,1,2,3,5,3]),...left([48,53],[4,4],[5,1])],
    theory:{title:'旋律和低音，各有角色',body:'这是一段原创预备乐句。先听旋律，再加入低音。接下来，同样的分手方法可以用于你导入的歌曲片段。',example:'先旋律 → 加低音 → 连成一句'},tip:'先分手熟悉换音位置。让右手的旋律清晰，左手轻一些。按自己的舒适速度完成。',source:'原创预备练习'},
];
const foundations: Lesson[] = [
  { id: 'posture', title: '坐稳，放松地弹出第一个音', subtitle: '调整座椅与手臂位置，体验落键、保持和松开。', stage: '01 · 坐姿与触键', bpm: 50, beats: 8, meter: 4,
    notes: right([60,60,60,60], [2,2,2,2], [3,3,3,3]),
    theory: { title: '从舒服的动作开始', body: '调整座椅高度，让肘部接近键盘高度。双脚有支撑，肩臂自然放松。手指自然弯曲，落键后感受琴键的支撑，再松开。', example: '落键 → 保持 → 松开' },
    tip: '先用右手中指弹 C4。每次松开后，检查肩膀和手腕是否仍然舒适。', source: '原创触键练习' },
  { id: 'fingers-right', title: '认识右手的五个手指', subtitle: '把指法编号与固定手位联系起来。', stage: '02 · 指法与手位', bpm: 50, beats: 8, meter: 4,
    notes: right([60,62,64,65,67,65,64,60], [1,1,1,1,1,1,1,1], [1,2,3,4,5,4,3,1]),
    theory: { title: '数字告诉你用哪根手指', body: '两只手都从拇指到小指编号为 1、2、3、4、5。右手在这段练习中依次对应 C、D、E、F、G。先找到手位，再连接相邻音。', example: '拇指 1 · 食指 2 · 中指 3 · 无名指 4 · 小指 5' },
    tip: '每个音都先确认指法，再自然落键。观察空闲手指是否放松。', source: '原创五指练习' },
  { id: 'fingers-left', title: '给左手建立固定手位', subtitle: '用相同的编号，认识左手不同的排列方向。', stage: '02 · 指法与手位', bpm: 50, beats: 8, meter: 4,
    notes: left([48,50,52,53,55,53,52,48], [1,1,1,1,1,1,1,1], [5,4,3,2,1,2,3,5]),
    theory: { title: '左手拇指也叫 1 指', body: '左手从低音往高音弹 C、D、E、F、G 时，指法依次是 5、4、3、2、1。对照手位与谱面，建立音高方向和手指编号的联系。', example: 'C D E F G  ·  5 4 3 2 1' },
    tip: '让右手自然休息，单独给左手足够的准备时间。', source: '原创五指练习' },
  { id: 'alternate', title: '左右手轮流说一句', subtitle: '先学会轮流进入，让两只手各自准备。', stage: '04 · 双手合作', bpm: 50, beats: 8, meter: 4,
    notes: [...right([60,60], [2,2], [1,1]).map((note, index) => ({ ...note, beat: index * 4 })),
      ...left([48,48], [2,2], [5,5]).map((note, index) => ({ ...note, beat: index * 4 + 2 }))],
    theory: { title: '休止时，另一只手接过来', body: '右手在第 1 拍进入并保持两拍，左手在第 3 拍接上。观察另一行的休止符，提前准备下一次落键。', example: '右手 1、2 拍  →  左手 3、4 拍' },
    tip: '先分别找到 C3 和 C4，再数着 1、2、3、4 轮流弹奏。', source: '原创双手过渡练习' },
  { id: 'landing', title: '一起落键，一起松开', subtitle: '用固定的两个音，体会同步动作。', stage: '04 · 双手合作', bpm: 50, beats: 8, meter: 4,
    notes: [...right([60,60,60,60], [2,2,2,2], [1,1,1,1]), ...left([48,48,48,48], [2,2,2,2], [5,5,5,5])],
    theory: { title: '对齐的音符同时开始', body: '大谱表中竖直对齐的两个音一起落下。本课固定两只手的位置，每两拍重复一次相同动作。', example: '一起弹下  →  保持两拍  →  一起松开' },
    tip: '先在找音模式熟悉双手同时按住，再切到跟拍模式听落键是否整齐。', source: '原创双手过渡练习' },
  { id: 'hold-two', title: '左手保持，右手走两步', subtitle: '用两拍的小单元开始练习双手独立。', stage: '05 · 双手独立', bpm: 48, beats: 8, meter: 4,
    notes: [...right([60,62,60,62,60,62,60,62], [1,1,1,1,1,1,1,1], [1,2,1,2,1,2,1,2]),
      ...left([48,48,48,48], [2,2,2,2], [5,5,5,5])],
    theory: { title: '左手的声音延续到下一拍', body: '左手保持两拍时，右手依次弹两个一拍的音。第二拍留意左手仍在保持，再让双手进入下一组。', example: '左手  ● —   ·   右手  ● ●' },
    tip: '先分手，再循环第一小节。跟拍模式可以帮助检查左手的保持时长。', source: '原创双手过渡练习' },
];
const order = [
  'posture', 'two-keys', 'three-echo', 'echo-repeat', 'echo-song',
  'echo-recall', 'upper-neighbours', 'fingers-right', 'left-echo', 'fingers-left',
  'pulse', 'right', 'left', 'silent-beat',
  ...pulseAndFingerStudies.map(lesson => lesson.id),
  'alternate', 'pass-the-phrase', 'landing', 'together',
  'hold-two', 'bass-lantern', 'independence',
  'phrase', 'echo-duet',
];
const beginnerPool = [...foundations, ...existingLessons, ...beginnerStudies, ...pulseAndFingerStudies];
const introductoryLessons: Lesson[] = order.map(id => {
  const lesson = beginnerPool.find(item => item.id === id)!;
  const stage = ['pulse', 'right', 'left'].includes(id) ? '03 · 读谱与拍感'
    : id === 'together' ? '04 · 双手合作' : lesson.stage;
  return { ...lesson, stage };
});
export const lessons: Lesson[] = [...introductoryLessons, ...repertoire];
export const goals = [ { title:'枫',artist:'周杰伦',color:'maple',tag:'旋律与乐句'}, { title:'蒲公英的约定',artist:'周杰伦',color:'dandelion',tag:'双手与伴奏'}, { title:'唯一',artist:'G.E.M. 邓紫棋演唱版',color:'only',tag:'节奏与表达'} ];
