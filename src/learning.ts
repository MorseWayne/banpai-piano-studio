import type { Lesson } from './model';

export interface ReadingSection { id: string; title: string; body: string; action: string }
export interface Reading { goal: string; sections: ReadingSection[]; checks: string[]; reference: { title: string; url: string } }

const fingeringReference = { title: 'Yamaha 指法与手位示范', url: 'https://hub.yamaha.com/keyboards/k-how-to/the-basics-of-piano-keyboard-fingering/' };
const posture: Reading = {
  goal: '找到有支撑、能够自然移动的坐姿，完成一次放松的落键与松开。',
  sections: [
    { id: 'seat', title: '先调整座椅', body: '坐在琴凳前半部，双脚平稳支撑身体。调节高度，让肘部接近琴键高度，再调整与键盘的距离，给手臂留出活动空间。', action: '把双手放到键盘上，检查脚部是否有支撑，手肘是否能自然活动。' },
    { id: 'arm', title: '让肩臂和手腕自然连接', body: '肩膀放松，手臂自然垂落后再放到键盘上。手掌保持自然弧度，观察前臂、手腕与手掌的连接，随着落键保持舒适的活动余地。', action: '从侧面观察自己的手腕，再与原始姿势示范中的坐姿和手位对照。' },
    { id: 'touch', title: '感受落键、保持和松开', body: '找到中央 C，用右手中指缓慢按下。听声音开始，保持片刻，再自然松开。每次动作后，感受肩膀、前臂和手腕的状态。', action: '连续尝试四次，每次之间留出重新放松和准备的时间。' },
  ],
  checks: ['我已调整座椅与距离，双脚有支撑', '我能在落键后放松肩臂并自然松开', '我知道本节用右手中指弹中央 C'],
  reference: { title: 'Yamaha 坐姿与触键示范', url: 'https://www.yamaha.com/en/musical_instrument_guide/piano/play/play002.html' },
};

const readingNotes: Record<string, { goal: string; body: string; action: string }> = {
  'fingers-right': { goal: '认识五个手指的编号，在固定手位中连接右手音符。', body: '指法数字写在音符附近，表示用哪根手指。两手的拇指都是 1，小指都是 5。先把右手 1 指放在 C4，再找相邻的 D、E、F、G，依次对应 2、3、4、5 指。', action: '先说出手指名称和编号，再对照下方手位逐个找到琴键。' },
  'fingers-left': { goal: '独立找到左手手位，建立低到高的音与指法关系。', body: '把左手 5 指放在 C3，1 指位于更高的 G3。沿着 C、D、E、F、G 上行时使用 5、4、3、2、1 指。两手都从拇指开始编号，排列方向随左右手而变化。', action: '说出 5、4、3、2、1，同时依次触碰 C3 到 G3。' },
  pulse: { goal: '听出均匀的四拍，并让一个音落在每一拍上。', body: '在本节 4/4 拍里，以四分音符为一拍。先听节拍器，数 1、2、3、4，再用一个固定音跟拍。音与音之间的间隔需要均匀。', action: '先单独听拍并轻拍四下，再把相同节奏放到琴键上。' },
  right: { goal: '看出三个相邻音的走向，并辨认一拍与两拍的时值。', body: '中央 C 位于高音谱表下方的加线上，D 在它上方，E 位于最下面的线上。相邻音在线与间之间交替。读谱时同时观察音高的走向和音符形状。', action: '指着谱面说出 C、D、E，最后一个二分音符继续数满两拍。' },
  left: { goal: '用低音谱表定位左手的三个音，并保持两拍。', body: '低音谱号的两个点夹住 F 所在的线。可以先以这个定位音为参照，逐步找到练习里的 C3、D3、E3，再观察相邻音的移动方向。', action: '先在琴键上找到 C3，再对照谱面读出每次音高的变化。' },
  alternate: { goal: '让左右手轮流进入，保持同一条四拍时间线。', body: '右手弹两拍时，左手谱表出现休止符。第 3 拍开始换成左手，右手休息。把另一只手提前放在下一次要弹的键位上。', action: '先数四拍，分别在第 1 拍和第 3 拍轻触对应的手。' },
  landing: { goal: '用两个固定音完成同步落键和松开。', body: '大谱表把两行音符排在同一条时间线上。竖直对齐的音同时开始，两拍时值结束时一起松开。先熟悉手位，再听两只手是否一起发声。', action: '两手分别准备 C3 与 C4，数到 1 时同时落键，保持到第 2 拍结束。' },
  together: { goal: '保持双手同步，在相同节奏中移动到相邻音。', body: '先练固定音同步，再加入换音。本节两手都使用二分音符，进入与松开的时机相同。先看下一组音的位置，再按共同的拍点移动。', action: '分手各弹一遍，然后观察谱面中上下对齐的每一组音。' },
  'hold-two': { goal: '在左手持续发声时，让右手完成两个音。', body: '右手第二个音开始时，左手仍在保持。先分别熟悉两只手，再把两拍看成一个完整小单元，听见一个持续低音与两个旋律音。', action: '数 1、2，第一拍双手进入，第二拍只让右手换音。' },
  independence: { goal: '把左手保持延长到四拍，并连续弹出右手旋律。', body: '全音符在本节占四拍。左手从小节开始持续到结束，右手在其上移动。先完成两拍的小单元，再把动作连成完整小节。', action: '先循环第一小节，第二拍与第三拍都检查左手是否仍在保持。' },
  phrase: { goal: '把旋律与简化低音连接成一句有方向的音乐。', body: '低音为旋律提供支撑。先听出右手乐句的走向，再加入每小节的低音变化，尝试让右手更清楚、左手更轻。相同的分手方法可以用于歌曲片段。', action: '先哼唱这句原创旋律，再弹右手，最后加入左手低音。' },
};

export function readingFor(lesson: Lesson): Reading {
  if (lesson.id === 'posture') return posture;
  const notes = readingNotes[lesson.id];
  return {
    goal: notes?.goal ?? lesson.subtitle,
    sections: [
      { id: 'understand', title: lesson.theory.title, body: notes?.body ?? lesson.theory.body, action: notes?.action ?? lesson.theory.example },
      { id: 'prepare', title: '把知识放到手上', body: lesson.tip, action: lesson.theory.example },
      { id: 'practice', title: '进入练习前', body: '先听一遍示范，再用找音模式熟悉音高与手位。能够连续完成后，尝试慢速跟拍。双手练习可以先选一个声部，再逐步合手。', action: '练习中点“本课要点”可以随时回看，返回后从暂停位置继续。' },
    ],
    checks: ['我能说明本课的一个知识点', '我已对照示范确认起始手位和指法', '我已读过练习方法，知道先练哪一小段'],
    reference: lesson.stage.startsWith('02') ? fingeringReference : {
      title: 'ABRSM 初级练习与示范', url: 'https://www.abrsm.org/en-ai/for-learners/piano-learning/initialgrade',
    },
  };
}
