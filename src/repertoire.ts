import { chapterNames } from './coursePlan';
import type { Hand, Lesson, Note } from './model';

// A stroke advances one hand's clock. Empty pitches leave a written rest.
type Stroke = { pitches: number[]; fingers: number[]; duration: number; spellings?: Record<number, string> };
const chord = (pitches: number[], fingers: number[], duration: number): Stroke => ({ pitches, fingers, duration });
const tone = (pitch: number, finger: number, duration = 1) => chord([pitch], [finger], duration);
const rest = (duration: number) => chord([], [], duration);
const run = (pitches: number[], fingers: number[], duration = 1) =>
  pitches.map((pitch, i) => tone(pitch, fingers[i], duration));

function voice(hand: Hand, strokes: Stroke[]): Note[] {
  let beat = 0;
  return strokes.flatMap(({ pitches, fingers, duration, spellings }) => {
    const onset = beat;
    beat += duration;
    return pitches.map((midi, i) => ({
      id: `${hand}-${onset}-${midi}`, hand, midi, beat: onset, duration, finger: fingers[i],
      spelling: spellings?.[midi],
    }));
  });
}

type Study = Pick<Lesson, 'id' | 'title' | 'subtitle' | 'theory' | 'tip' | 'bpm'> & {
  assignment: NonNullable<Lesson['assignment']>;
  right: Stroke[]; left?: Stroke[]; meter?: number;
};
function chapter(stage: string, studies: Study[]): Lesson[] {
  return studies.map(({ right, left = [], meter = 4, ...study }) => {
    const notes = [...voice('right', right), ...voice('left', left)];
    const length = Math.max(...[left, right].map(part => part.reduce((sum, stroke) => sum + stroke.duration, 0)));
    return { ...study, stage, notes, meter, beats: Math.ceil(length / meter) * meter, source: '半拍原创谱例' };
  });
}

const majorUp = [1, 2, 3, 1, 2, 3, 4, 5];
const majorDown = [...majorUp].reverse();
const scales = chapter(chapterNames.scales, [
  {
    id: 'read-intervals', title: '用距离读旋律', subtitle: '从定位音出发，唱出级进和三度跳进。', bpm: 60,
    theory: { title: '先找起音，再看方向', body: '从 C 到 D 是二度，从 C 到 E 是三度。计算音程度数时把起点和终点都算进去。五线谱上，从一条线到相邻的间是二度，从一条线到下一条线是三度。', example: 'C–D 上行二度，E–G 上行三度。' },
    tip: '弹第一小节前先唱 C、D、E、G。第二小节用眼睛跟着旋律回落，再用右手验证。',
    assignment: { task: '从 G4 起，把前四音按相同的全音、全音、小三度关系弹成 G、A、B、D。', check: '我能从另一个起音重现前四音的走向和音程' },
    right: run([60,62,64,67,65,64,62,60], [1,2,3,5,4,3,2,1]),
  },
  {
    id: 'c-scale', title: '越过五指手位', subtitle: '用穿指与跨指连起 C 大调的一个八度。', bpm: 56,
    theory: { title: '大调音阶有固定的距离', body: '半音是到相邻琴键的距离，包括黑键。两个半音合成全音。C 大调的 E–F 和 B–C 各隔半音，其余相邻音级隔全音。', example: 'C D E F G A B C ｜全 全 半 全 全 全 半' },
    tip: '谱例两手同向。先选右手，只练 E–F 的 3→1，再选左手练 G–A 的 1→3。下行时反过来，先慢到换指处也能连贯。',
    assignment: { task: '两手分别闭谱上下行，边弹边说出两个半音的位置。再合手，听两手换指时是否有意外的重音。', check: '我能分手完成一个八度，并指出两处半音' },
    right: [...run([60,62,64,65,67,69,71,72], majorUp), ...run([72,71,69,67,65,64,62,60], majorDown)],
    left: [...run([48,50,52,53,55,57,59,60], [5,4,3,2,1,3,2,1]), ...run([60,59,57,55,53,52,50,48], [1,2,3,1,2,3,4,5])],
  },
  {
    id: 'g-scale', title: '为什么 G 大调需要升 F', subtitle: '把大调音阶的距离关系搬到 G 上。', bpm: 60,
    theory: { title: '从第七级听回主音', body: '从 G 起按大调的全半音顺序排列，第七级必须弹 F♯。它与高处的 G 相距半音，唱到这里可以听到朝主音靠拢的感觉。', example: 'G A B C D E F♯ G' },
    tip: '先循环末端 E–F♯–G。右手第 4 指准备好黑键，再从起音完整上下行。',
    assignment: { task: '把 F♯ 临时弹成 F，再恢复原谱。哼唱两种结尾，指出哪一个与 C 大调末尾 B–C 的距离相同。', check: '我能凭距离找出 G 大调的黑键并唱回 G' },
    right: [...run([55,57,59,60,62,64,66,67], majorUp), ...run([67,66,64,62,60,59,57,55], majorDown)],
  },
  {
    id: 'minor-arpeggio', title: '同一组白键，换一个归宿', subtitle: '比较 C 大调和 A 小调的主三和弦琶音。', bpm: 64,
    theory: { title: '主音改变，旋律的落点也改变', body: 'C 大调与 A 自然小调使用同一组白键。前两小节围绕 C–E–G 展开，后两小节围绕 A–C–E 展开。听低音和句尾，辨认哪一个音给你结束感。', example: 'C–E 是四个半音，A–C 是三个半音。' },
    tip: '右手先按住三和弦，再按谱面逐音弹开。听示范后分别哼出第 2、4 小节的最后一个音。',
    assignment: { task: '请同伴在 C 和 Am 中任选一个弹琶音，闭眼唱出低音再判断大小调色彩。独练时可先录下几组不同顺序，隔日听辨。', check: '我能构成两组三和弦，并唱出各自的主音' },
    right: [...run([60,64,67,72,67,64], [1,2,3,5,3,2]), tone(60,1,2), ...run([57,60,64,69,64,60], [1,2,3,5,3,2]), tone(57,1,2)],
    left: [tone(48,5,4),tone(48,5,4),tone(45,5,4),tone(45,5,4)],
  },
]);

