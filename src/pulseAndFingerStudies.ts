import { chapterNames } from './coursePlan';
import { chapter, rest, run, tone, voice } from './lessonScore';

// The closing piece brings back the same three bars the learner has played alone.
const turn = run([62, 64, 65, 64], [2, 3, 4, 3]);
const rooftop = [tone(60, 1), tone(62, 2), rest(1), tone(64, 3)];
const quickPair = [tone(60, 1), tone(62, 2, .5), tone(64, 3, .5), tone(65, 4), tone(64, 3)];

export const pulseAndFingerStudies = chapter(chapterNames.pulseAndFingers, [
  {
    id: 'pendulum-steps', title: '钟摆走两格', subtitle: '右手只用 C、D 两个键，先两拍换一次，再一拍换一次。', bpm: 52,
    theory: { title: '让琴键跟着数拍走', body: '第一小节数“一、二”时拇指留在 C，“三、四”换食指弹 D。第二小节还是四拍，两根手指每拍交一次班。听节拍器，留意从第一小节走进第二小节时，两声点击的距离。', example: '边拍腿边唱：长 C、长 D ｜ C、D、C、D。' },
    tip: '循环第 1–2 小节。先只拍腿数四下，再跟拍弹。第二小节如果越弹越快，减慢速度，让每次换指都碰上一声点击。',
    assignment: { task: '把手留在原位，从 D 开始弹后两小节。再关掉目标音提示，听节拍器弹一遍。', check: '我能把两次换指变成四次，同时保持原来的四拍' },
    right: [
      tone(60, 1, 2), tone(62, 2, 2), ...run([60, 62, 60, 62], [1, 2, 1, 2]),
      tone(62, 2, 2), tone(60, 1, 2), ...run([62, 60, 62, 60], [2, 1, 2, 1]),
    ],
    listening: { question: '前两小节里，哪一小节落键四次？', choices: ['第一小节', '第二小节'], answer: 1, explanation: '第一小节的 C、D 各占两拍。第二小节四声等长，一声占一拍。' },
  },
  {
    id: 'three-finger-turn', title: '三个键上转个弯', subtitle: '从 D 出发，每拍走一步，到了 F 就转身回 E。', bpm: 50,
    theory: { title: '折返也占原来的一拍', body: '先让食指和中指在 D、E 之间往返。第二小节轮到无名指弹 F，中指随后回到刚弹过的 E。最高音仍占一拍，换方向时继续数“四”。', example: '说着指号轻点：2、3、4、3。最后两下是两个分开的声音。' },
    tip: '循环第 2 小节。先从第三拍的 F 唱到第四拍的 E，再从第一拍弹进这个转弯。耳朵留意 F 有没有被拉长。',
    assignment: { task: '盖住指号，唱 D、E、F、E。接着让琴重复这句话，第 4 拍落回 E。', check: '我能在最高音后准时回到中指，四声间隔均匀' },
    right: [...run([62, 64, 62, 64], [2, 3, 2, 3]), ...turn, ...turn, tone(62, 2, 2), tone(60, 1, 2)],
  },
  {
    id: 'little-finger-knock', title: '小指来敲门', subtitle: '中指和无名指交替，下一小节让小指加入。', bpm: 48,
    theory: { title: '把小指的出场拍听清楚', body: '右手摆在 C 到 G 的五指位置。第一小节只用 3、4 指，第二小节第一拍由 5 指弹 G。让小指先靠近 G，等拍点到了再让键发声。', example: '先唱 E、F、E、F ｜ G、F、长 E。G 是第二句的第一声。' },
    tip: '循环第 1–2 小节。先听示范，再单练跨小节的 F、G、F。若三个音挤在一起，把速度降到能清楚唱出每一拍。',
    assignment: { task: '从第 3 小节单独起奏，让小指这次在第 3 拍出场。听两次 G 是否都清楚。', check: '我能按谱在不同拍点换到小指，再回到无名指' },
    right: [
      ...run([64, 65, 64, 65], [3, 4, 3, 4]), tone(67, 5), tone(65, 4), tone(64, 3, 2),
      ...run([64, 65, 67, 65], [3, 4, 5, 4]), tone(64, 3, 2), tone(67, 5, 2),
    ],
    listening: { question: '第二小节哪一个音留得最久？', choices: ['开头的高音 G', '结尾的 E'], answer: 1, explanation: 'G 和 F 各响一拍，回到 E 后数完“三、四”。' },
  },
  {
    id: 'low-door-answer', title: '左手在楼下应门', subtitle: '沿用刚才的节奏，让左手的 3、4、5 指在低音区回答。', bpm: 48,
    theory: { title: '指号相同，旋律往另一边走', body: '把左手小指放在 C3，无名指在 D3，中指在 E3。上一课的 3、4、5 指把声音带高，这次同样的指号把声音带低。先哼出低处的 C，再找小指。', example: '左手 E、D、E、D ｜ C、D、长 E，节奏和右手敲门时一样。' },
    tip: '循环第 1–2 小节，先找音，再跟拍。第二小节第一声交给小指，第二声交回无名指，最后让中指留满两拍。',
    assignment: { task: '先单用左手弹第 3 小节，嘴里数四拍。再只听示范，用左手在桌面轻点同样的指号。', check: '我能用左手弹完相同的节奏，并听出旋律先向下再回来' },
    right: [], left: [
      ...run([52, 50, 52, 50], [3, 4, 3, 4]), tone(48, 5), tone(50, 4), tone(52, 3, 2),
      ...run([52, 50, 48, 50], [3, 4, 5, 4]), tone(52, 3, 2), tone(48, 5, 2),
    ],
  },
  {
    id: 'same-key-handoff', title: '同一枚键，换一根手指', subtitle: '在 D4 上用食指和中指轮流弹，让每次换指都听得见。', bpm: 48,
    theory: { title: '同一个音也能有两次起声', body: '第一小节的两个 D 都是两拍。用食指弹第一个，在下一次起声前让键回起，再用中指弹第二个。看谱上的 2 和 3，听两次起声之间隔了几拍。', example: '数“一、二、三、四”：食指在一，中指在三。第二小节改在一、二各弹一次。' },
    tip: '循环第 1–2 小节。先只听 D 的两次起声，再打开 3D 指法对照自己的两根手指。第二小节数到三时休息，四用拇指弹 C。',
    assignment: { task: '看着自己的手重弹第 4 小节，确认两个 D 分别用 2、3 指，再听 C 是否准时落在第三拍。', check: '我能在同一枚键上换指重弹，听清两声，也能自己核对指号' },
    right: [
      tone(62, 2, 2), tone(62, 3, 2), tone(62, 2), tone(62, 3), rest(1), tone(60, 1),
      tone(62, 2, 2), tone(62, 3, 2), tone(62, 2), tone(62, 3), tone(60, 1, 2),
    ],
  },
  {
    id: 'long-short-steps', title: '把长音挪一格', subtitle: '同样三个音，第一遍从长音出发，第二遍把长音留给句尾。', bpm: 52,
    theory: { title: '下一指先准备，下一拍再决定是否弹', body: '前两小节都是 C、D、E。第一小节的 C 留两拍，D 在第三拍才响。第二小节的 C 只占一拍，D 提早到第二拍，轮到 E 留足两拍。', example: '用嘴唱“C—、D、E ｜ C、D、E—”，另一只手始终拍四下。' },
    tip: '循环第 1–2 小节，专听两个 D 分别遇到第几声点击。看见节拍线已经离开 C 的符头时，仍要按足谱上的时值。',
    assignment: { task: '换成下行的 E、D、C，再弹后两小节。合上谱，试着把长音从开头搬到结尾。', check: '我能让换指时机随长音的位置改变，每小节仍然数满四拍' },
    right: [
      tone(60, 1, 2), tone(62, 2), tone(64, 3), tone(60, 1), tone(62, 2), tone(64, 3, 2),
      tone(64, 3, 2), tone(62, 2), tone(60, 1), tone(64, 3), tone(62, 2), tone(60, 1, 2),
    ],
    listening: { question: '第二小节哪个音占两拍？', choices: ['最后一个 E', '第一个 C'], answer: 0, explanation: '第二小节在一、二、三拍依次落键，第四拍仍然是 E 的余音。' },
  },
  {
    id: 'quiet-rooftop', title: '屋檐下空一拍', subtitle: '手上休息一拍，心里继续数，让下一根手指准时进来。', bpm: 50,
    theory: { title: '空白也是准备下一指的时间', body: '第一小节 C、D 后空出第三拍，第四拍才弹 E。到了第二小节，第一拍就要安静。数到“二”再让 E 响起，两小节之间的静默有明确的拍点。', example: '唱“C、D、空、E ｜ 空、E、D、C”，唱“空”的同时轻点一下脚。' },
    tip: '循环第 1–2 小节并选择跟拍。把第三拍的休止和第二小节开头的休止都数出声，听 E 在它们后面怎样进来。',
    assignment: { task: '先跟示范只拍有声音的拍点，再只拍空拍，最后用琴弹出完整的两小节。', check: '我能在小节内和小节开头各空一拍，然后准时换指进入' },
    right: [...rooftop, rest(1), tone(64, 3), tone(62, 2), tone(60, 1)],
    listening: { question: '第二小节开头听到了什么？', choices: ['空一拍再进', '第一拍就弹 E'], answer: 0, explanation: '跨过小节线先数一个安静的“一”，下一个 E 在“二”上。' },
  },
  {
    id: 'two-raindrops', title: '一拍落两滴雨', subtitle: '只在第二拍加一个音，让食指和中指平分这一拍。', bpm: 48,
    theory: { title: '两根手指分同一拍', body: '先像平常一样数四下。第一小节的 D 在“二”，E 在“和”，两声合起来占第二拍。F 仍在“三”上。先把下一次整拍唱准，再往前填进这两个短音。', example: '唱 C、D-E、F、E，同时用左手在桌面点一、二、三、四。' },
    tip: '循环第 1 小节，打开“速度与节拍”里的“半拍细分”。食指弹在整拍，中指弹在紧接着的半拍。关掉细分后再听 F 能否与第三拍重合。',
    assignment: { task: '第 3 小节把同样的两滴雨交给 3、4 指。先数“二、和”，再把两个音放回整句。', check: '我能用两组不同的手指平分一拍，随后回到原来的四拍速度' },
    right: [
      ...quickPair, ...run([62, 64, 62, 60], [2, 3, 2, 1]),
      tone(62, 2), tone(64, 3, .5), tone(65, 4, .5), tone(67, 5), tone(65, 4),
      tone(64, 3), tone(62, 2), tone(60, 1, 2),
    ],
    listening: { question: '第一小节的两声短音合起来占几拍？', choices: ['两拍', '一拍'], answer: 1, explanation: 'D 和 E 各半拍，合起来正好从“二”走到“三”。' },
  },
  {
    id: 'after-the-rain', title: '专项小曲《雨过屋檐》', subtitle: '把转弯、空拍和两声短音接成八小节，跟着低音弹完自己的旋律。', bpm: 50,
    theory: { title: '用熟悉的动作认出三处路标', body: '第 2 小节是 D、E、F、E 的转弯。第 3 小节留出一个空拍。第 5 小节的一对短音让后半句动起来，最后回到长 C。先听示范，在听到两声短音时轻点两下。', example: '从第 5 小节开口唱 C、D-E、F、E，再试着不从头预演就弹出它。' },
    tip: '先循环第 3–4 小节接好休止，再循环第 5–6 小节对齐半拍。然后关掉循环，选回第 1–8 小节，用跟拍模式和低音伴奏合奏。',
    assignment: { task: '关掉目标音提示，从第 5 小节单独起奏。再从头跟拍，回看提前、滞后和时值偏差，挑最容易赶拍的两小节重弹。', check: '我能数过空拍、平分短音，并从后半句独立起奏' },
    right: [
      tone(60, 1, 2), tone(62, 2), tone(64, 3), ...turn,
      ...rooftop, tone(62, 2), tone(62, 3), tone(60, 1, 2),
      ...quickPair, tone(67, 5), tone(65, 4), tone(64, 3, 2),
      ...run([65, 64, 62, 62], [4, 3, 2, 3]), tone(60, 1, 4),
    ],
    backing: voice('left', run([48, 43, 48, 48, 53, 48, 43, 48], [3, 5, 3, 3, 1, 3, 5, 3], 4)),
    listening: { question: '第一次听到紧挨着的两个半拍，是在哪一句？', choices: ['前四小节', '后四小节'], answer: 1, explanation: '第 5 小节才响起连续的 D、E 两个半拍。之前的问句已经留过一次空拍。' },
  },
]);
