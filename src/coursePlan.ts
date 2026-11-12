const alfred = {
  title: 'Alfred 成人钢琴综合教程 · 第 1 册',
  url: 'https://www.alfred.com/products/alfred-s-basic-adult-all-in-one-course-book-1-00-37748',
};
const abrsm = {
  title: 'ABRSM · Practical Grades',
  url: 'https://www.abrsm.org/en-gb/about-practical-grades',
};
const berkleePop = {
  title: 'Berklee · Pop/Rock Keyboard',
  url: 'https://online.berklee.edu/courses/pop-rock-keyboard',
};

export const chapterNames = {
  pulseAndFingers: '专项 · 节拍与换指',
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
    title: '基础乐理', goal: '认出起音，唱出旋律方向，把谱上的时值数成拍子。',
    chapters: ['01 · 坐姿与触键', '03 · 读谱与拍感', chapterNames.reading],
    routine: '先在两枚黑键左边找到 C，听唱三个白键的问答。再拍出长短音和休止。遇到陌生谱先数每小节有几拍，唱出第一句，再落键。',
    project: '读一条三拍子的短句。数三拍进入，句尾长音继续数拍。弹完从第二句单独起奏。',
    projectLesson: 'waltz-reading',
    reference: alfred, rationale: '借鉴它把读谱、乐理和触键放在同一课里的入门方法。',
  },
  {
    title: '手指练习', goal: '从三指问答走到五指手位，再用换指连起一个八度。',
    projectLesson: 'c-scale',
    chapters: ['02 · 指法与手位', chapterNames.pulseAndFingers, chapterNames.scales],
    routine: '先分手弹相邻的白键。把同一组音改成重复音、长短音和折返，让手指跟着乐句走。最后单练穿指处，再接回音阶。',
    project: '慢速弹完 C 大调一个八度。从 E 单独起奏，听换指前后音量是否均匀。再把同一练法用到 G 大调的升 F。',
    reference: abrsm, rationale: '借鉴其音阶、琶音、视奏、听力和作品并行的训练维度。',
  },
  {
    title: '左右手配合强化', goal: '从两手轮流接句，走到左手保持、右手独立唱旋律。',
    projectLesson: 'echo-duet',
    chapters: ['04 · 双手合作', '05 · 双手独立', '06 · 乐句准备'],
    routine: '先用双手在桌上敲出问答，再上琴练一起落键。左手保持一个长音时，右手弹两个短音。合手前先唱旋律、只弹低音。',
    project: '弹完《窗边的回声》双手版。再从第 3 小节起奏，检查左手换到 D 时，右手能否接上重复的问句。',
    reference: alfred, rationale: '参考其把左右手读谱和小曲演奏结合起来的安排。',
  },
  {
    title: '流行音乐理论', goal: '读和弦符号、连接和弦，为同一段旋律选择不同伴奏。',
    projectLesson: 'answer-fill',
    chapters: [chapterNames.harmony, chapterNames.symbols, chapterNames.groove, chapterNames.color],
    routine: '先用左手和节拍器守住低音，再加右手节奏。录两遍同一进行，比较柱式、分解或反拍伴奏对歌声的影响。',
    project: '选一段熟悉的八小节旋律，唱着弹两个版本。一遍用分解和弦，一遍用反拍短和弦；只在句尾留白处加一次填句，比较哪一版更衬托人声。',
    reference: berkleePop, rationale: '借鉴其流行键盘伴奏型、声音排列和即兴回应练习。',
  },
  {
    title: '实际曲目', goal: '把学过的旋律、低音和伴奏用在自己想弹的一首歌上。',
    projectLesson: 'recital',
    chapters: [chapterNames.arrange, chapterNames.perform],
    routine: '把整首歌按段落标记，每次只处理一个问题。分别从主歌、副歌和尾声起奏，再连段录音，记下下一次要修的具体小节。',
    project: '选择有权使用的一首完整歌曲。交付一页结构与和弦谱、原调及适合自己音域的移调方案、一段完整演奏录音。隔天回听，标出一处节奏、一处声部平衡问题，重录比较。换一首风格不同的歌重复这个过程。',
    reference: berkleePop, rationale: '借鉴其按歌曲角色选择音区、织体并录音复评的实践方法。',
  },
];