const reading = chapter(chapterNames.reading, [
  {
    id: 'subdivide', title: '在两拍之间找到半拍', subtitle: '在四拍中读八分音符、休止和附点。', bpm: 58,
    theory: { title: '嘴里继续数，手上可以停', body: '把每拍分成“正拍、和”两格。八分音符占一格，附点四分音符占三格。第二小节的开头先休半拍，再在“和”上弹。', example: '第 2 小节的八格依次是 休 C D 延 延 E G 延。' },
    tip: '先拍腿数“1 和 2 和 3 和 4 和”。第二小节 D 在第 2 拍，E 在第 3 拍的后半拍，G 在第 4 拍。',
    assignment: { task: '合上谱，用同一个音敲出这两小节的节奏。请同伴或用录音对照，听第二小节第一个音是否落在两次点击之间。', check: '我能数过开头的休止，在第一个反拍进入' },
    right: [tone(60,1),tone(62,2,.5),tone(64,3,.5),tone(67,5,2),rest(.5),tone(60,1,.5),tone(62,2,1.5),tone(64,3,.5),tone(67,5)],
  },
  {
    id: 'waltz-reading', title: '把四小节读成三拍子的问答', subtitle: '预读拍号、起音与句尾，再保持脉搏视奏。', bpm: 66, meter: 3,
    theory: { title: '一小节只数到三', body: '3/4 拍中四分音符仍占一拍，附点二分音符刚好占满一小节。先看左右手第一个音，再找旋律的最高点和两处长音。', example: '第 2 小节停在 D，第 4 小节回到 C。' },
    tip: '第一次先不听示范。用十秒预读，以能不停拍的速度弹一遍，再听示范，单独复练读错的小节。',
    assignment: { task: '请同伴另写三拍子四小节，或选教材里没弹过的一句。预读后一次弹到底，再回头圈出卡住的跳进。', check: '我能在陌生短句里数满三拍，错音后仍能接上下一个小节' },
    right: [tone(60,1),tone(62,2),tone(64,3),tone(62,2,3),tone(67,5),tone(64,3),tone(62,2),tone(60,1,3)],
    left: [tone(48,5,3),tone(43,5,3),tone(43,5,3),tone(48,1,3)],
  },
]);

