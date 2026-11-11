# 半拍改造待办

**状态：调研提案，待用户确认。** 2026 年 11 月 11 日整理，现状以同步后的 `main@6e9761f` 为准。后续功能改动先讨论方案、范围和验收方法，用户明确确认后再实施。工作区已有的随机听辨草稿尚未提交，也未发布；本清单不将它计为已完成功能。

## 想改善的练琴体验

学生拿到一首想弹的歌，在某个小节卡住时，半拍应能指出**哪里出了问题、下一遍具体练什么**。练顺原句后，再给一条没见过的短谱，看学生能否自己用出同一项本领。

现有版本已经支持找音、跟拍、分手、分小节循环、固定谱例听辨和设备时间补偿。可以从这些已有入口做试点。比如学生在休止处抢弹，结束后就从谱上点进那个小节，用一个键把节奏敲对，再回到原谱。[练习判定](../src/model.ts) · [练习室](../src/PracticeRoom.tsx) · [现有章节进度规则](../src/progress.ts)

## 实施顺序建议

| 优先级 | 课程待办 | 技术待办 | 验收时要看到什么 |
| --- | --- | --- | --- |
| P0 | 给三课分别写明这节要学会什么、用什么陌生谱例检验。区分原谱练习、看提示后重试、陌生题首答。 | 在原有章节进度旁记录题目版本、是否首答、使用过的提示，以及本项能力的结果。 | 学生能分别看到“原谱已完成”和“新题独立完成”。旧成绩保留原义。 |
| P1 | 用节奏课试点“指出错拍 → 单键练这个小节 → 换谱再试”。 | 将按下与松开的时间关联到小节、拍点和休止，复用已有选段与节拍器。 | 故意抢入、漏拍或提前松键，分别得到相应提示；一次抢弹不会带来两条矛盾的建议。 |
| P2 | 给三和弦课补上同根音对听、陌生根音盲听和上琴构成。 | 复用分句试听，记录首次选择；让题型在不同根音上均衡出现。 | 答前没有音名或亮键泄题；答后可以对听；听辨与构成分别出结果。 |
| P3 | 给移调课增加“按级数填和弦，再弹出来”的陌生调任务。 | 按小节核对根音、大小性质和要求的低音，接受等价转位与八度重复。 | 正确转位能通过；根音错、三音错和换慢了各有对应的练法。 |

建议首次只确认 **P0 的记录规则和 P1 的节奏课试点**。P2、P3 等试点复盘后再定实施范围。

## 三节课逐项对照

### 1.《在两拍之间找到半拍》

**现状。** 原谱第二小节先休半拍，C 在第 1 拍的“和”上进入，D 从第 2 拍保持到第 3 拍后半拍。练习结果显示命中、错音、提前、滞后与时值偏差的总数。按现有规则，一个音晚 0.2 拍仍可能同时记作命中和滞后，学生很难凭总数找到要重练的一拍。[原课谱例](../src/repertoire.ts) · [判定窗口](../src/model.ts)

