const alfred = {
  title: 'Alfred 成人钢琴综合教程 · 第 1 册',
  url: 'https://www.alfred.com/products/alfred-s-basic-adult-all-in-one-course-book-1-00-37748',
};
const abrsm = {
  title: 'ABRSM · Practical Grades',
  url: 'https://www.abrsm.org/en-gb/about-practical-grades',
};
const berkleeKeys = {
  title: 'Berklee · Keyboard Method',
  url: 'https://online.berklee.edu/courses/berklee-keyboard-method',
};
const berkleePop = {
  title: 'Berklee · Pop/Rock Keyboard',
  url: 'https://online.berklee.edu/courses/pop-rock-keyboard',
};

export const chapterNames = {
  scales: '07 · 音程、调式与换指',
  reading: '08 · 节奏、听辨与视奏',
  harmony: '09 · 和弦构造与连接',
  symbols: '10 · 读和弦谱与移调',
  groove: '11 · 流行伴奏与律动',
  color: '12 · 和声色彩与即兴',
  arrange: '13 · 扒谱与段落编配',
  perform: '14 · 排练与完整演奏',
};

export const phases = [
  {
    title: '入门触键', goal: '从中央 C 出发，独立读出并弹完第一句双手旋律。',
    chapters: ['01 · 坐姿与触键', '02 · 指法与手位', '03 · 读谱与拍感', '04 · 双手合作', '05 · 双手独立', '06 · 乐句准备'],
    routine: '先找到中央 C，加一根手指练两音问答，再用三个音弹出四小节《窗边的回声》。隔天换一个结尾。熟悉五指和低音后，逐步让自己的左手接过伴奏。',
    project: '关掉目标音提示，数四拍起奏，弹完《窗边的回声》的双手版。再从第 3 小节单独起奏，换低音时右手仍能唱出问句。',
    projectLesson: 'echo-duet',
    reference: alfred, rationale: '借鉴它把读谱、乐理和触键放在同一课里的入门方法。',
  },
  {
    title: '读谱与键盘熟练度', goal: '把谱上的距离、调内音和细分拍点变成手上的动作。',
    projectLesson: 'waltz-reading',
    chapters: [chapterNames.scales, chapterNames.reading],
    routine: '先唱后弹一个音阶，分手检查换指，再练两小节节奏。每次留一条陌生短句做首遍视奏，弹完才回看错处。',
    project: '抽 C 或 G 大调，分手上下行一个八度。再拿一条陌生四小节旋律，先说拍号、找起音，慢速不停拍读完，并复唱末句。',
    reference: abrsm, rationale: '借鉴其音阶、琶音、视奏、听力和作品并行的训练维度。',
  },
  {
    title: '和弦与移调', goal: '看到 C、G、Am、F，能安排双手，并把整圈进行移到另一调。',
    projectLesson: 'transpose-loop',
    chapters: [chapterNames.harmony, chapterNames.symbols],
    routine: '先唱低音，再拆出和弦音。用原位弹一遍，换成就近转位再弹一遍，最后遮住五线谱，只看和弦符号。',
    project: '自写一行 I–V–vi–IV，在 C 调和 G 调各伴奏两圈。左手给根音，右手用转位；录下第二圈，听换和弦处是否丢拍。',
    reference: berkleeKeys, rationale: '借鉴其从三和弦、声部连接过渡到读和弦谱的顺序。',
  },
  {
    title: '流行伴奏与即兴', goal: '为同一段和声选择不同的织体，并在旋律空隙中加入回应。',
    projectLesson: 'answer-fill',
    chapters: [chapterNames.groove, chapterNames.color],
    routine: '先用左手和节拍器守住低音，再加右手节奏。录两遍同一进行，比较柱式、分解或反拍伴奏对歌声的影响。',
    project: '选一段熟悉的八小节旋律，唱着弹两个版本。一遍用分解和弦，一遍用反拍短和弦；只在句尾留白处加一次填句，比较哪一版更衬托人声。',
    reference: berkleePop, rationale: '借鉴其流行键盘伴奏型、声音排列和即兴回应练习。',
  },
  {
    title: '独立编配与演出', goal: '从听出动机、写和弦谱，走到给一首歌定调、编配和连续演奏。',
    projectLesson: 'recital',
    chapters: [chapterNames.arrange, chapterNames.perform],
    routine: '把整首歌按段落标记，每次只处理一个问题。分别从主歌、副歌和尾声起奏，再连段录音，记下下一次要修的具体小节。',
    project: '选择有权使用的一首完整歌曲。交付一页结构与和弦谱、原调及适合自己音域的移调方案、一段完整演奏录音。隔天回听，标出一处节奏、一处声部平衡问题，重录比较。换一首风格不同的歌重复这个过程。',
    reference: berkleePop, rationale: '借鉴其按歌曲角色选择音区、织体并录音复评的实践方法。',
  },
];