// Right-hand voicings sit above the bass. Keep common tones close through the loop.
const popVoicings = [
  chord([60,64,67], [1,3,5], 4), chord([59,62,67], [1,2,5], 4),
  chord([60,64,69], [1,3,5], 4), chord([60,65,69], [1,3,5], 4),
];
const popBass = [tone(48,3,4), tone(43,5,4), tone(45,4,4), tone(41,5,4)];
const harmony = chapter(chapterNames.harmony, [
  {
    id: 'triad-quality', title: '只移动一个音，听出大三与小三', subtitle: '先分解再齐奏，比较 C 与 Cm。', bpm: 60,
    theory: { title: '三音决定这两种和弦的色彩', body: 'C 与 Cm 都用 C 和 G 作外框。中间的 E 降半音成为 E♭，根音到三音的距离就从四个半音变成三个。和弦符号中的小写 m 表示小三和弦。', example: 'C = C E G　　Cm = C E♭ G' },
    tip: '用 1、3、5 指先分解弹出三个音，第四拍把三个音一起按下。第二小节只改变中指的位置。',
    assignment: { task: '在 F 上重做实验。先找 F–A–C，再把 A 降到 A♭。闭眼听同伴弹其中一个，唱出中间音再判断。', check: '我能在一个新根音上构成大、小三和弦' },
    right: [...run([60,64,67], [1,3,5]), chord([60,64,67],[1,3,5],1),
      ...[...run([60,63,67], [1,3,5]), chord([60,63,67],[1,3,5],1)].map(stroke => ({ ...stroke, spellings: {63: 'eb/4'} }))],
  },
  {
    id: 'cadence', title: '听见出发、离开与回家', subtitle: '在 C 调里连接主、下属、属与主和弦。', bpm: 60,
    theory: { title: '用级数记和弦的位置', body: '在 C 大调里，第 I、IV、V 级上的三和弦分别是 C、F、G。听 G 里的 B 如何朝下一小节的 C 靠拢。把调换成 G 后，同样的三个级数会对应 G、C、D。', example: '每小节一个和弦 ｜ C ｜ F ｜ G ｜ C ｜' },
    tip: '先单弹低音并唱 1、4、5、1，再加右手。末小节注意听右手最低声部的 B 回到 C。',
    assignment: { task: '让最后一个 G 多停一小节再回 C，哼出让你最想听到的结束音。试着在 G 调弹同一终止。', check: '我能唱低音级数，并在另一调找到 I、IV、V' },
    right: [popVoicings[0], chord([60,65,69],[1,3,5],4), popVoicings[1],popVoicings[0]],
    left: [tone(48,3,4),tone(41,5,4),tone(43,4,4),tone(48,1,4)],
  },
  {
    id: 'smooth-loop', title: '让四个和弦留在同一片键区', subtitle: '右手用转位连接 I–V–vi–IV，左手交代根音。', bpm: 64,
    theory: { title: '和弦音可以重新排列', body: 'G–B–D 换成 B–D–G，构成音仍然一样。这里右手从 C–E–G 到 B–D–G，最高的 G 留在原键，另外两音各退一步。双手合起来，实际低音仍是左手的 G。', example: 'C E G → B D G → C E A → C F A' },
    tip: '在琴面无声地换位，先找两个和弦的共同音，再找移动的手指。每次和弦落下时三音同时发声。',
    assignment: { task: '遮住谱面，只看 C、G、Am、F 连弹两圈。说出 G→Am 时三个声部各往哪个方向走。', check: '我能只看四个符号就近连接右手和弦' },
    right: popVoicings, left: popBass,
  },
]);