**借鉴。** Piano-Trainer 允许学生用空格敲节奏，暂时拿掉找琴键的负担。Midiful 能把判定标到对应音符。半拍可以把错处标回谱上，再把该小节交给学生单键复练。[Piano-Trainer](https://github.com/philippotto/Piano-Trainer#readme) · [Midiful](https://github.com/Kelvination/midiful#readme)

- [ ] **抢入休止时**，保持跟拍继续，结束后标出第二小节，提示“你在‘1’上就弹了 C。先空半拍，数到‘和’再落键”。提供“只练这一小节”。
- [ ] **落点正确但 D 松早时**，指出松键位置，提示“从‘2’保持到‘3’的后半拍再换”。漏拍则标出缺少的那次落键。
- [ ] **换谱验收。** 准备两条没练过的四拍短谱，移动休止和长音的位置。例如八个半拍格为 `弹 延｜休 弹｜弹 延｜延 弹`，每组占一拍，“延”表示保持前音。首遍只给预备拍和节拍器，分别记录休止处多弹、反拍落点和长音保持。两条都能独立完成，再记录这项能力。
- [ ] **校准。** 用现有的 ±0.13 拍早晚分界作试评起点，在实际 MIDI 键盘上对照输入补偿和回听，再决定验收容差。

### 2.《只移动一个音，听出大三与小三》

**现状。** 原课先分解、再齐奏 C–E–G 和 C–E♭–G，用一个变化的三音讲清大小性质。练完固定谱以后，F 调作业主要靠同伴出题。照谱弹对和听出性质需要分别验证。[原课谱例与离谱作业](../src/repertoire.ts)

**借鉴。** LenMus 的答后试听和 GNU Solfege 的分解重播都能让学生追听刚才混淆的声音。半拍可以固定根音、音区、音色和力度，只改变三音。[LenMus 项目发布记录](https://sourceforge.net/p/lenmus/news/) · [GNU Solfege 和弦练习手册](https://ftp.labdoo.org/download/Public/manuals/manuals-ubuntu/EN/Solfege/docs.solfege.org/3.22/C/one-big-page.html)

- [ ] **听错时**，例如把 Fm 选成 F，给“刚才听到的 Fm”和“你选的 F”两个试听。先齐奏，再分解，提示“两遍的 F 和 C 相同。跟着中间音唱一遍 A♭ 和 A”。回到琴上只换中间一键。
- [ ] **换根音盲听。** C、F 用于教学，另选四个根音，各出大、小两种，打乱八题顺序。题目齐奏，答前隐藏音名、谱面和亮键。首答至少 7/8 是待试练的建议值。答后重听与改选计入复练。
- [ ] **另验构成。** 给出一个新根音，请学生分别构成大、小三和弦。单独显示“听辨答对几题”和“能构成几种”，保留学生下一次该练听觉还是键位的线索。

### 3.《把副歌的和声移到 G 调》

**现状。** 原课给出 C 调的 C–G–Am–F、G 调的 G–D–Em–C，课后也写出了 F 调答案。按固定谱弹一遍可以验证读谱和落键；单凭这一遍无法知道学生能否从 I–V–vi–IV 推出陌生调的和弦。逐音核对也可能把正确的另一种转位判错。[原课谱例与移调作业](../src/repertoire.ts)

**借鉴。** JJazzLab 支持对和弦符号和整段进行移调。Tonal 提供调与级数到和弦名的转换，也能表达同一和弦的不同低音。可借鉴这种表示方法，让题目、讲解和判定都围绕学生正在推算的级数。[JJazzLab 和弦谱](https://jjazzlab.gitbook.io/user-guide/editors/chord-lead-sheet) · [Tonal 级数转换](https://github.com/tonaljs/tonal/tree/main/packages/progression) · [Tonal 转位示例](https://github.com/tonaljs/tonal/tree/main/packages/chord-detect)

- [ ] **性质弹错时**，例如 D 调第 V 级的低音 A 正确，上方弹了 A–C–E，反馈“根音 A 找对了。保留 A 和 E，把 C 升到 C♯，再听大三和弦”。低音 A 配 E–A–C♯ 则通过。若低音根音已错，先让学生只弹四个根音。
- [ ] **换调验收。** 第一条只给 D 调与 I–V–vi–IV，第二条给 B♭ 调与 IV–I–V–vi。先填四个和弦，再弹。教师核对答案分别为 D–A–Bm–G、E♭–B♭–F–Gm，学生首答前隐藏答案。
- [ ] **分别反馈和声与连续演奏。** 逐小节核对级数根音、和弦构成和指定低音，接受合理转位与八度重复。每四拍能否连续换和弦单独记录，让学生区分“还没推算出来”和“推算正确，换手慢了一拍”。

## 其余调研线索

这些方向供试点后选题时参考。

| 方向 | 待回答的问题 | 已查的一手资料 |
| --- | --- | --- |
| 入门课程与视奏 | 学生能否先用单键敲陌生节奏，再关掉伴奏找音，最后按拍子弹回同一句？已有分手与跟奏能力可复用。 | [PianoBooster](https://github.com/pianobooster/PianoBooster) · [BoosterMusic 钢琴声部与伴奏素材](https://github.com/pianobooster/BoosterMusic) |
| 听辨题材扩展 | 上轮草稿探索了二度与三度、分解和弦、半拍、齐奏三和弦和三音短句。若和弦试点有效，可再讨论哪些课适合换起音、哪些课需要保留完整乐句。 | [LenMus 课程与练习](https://github.com/lenmus/lenmus) · [Tonal 音程表示](https://github.com/tonaljs/tonal/tree/main/packages/interval) |
| 流行伴奏与即兴 | 能否用同一段八小节旋律，连续教根音伴奏、副歌换织体、歌声留白处作答句，让学生听见编配决定的效果？ | [JJazzLab 段落与织体](https://jjazzlab.gitbook.io/user-guide/editors/song-structure) · [Impro-Visor](https://github.com/Impro-Visor/Impro-Visor) |
| 3D 指法教学 | 穿指、同音换指、左手保持三种代表乐句的指法能否由教师核对？已有标注应保留；MIDI 提供的落键与时机，不能说明学生实际用了哪根手指。 | [PianoPlayer](https://github.com/marcomusy/pianoplayer) · [含多位演奏者标注的指法研究](https://eita-nakamura.github.io/articles/Ramoneda_PianoFingeringFromPartiallyAnnotatedScores_2022.pdf) |
| 完整歌曲与反复 | 用一首带反复和两个结尾的短谱检验：同一小节第一次弹错、第二次弹对，谱面、播放、选段和成绩能否分别定位到正确的一遍？ | [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) · [music21 反复展开](https://music21.org/music21docs/moduleReference/moduleRepeat.html#expander) · [alphaTab 播放位置映射](https://github.com/CoderLine/alphaTab/blob/develop/packages/alphatab/src/midi/MidiTickLookup.ts) |
| 播放与硬件时序 | 复用现有音频时钟、输入时间对齐和设备校准，在 MIDIPLUS 实机核对提前、滞后与时值反馈。已有引擎及后续性能工作见项目路线图。 | [Tone.js Transport](https://github.com/Tonejs/Tone.js/wiki/Transport) · [半拍技术架构路线图](../docs/architecture-roadmap.md) |

## 下次需要确认

- [ ] 是否把“学生卡住时知道怎么练，换一条谱还能自己完成”作为近期改造重点？
- [ ] 是否先确认 P0 记录规则与 P1 节奏课试点？试点复盘时亲自试三种输入：休止处抢弹、长音松早、陌生节奏首遍弹对。
