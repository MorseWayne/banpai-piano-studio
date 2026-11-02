import type { Lesson, Note, Hand } from './model';
function line(pitches: number[], durations: number[], hand: Hand, fingers: number[]): Note[] {
  let beat = 0; return pitches.map((midi,i) => { const note = { id: `${hand}-${i}`, midi, beat, duration: durations[i], hand, finger: fingers[i] }; beat += durations[i]; return note; });
}
const right = (p: number[], d: number[], f: number[]) => line(p,d,'right',f);
const left = (p: number[], d: number[], f: number[]) => line(p,d,'left',f);
export const lessons: Lesson[] = [
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
export const goals = [ { title:'枫',artist:'周杰伦',color:'maple',tag:'旋律与乐句'}, { title:'蒲公英的约定',artist:'周杰伦',color:'dandelion',tag:'双手与伴奏'}, { title:'唯一',artist:'G.E.M. 邓紫棋演唱版',color:'only',tag:'节奏与表达'} ];