const symbols = chapter(chapterNames.symbols, [
  {
    id: 'slash-bass', title: '读懂斜线后面的低音', subtitle: '给 C、G/B、Am、G 配一条下行低音线。', bpm: 66,
    theory: { title: '斜线两侧分工不同', body: 'G/B 表示和弦用 G 大三和弦，最低音选 B。右手可继续弹 G 的组成音，左手从 C 走到 B，再到 A 和 G。歌谱中看到斜线符号时，先唱整条低音线。', example: '｜ C ｜ G/B ｜ Am ｜ G ｜　低音 C–B–A–G' },
    tip: '让左手从 C4 下方的 C3 开始，依次下行。合手后录一遍，检查即使闭眼也能听见这条低音线。',
    assignment: { task: '先弹一遍 G 根音，再弹一遍 G/B。唱出两版第二小节的低音，并写出右手都可以用的三个音。', check: '我能从斜线和弦独立读出右手和声与实际低音' },
    right: [popVoicings[0],popVoicings[1],popVoicings[2],popVoicings[1]],
    left: [tone(48,1,4),tone(47,2,4),tone(45,3,4),tone(43,5,4)],
  },
  {
    id: 'transpose-loop', title: '把副歌的和声移到 G 调', subtitle: '保留 I–V–vi–IV 的功能关系，重建和弦音。', bpm: 66,
    theory: { title: '先换根音，再还原和弦性质', body: 'C 调中的 C、G、Am、F，在 G 调里依次变为 G、D、Em、C。小写 vi 表示小三和弦。D 和弦的三音是 F♯，它也来自 G 大调音阶。', example: '｜ G ｜ D ｜ Em ｜ C ｜　各占四拍' },
    tip: '先只弹左手并唱级数。加右手后，对照 D 和弦中的黑键。两手熟悉后只读上面一行符号。',
    assignment: { task: '把同一圈再移到 F 调。在纸上写出 F、C、Dm、B♭，先弹根音，再逐个叠三度核对。', check: '我能从级数推算新调的根音和大小性质' },
    right: [chord([59,62,67],[1,2,5],4),chord([57,62,66],[1,3,5],4),chord([59,64,67],[1,3,5],4),chord([60,64,67],[1,3,5],4)],
    left: [tone(43,3,4),tone(38,5,4),tone(40,4,4),tone(48,1,4)],
  },
]);

const brokenLoop = popVoicings.flatMap(({ pitches: [low, mid, high] }) =>
  run([low,mid,high,mid,low,mid,high,mid], [1,3,5,3,1,3,5,3], .5));
const backbeat = popVoicings.flatMap(voicing => [
  rest(1), { ...voicing, duration: .5 }, rest(1.5), { ...voicing, duration: .5 }, rest(.5),
]);
const groove = chapter(chapterNames.groove, [
  {
    id: 'ballad-eighths', title: '给慢歌铺一层八分音符', subtitle: '左手保持根音，右手把熟悉的和弦拆成流动的伴奏。', bpm: 60,
    theory: { title: '和弦频率与手指频率', body: '这四小节每小节只换一次和弦，右手却每半拍弹一次。每四个八分音符构成低、中、高、中一组，乐句就有了持续运动的感觉。', example: 'C：C E G E　C E G E ｜ G：B D G D　B D G D' },
    tip: '先不开踏板，听第二组有没有抢拍。能弹匀后在真琴上试换和弦后重新踩延音踏板，听前一个低音是否及时消失。',
    assignment: { task: '轻声哼一段四小节旋律并伴奏。把右手密度减半再录一次，回听哪一版更容易听清歌声。', check: '我能保持一个和声循环，同时改变分解音型的密度' },
    right: brokenLoop, left: popBass,
  },
  {
    id: 'backbeat', title: '在第二、四拍给歌声一个支点', subtitle: '用短和弦建立流行乐的后拍重音。', bpm: 72,
    theory: { title: '听见短音之后的空间', body: '左手守住每小节第一拍，右手在第二、四拍加入短和弦。短和弦结束后留出空间，数拍仍然继续。听它和上一课连绵的分解型有什么不同。', example: '数 1　2　3　4 ｜右手 空　弹　空　弹' },
    tip: '先用左脚打均匀四拍，右手拍二、四拍，再移到键盘。右手每次只占半拍，留意松键也在节奏里。',
    assignment: { task: '把右手的两个齐奏都推迟半拍，落在“2 和、4 和”的“和”上。左手仍在第一拍，录下两种位置听区别。', check: '我能分别弹出二四拍重音和推迟半拍的变体' },
    right: backbeat, left: popBass,
  },
  {
    id: 'syncopated-comp', title: '让和弦在拍点前进入', subtitle: '数着八分细分，弹出跨越强拍的切分。', bpm: 68,
    theory: { title: '从弱位置延续到强位置', body: '右手每小节第一拍进入，第 2 拍后半拍再进入，保持到第 4 拍前。第 3 拍虽然能听到节拍器，手上要让和弦持续。', example: '八格：弹 延 休 弹 延 延 弹 延' },
    tip: '先用一个音练右手，只在 1、2 的“和”、4 上敲。左手加入后，每小节第 1 拍一起重新对齐。',
    assignment: { task: '把节奏移到另一组和弦，用手机录四小节。回听每一个被跨过的第 3 拍，检查有没有无意重弹。', check: '我能跨过第 3 拍保持和弦，下一小节仍准时进入' },
    right: popVoicings.flatMap(v => [{...v,duration:1},rest(.5),{...v,duration:1.5},{...v,duration:1}]), left: popBass,
  },
]);

