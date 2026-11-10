import { chapter, rest, tone, voice } from './lessonScore';

// The same melody returns with the learner playing the bass at the end of the phase.
const question = [tone(60,1), tone(62,2), tone(64,3,2)];
const answer = [tone(64,3), tone(62,2), tone(60,1,2)];
const echoSong = [...question, ...answer, ...question, tone(62,2,2), tone(60,1,2)];
const echoBass = [tone(48,5,4), tone(48,5,4), tone(50,4,4), tone(48,5,4)];

export const beginnerStudies = [
  ...chapter('01 · 坐姿与触键', [
    {
      id: 'two-keys', title: '用两个音打招呼', subtitle: '右手只用拇指和食指，在相邻的两枚白键上轮流落下。', bpm: 50,
      theory: { title: '相邻的白键', body: '回到刚找到的中央 C。这次让拇指停在 C 上，食指靠近它右边的 D。手掌留在原处，两根手指轮流把声音交给对方。', example: '先说“低、高”，再用两根手指各弹一次。' },
      tip: '先用找音模式。第二小节把两个音倒过来，听声音怎样回到起点。',
      assignment: { task: '移开亮键提示，从 D 开始给自己弹一个向下的回应。', check: '我能从 C 找到右边的 D，也能从 D 回到 C' },
      right: [tone(60,1,2),tone(62,2,2),tone(62,2,2),tone(60,1,2)],
      listening: { question: '后两个音往哪里走？', choices: ['往高处走','回到低音'], answer: 1, explanation: '前半句 C 到 D 上行，后半句 D 到 C 回落。跟着最后两个音轻轻唱一遍。' },
    },
    {
      id: 'three-echo', title: '三指回声', subtitle: '加上中指，用三个音弹一问一答。', bpm: 50,
      theory: { title: '把三个音听成一句', body: '把右手中指放到 D 右边的 E。先唱 C、D、E，再反过来唱 E、D、C。两句用同一组键，旋律的方向改变了。', example: '拇指、食指、中指上行，中指、食指、拇指回答。' },
      tip: '先点谱上的三个音对照键位，再到练习室只弹第一小节。到 E 时留在键上，听它响两拍。',
      assignment: { task: '试听问句后把眼睛移向自己的琴，只用三个音从高处回答。', check: '我能听完上行三音，用同一手位弹出下行答句' },
      right: [...question, ...answer],
      listening: { question: '两句的最后一个音有什么共同点？', choices: ['都比前一个音长','都和前一个音一样短'], answer: 0, explanation: '问句的 E 和答句的 C 都占两拍。用手指敲两下短的，再把第三下留住。' },
    },
    {
      id: 'echo-repeat', title: '把回声再叫一遍', subtitle: '留在同一枚琴键上，听清两次触键。', bpm: 50,
      theory: { title: '相同音高也有新的起点', body: '前一小节的 E 到了句尾。下一句如果还从 E 开始，需要让琴键回起，再弹一次，耳朵才能听出两句的边界。', example: '唱 E、E、D，前两个音每次都重新起声。' },
      tip: '只用中指试两次 E，再加食指的 D。留意第二个 E 能不能听得清楚。',
      assignment: { task: '用一个音弹两声短短的敲门声，接一个长音，请自己跟唱。', check: '我能让同一枚键清楚地响两次' },
      right: [tone(64,3),tone(64,3),tone(62,2,2),...answer],
    },
    {
      id: 'echo-song', title: '第一首小曲《窗边的回声》', subtitle: '把刚才的问句和答句接成四小节，右手弹旋律，半拍弹低音。', bpm: 50,
      theory: { title: '找出熟悉的问句', body: '第 1 和第 3 小节是完全相同的问句。第 2 小节用三个音回答，最后一小节只用两个长音回答。听完整段，试着在问句重来时点一下头。', example: '第 1、2 小节唱一问一答，再从第 3 小节的 C 重新起句。' },
      tip: '先找音熟悉四小节。想与低音合奏时选择跟拍，听完四下预备拍再进；伴奏可以在设备与声音中开关。',
      assignment: { task: '弹完后关掉提示，再弹最后两个长音。隔天从下一课的变奏试起，听听结尾换到了哪里。', check: '我能接上重复的问句，并把四小节弹到结尾' },
      right: echoSong, backing: voice('left', echoBass),
      listening: { question: '最后一小节，右手落了几次键？', choices: ['两次','四次'], answer: 0, explanation: '右手 D、C 各占两拍，左手低音在它们下面持续四拍。跟着右手唱出两个长音。' },
    },
  ]),
  ...chapter('02 · 指法与手位', [
    {
      id: 'echo-recall', title: '换个结尾，再答一句', subtitle: '隔天复习三个熟悉的键，试读一个新结尾。', bpm: 50,
      theory: { title: '先认出相同的部分', body: '第一小节沿用《窗边的回声》的问句。第二小节仍用三根手指，最后一次换音的方向变了。先看看音符往哪里走，再用琴验证。', example: '先从 C 起唱第一句，再读第二句 E、D、E。' },
      tip: '第一次先关掉目标音提示。卡住时只选第二小节，弹顺后再接回问句。',
      assignment: { task: '分别弹出落在 C 和落在 E 的两个版本，选一个自己喜欢的结尾。', check: '我能读出新结尾，并弹回原来的答句' },
      right: [...question, tone(64,3),tone(62,2),tone(64,3,2)],
    },
    {
      id: 'upper-neighbours', title: '用无名指和小指换个尾音', subtitle: '先从 E 到 F，再把句尾延伸到 G。', bpm: 48,
      theory: { title: '在熟悉的手位里向右多走一步', body: '右手中指停在 E，无名指和小指分别靠近 F 和 G。第一小节只走到 F 就回来；第二小节经过 F，继续走到 G。每遍只多准备一枚键。', example: '第一遍只弹 E、F、E。第二遍再试 E、F、G。' },
      tip: '先只练第一小节。到第二小节时，听 F 和 G 之间有没有比前两个音多出一段空隙。',
      assignment: { task: '为三指问句选一个更高的回答，先唱句尾，再弹给自己听。', check: '我能在同一手位用四指接 F，用五指接 G' },
      right: [tone(64,3),tone(65,4),tone(64,3,2),tone(64,3),tone(65,4),tone(67,5,2)],
      listening: { question: '哪一句走到了最高音？', choices: ['第一句','第二句'], answer: 1, explanation: '第一句到 F 就折返，第二句继续向上到 G。用声音唱出两种句尾。' },
    },
    {
      id: 'left-echo', title: '让左手回答两个低音', subtitle: '把相邻两音的动作移到低音区，先让左手单独说话。', bpm: 48,
      theory: { title: '左手的五指在低音一侧', body: '找中央 C 左边最近的另一个 C，把左手小指放上去。向右升到 D 时，用靠近它的无名指。高低方向和右手一样，指法编号的顺序变了。', example: 'C3、D3 用左手 5、4 指，回来时用 4、5 指。' },
      tip: '先放下右手，只听两枚低音。让每个音保持两拍再换。',
      assignment: { task: '右手先在高音区弹两音问句，左手在低音区弹出同样的方向。', check: '我能用左手在 C3 和 D3 之间往返' },
      right: [], left: [tone(48,5,2),tone(50,4,2),tone(50,4,2),tone(48,5,2)],
    },
  ]),
  ...chapter('03 · 读谱与拍感', [{
    id: 'silent-beat', title: '给旋律留一拍空白', subtitle: '同样的四拍，试着在第二拍安静一下。', bpm: 52,
    theory: { title: '休止也占时间', body: '第一小节四拍都有声音。第二小节第 2 拍有一个四分休止符，手上松开，嘴里仍然数“二”。第 3 拍再落键。', example: '弹、弹、弹、弹 ｜ 弹、空、弹、弹。' },
    tip: '先用单独听拍，拍腿模仿第二小节，再选跟拍用同一个音弹。一拍空白后再接回节拍。',
    assignment: { task: '把第二小节拍给自己听，再把空白放在第 3 拍，听两种节奏。', check: '我能数过休止并在下一拍重新进入' },
    right: [tone(60,1),tone(60,1),tone(60,1),tone(60,1),tone(60,1),rest(1),tone(60,1),tone(60,1)],
    listening: { question: '第二小节哪一拍空了出来？', choices: ['第 2 拍','第 3 拍'], answer: 0, explanation: '第 1 拍弹 C，第 2 拍休止，最后两拍重新弹 C。再听一次，轻声把空出来的“二”补上。' },
  }]),
  ...chapter('04 · 双手合作', [{
    id: 'pass-the-phrase', title: '把问句传给另一只手', subtitle: '右手说两个音，左手在第三拍接话。', bpm: 50,
    theory: { title: '听出轮到哪只手', body: '两行谱共用同一组四拍。上面一行在前两拍上行，下面一行在后两拍回落。先在桌上按顺序轻点右、右、左、左，再把动作放回键盘。', example: '右 C、D ｜ 左 D、C。数到三时交给左手。' },
    tip: '两手都先准备好起音。左手接话时松开右手，让低音听得清楚。',
    assignment: { task: '自己编两音问句，保持交接拍不变，让另一只手回答。', check: '我能在第 3 拍把短句交给另一只手' },
    right: [tone(60,1),tone(62,2),rest(2),tone(60,1),tone(62,2),rest(2)],
    left: [rest(2),tone(50,4),tone(48,5),rest(2),tone(50,4),tone(48,5)],
    listening: { question: '哪个音区先开口？', choices: ['低音区','高音区'], answer: 1, explanation: '右手先弹较高的 C、D，左手等到第 3 拍才在低处回答。' },
  }]),
  ...chapter('05 · 双手独立', [{
    id: 'bass-lantern', title: '让低音陪旋律多走一步', subtitle: '左手保持三拍，右手从两个音增加到三个音。', bpm: 48,
    theory: { title: '两只手可以在不同时间松开', body: '数一、二、三时，左手守住低音 C。右手每拍换音。第 4 拍两手一起休息，再听下一次低音怎样进入。', example: '左手按下、保持、保持、松开。右手弹 C、D、E、休息。' },
    tip: '先只练第一小节。右手弹到 E 时听一听低音是否还在；想核对保持时长时选跟拍。',
    assignment: { task: '把右手的上行改为下行，仍让左手守到第三拍结束。', check: '右手换第三个音时，我还能听到原来的低音' },
    right: [tone(60,1),tone(62,2),tone(64,3),rest(1),tone(64,3),tone(62,2),tone(60,1),rest(1)],
    left: [tone(48,5,3),rest(1),tone(48,5,3),rest(1)],
    listening: { question: '右手换到第三个音时，低音怎样了？', choices: ['还在延续','又敲了一下'], answer: 0, explanation: '左手每小节只落键一次，持续到第三拍结束。两只手在第四拍一起留白。' },
  }]),
  ...chapter('06 · 乐句准备', [{
    id: 'echo-duet', title: '自己合奏《窗边的回声》', subtitle: '回到第一章的小曲，这次用自己的左手接过伴奏。', bpm: 50,
    theory: { title: '同一首曲子，多弹一个声部', body: '右手沿用最早的四小节旋律。左手每小节只落一次，前两小节留在 C3，第 3 小节升到 D3，最后回家。先唱右手，单弹这四个低音。', example: '左手 C、C、D、C，每个低音都保持四拍。' },
    tip: '用右手跟拍回忆原曲，再单练左手。最后从第 3 小节开始合手，弹顺以后接回完整四小节。',
    assignment: { task: '关掉目标音提示弹一遍，再从第 3 小节单独起奏。隔天先唱旋律再上琴。', check: '我能从第 3 小节起奏，换低音时右手继续唱下去' },
    right: echoSong, left: echoBass,
    listening: { question: '哪一小节的低音第一次离开 C？', choices: ['第 2 小节','第 3 小节'], answer: 1, explanation: '低音连续两小节停在 C，第 3 小节升到 D，托住再次出现的问句。' },
  }]),
];
