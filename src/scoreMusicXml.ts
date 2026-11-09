import { groupNotes, type Hand, type Lesson, type Note } from './model';

// Lesson beats are quarter notes. Keep one clock for the score, the judge and previously saved imports.
export const divisions = 960;
const values = [
  [4, 'whole'], [3, 'half'], [2, 'half'], [1.5, 'quarter'], [1, 'quarter'],
  [0.75, 'eighth'], [0.5, 'eighth'], [0.25, '16th'],
] as const;
const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function writtenPitch(note: Note) {
  const written = /^([a-g])([#b]?)\/(-?\d+)$/i.exec(note.spelling ?? '');
  const pitch = written ? written[1].toUpperCase() + written[2] : pitches[note.midi % 12];
  const octave = written ? Number(written[3]) : Math.floor(note.midi / 12) - 1;
  const alter = pitch.endsWith('b') ? -1 : Number(pitch.endsWith('#'));
  return { step: pitch[0], alter, octave };
}

function noteXml(ticks: number, staff: number, note?: Note, chord = false) {
  const beats = ticks / divisions;
  const value = values.find(([duration]) => duration === beats);
  const dotted = [0.75, 1.5, 3].includes(beats);
  const pitch = note && writtenPitch(note);
  const sound = pitch ? `<pitch><step>${pitch.step}</step><alter>${pitch.alter}</alter><octave>${pitch.octave}</octave></pitch>` : '<rest/>';
  const finger = note?.finger;
  const fingering = finger && Number.isInteger(finger) && finger >= 1 && finger <= 5
    ? `<notations><technical><fingering>${finger}</fingering></technical></notations>` : '';
  return `<note>${chord ? '<chord/>' : ''}${sound}<duration>${ticks}</duration><voice>${staff}</voice>${value ? `<type>${value[1]}</type>` : ''}${dotted ? '<dot/>' : ''}<staff>${staff}</staff>${fingering}</note>`;
}

function rests(ticks: number, staff: number) {
  let xml = '';
  for (const [beats] of values) {
    const length = beats * divisions;
    while (ticks >= length) {
      xml += noteXml(length, staff);
      ticks -= length;
    }
  }
  return xml + (ticks > 0 ? noteXml(ticks, staff) : '');
}

function voiceXml(lesson: Lesson, bar: number, hand: Hand, staff: number) {
  const start = bar * lesson.meter;
  const notes = lesson.notes.filter(note => note.hand === hand && note.beat >= start && note.beat < start + lesson.meter);
  const length = lesson.meter * divisions;
  if (!notes.length) return `<note><rest measure="yes"/><duration>${length}</duration><voice>${staff}</voice><staff>${staff}</staff></note>`;
  let xml = '';
  let cursor = 0;
  for (const group of groupNotes(notes)) {
    const onset = Math.round((group[0].beat - start) * divisions);
    xml += rests(onset - cursor, staff);
    const duration = Math.round(group[0].duration * divisions);
    group.forEach((note, index) => { xml += noteXml(duration, staff, note, index > 0); });
    cursor = onset + duration;
  }
  return xml + rests(length - cursor, staff);
}

export function scoreMusicXml(lesson: Lesson) {
  const attributes = `<attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>${lesson.meter}</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
  const measures = Array.from({ length: Math.ceil(lesson.beats / lesson.meter) }, (_, bar) =>
    `<measure number="${bar + 1}">${bar === 0 ? attributes : ''}${voiceXml(lesson, bar, 'right', 1)}<backup><duration>${lesson.meter * divisions}</duration></backup>${voiceXml(lesson, bar, 'left', 2)}</measure>`);
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}