const color = chapter(chapterNames.color, [
  {
    id: 'sus-add-nine', title: '区分挂留音和附加音', subtitle: '在同一低音上比较 Csus4、C 与 Cadd9。', bpm: 64,
    theory: { title: '先听三音在不在', body: 'Csus4 用 F 取代三音 E，F 回到 E 时形成一次解决。Cadd9 保留三音，再加入 D 作色彩音。谱例最后两小节先听普通 C，再听最高音多出 D 的 Cadd9。', example: '｜ Csus4 ｜ C ｜ C ｜ Cadd9 ｜　左手持续给 C 根音' },
    tip: '第一遍先松开延音踏板，唱内声部 F–E。最后两小节保持低音力度相近，分别听三和弦和加九音的尾色。',
    assignment: { task: '在自己的歌中找一个长达四拍的主和弦。试两拍 sus4、两拍原位解决，再试四拍 add9。唱着旋律比较哪个版本更合适。', check: '我能说明自己保留或替换了哪个和弦音，并弹出两种版本' },
    right: [chord([60,65,67],[1,3,5],4),popVoicings[0],chord([64,67,72],[1,2,4],4),chord([64,67,72,74],[1,2,4,5],4)],
    left: Array.from({length:4}, () => tone(48,5,4)),
  },
  {
    id: 'seventh-resolution', title: '听七和弦里两条线怎样解决', subtitle: '在 ii–V–I 中连接 Dm7、G7 与 Cmaj7。', bpm: 60,
    theory: { title: '三音与七音勾勒和弦性质', body: '左手交代根音，右手只弹三音与七音也能听出功能。Dm7 的 C 到 G7 降为 B，F 保留；G7 的 F 到 Cmaj7 再降为 E，B 保留。最后让 B 上行到 C 收束。', example: '低音 D–G–C–C ｜右手 F/C → F/B → E/B → E/C' },
    tip: '先只唱 C–B–B–C，再弹 F–F–E–E。两条线合起来时，把移动的那个音弹清楚。',
    assignment: { task: '写出 G 调 ii–V–I（Am7、D7、Gmaj7）的三音和七音。左手弹根音，右手尽量少移动，录音检查每次只移动一个内声部。', check: '我能在第二个调中找出并连接三音和七音' },
    right: [chord([65,72],[1,5],4),chord([65,71],[1,4],4),chord([64,71],[1,4],4),chord([64,72],[1,5],4)],
    left: [tone(50,1,4),tone(43,5,4),tone(48,2,4),tone(48,2,4)],
  },
  {
    id: 'secondary-dominant', title: '借一个升音，把耳朵引向 Am', subtitle: '比较自然音和声与 E7 到 Am 的定向感。', bpm: 64,
    theory: { title: '临时把 Am 当作目的地', body: '在 C 大调里，Em 的三音是 G。把它升为 G♯ 并加上 D，就形成 E7。G♯ 向上半音到 A，D 向下到 C，这个 E7 成了 vi 级的属七和弦，记作 V7/vi。', example: '｜ Em ｜ Am ｜ E7 ｜ Am ｜　听 G 与 G♯ 的不同' },
    tip: '谱中 E7 的根音交给左手。先用右手单弹 G♯–A，再弹 D–C，最后把它们合回原来的和弦。',
    assignment: { task: '在 C–Am–F–G 的循环里，把 C 的后两拍改成 E7。唱过这两拍，检查旋律与新增的 G♯ 是否合适，再决定保留哪一版。', check: '我能在进入 Am 前选择 E7，并解释一个半音解决' },
    right: [chord([64,67,71],[1,3,5],4),chord([64,69,72],[1,3,5],4),chord([62,68,71],[1,3,5],4),chord([60,69,72],[1,4,5],4)],
    left: [tone(52,1,4),tone(45,5,4),tone(52,1,4),tone(45,5,4)],
  },
  {
    id: 'answer-fill', title: '用五声音阶回答一句旋律', subtitle: '保留问句的节奏，在留白处设计短填句。', bpm: 70,
    theory: { title: '限制音材，听见句尾', body: 'C 大调五声音阶取 C、D、E、G、A。第 1、3 小节给出相同问句，第 2、4 小节给出不同回答。末句落 C，和低音一起产生结束感。', example: '先唱问句 E–G–A，再在下一小节的第 2 拍回答。' },
    tip: '先弹书面答案；第二遍只弹问句，空出回答的位置。低音照常进行，先用嘴唱一句够短的答案。',
    assignment: { task: '保持左手四小节，在答句位置即兴两次。第一次只用两个音，第二次保持相同节奏、改变句尾；用录音检查是否给下一句留出呼吸。', check: '我能先唱后弹两个不同答句，并按时回到问句' },
    right: [tone(64,1),tone(67,3),tone(69,5),rest(1),rest(1),tone(67,5),tone(64,3),tone(62,2),tone(64,1),tone(67,3),tone(69,5),rest(1),rest(1),tone(64,3,.5),tone(62,2,.5),tone(60,1,2)],
    left: [tone(48,3,4),tone(43,5,4),tone(45,4,4),tone(48,1,4)],
  },
]);

const arrange = chapter(chapterNames.arrange, [
  {
    id: 'transcribe-motif', title: '从四小节录音扒出旋律和低音', subtitle: '分三遍听，分别记录节奏、低音与旋律。', bpm: 68,
    theory: { title: '每一遍只回答一个问题', body: '到练习室播放示范，暂时移开视线。第一遍只敲旋律的节奏，第二遍哼每小节首拍的低音，第三遍以 C 作参照补旋律音高。先在纸上记下自己的答案，再回谱核对。', example: '纸上画四个小节框。每框下方记低音，上方用短线标出旋律进入的位置。' },
    tip: '听不清时只循环一小节。先唱再按键试音；记下首尾音之后，再补中间的经过音。把低音与旋律分手弹出来检查。',
    assignment: { task: '从自己熟悉的歌中截取另一句四小节，只靠听写出节奏与低音。再尝试为每小节写一个和弦符号，用琴验证与旋律是否相合。', check: '我能把听写稿和原声逐小节对照，并指出一处修正的依据' },
    right: [tone(64,3),tone(67,5,.5),tone(64,3,.5),tone(62,2),tone(60,1),tone(62,2,2),tone(67,5,2),tone(69,5),tone(67,4),tone(64,2),tone(60,1),tone(65,4,2),tone(64,3),tone(60,1)],
    left: popBass,
  },
  {
    id: 'verse-chorus', title: '给同一句旋律编主歌和副歌', subtitle: '右手保留四小节主题，左手第二遍加入分解伴奏。', bpm: 70,
    theory: { title: '段落对比可以从左手开始', body: '前四小节左手每小节只有一个低音，后四小节把同一和声拆成根、五、三、五。旋律与和声次序相同，声部密度的变化让副歌更饱满。', example: '两遍都是 C–G–Am–F。第 5 小节从 C3–G3–E3–G3 开始。' },
    tip: '先只练第 4、5 小节接缝。进入副歌时维持原速，右手旋律仍比左手清楚，然后分别从两个段落起奏。',
    assignment: { task: '在自己的主歌和副歌各选四小节，标出歌词的呼吸点。主歌用长低音，副歌试一种较密的织体，录音时检查呼吸点是否仍听得出来。', check: '我能在不改变速度的情况下，用织体区分两个段落' },
    right: [...theme(), ...theme()], left: [...popBass, ...brokenBass()],
  },
  {
    id: 'chord-melody', title: '把人声旋律放在和弦最上方', subtitle: '将旋律与和弦谱改写为一个人能弹的钢琴独奏。', bpm: 64,
    theory: { title: '先安排外声部', body: '先固定上方旋律和下方低音，在长音处补一到两个内声。第一小节 E、G 作为旋律，两拍一换；第二小节到 D，再回 G。右手的最高音始终可以单独唱出来。', example: '上声部 E–G ｜ D–G ｜ E–A ｜ F–C　　和声 C–G–Am–F' },
    tip: '只弹每个和弦的顶音并唱一遍，再用较轻的触键补内声。听众闭眼时，仍应能跟唱同一条旋律。',
    assignment: { task: '取自选曲的四小节，把旋律、低音和和弦符号写在纸上。只在长音处加内声；若跨度太大，把一个内声交给左手，录下调整前后的效果。', check: '我能把一行旋律谱编为独奏，并让听众听清顶声部' },
    right: [
      chord([60,64],[1,3],2),chord([60,64,67],[1,3,5],2),
      chord([59,62],[1,3],2),chord([59,62,67],[1,2,5],2),
      chord([60,64],[1,3],2),chord([60,64,69],[1,3,5],2),
      chord([57,60,65],[1,2,5],2),chord([57,60],[1,3],2),
    ], left: popBass,
  },
]);

function theme() {
  return [tone(64,2),tone(67,4),tone(69,5),tone(67,4),tone(62,1,2),tone(67,4,2),
    tone(64,2),tone(69,5),tone(67,4),tone(64,2),tone(65,3,2),tone(60,1,2)];
}
function brokenBass() {
  return [
    ...run([48,55,52,55], [5,1,3,1]), ...run([43,50,47,50], [5,1,3,1]),
    ...run([45,52,48,52], [5,1,3,1]), ...run([41,48,45,48], [5,1,3,1]),
  ];
}

const intro = [tone(60,1),tone(64,3),tone(67,5,2),tone(62,1),tone(67,4),tone(71,5,2)];
const ending = [tone(65,4),tone(62,2),tone(59,1,2),chord([60,64,67],[1,3,5],4)];
const perform = chapter(chapterNames.perform, [
  {
    id: 'intro-outro', title: '写一个能接唱的前奏和能收住的尾声', subtitle: '用 C–G 预告速度，用 G7–C 回到主音。', bpm: 68,
    theory: { title: '开头给线索，结尾给落点', body: '前两小节交代 C 调和四拍脉搏。后两小节用 G 低音上方的 F、D、B 勾勒属七和弦，最后回到 C。将这两对小节分别放到歌曲的开头和结尾。', example: '前奏 ｜ C ｜ G ｜　尾声 ｜ G7 ｜ C ｜' },
    tip: '前奏后直接唱出主题的第一个音，检查是否容易进入。结尾把最后一个 C 和弦保持四拍，听到余音后统一松开。',
    assignment: { task: '从自己歌曲的副歌借三个音写两小节前奏。请听众根据前奏拍手并接唱，用同一主题做一个不同节奏的结束句。', check: '我的前奏能提示进入拍，尾声能给出清楚的终止' },
    right: [...intro, ...ending], left: [tone(48,1,4),tone(43,5,4),tone(43,5,4),tone(48,1,4)],
  },
  {
    id: 'recital', title: '从前奏到尾声，完成一次连续演奏', subtitle: '把前奏、主歌、副歌与尾声连成十二小节，再独立编一首歌。', bpm: 72,
    theory: { title: '给连续演奏设三个重入点', body: '这首原创小品将已有材料拼成完整曲式。第 3 小节主歌进入，第 7 小节副歌换织体，第 11 小节回到终止。先练三个接缝，再练从任一段首进入；演出中即使漏音，也能跟着脉搏接回。', example: '1–2 前奏 ｜ 3–6 主歌 ｜ 7–10 副歌 ｜ 11–12 尾声' },
    tip: '从第 2、6、10 小节各起奏一次，跨过段落分界。最后关掉提示，从头连续录一遍。回听时分别记下换段处的速度与副歌旋律的清晰度。',
    assignment: { task: '自选一首完整歌曲，听写结构和主旋律，定调、配和弦并设计两种织体。保留一页和弦谱及两次完整录音，写下第二版改动的小节与听感。', check: '我能提交完整的自选曲编配，并据两次录音说明修改效果' },
    right: [...intro, ...theme(), ...theme(), ...ending],
    left: [tone(48,1,4),tone(43,5,4),...popBass,...brokenBass(),tone(43,5,4),tone(48,1,4)],
  },
]);

export const repertoire = [...scales, ...reading, ...harmony, ...symbols, ...groove, ...color, ...arrange, ...perform];
