import { describe,it,expect } from 'vitest';
import { Judge, decodeMidi, matchesHand, type Note } from './model';
import { lessons } from './lessons';
const n=(id:string,midi:number,beat=0,duration=1):Note=>({id,midi,beat,duration,hand:midi<60?'left':'right'});
describe('musical input and assessment',()=>{
  it('normalizes velocity-zero note-on and all MIDI channels',()=>{expect(decodeMidi([0x95,60,0])?.type).toBe('off');expect(decodeMidi([0x8f,60,64])?.type).toBe('off');expect(decodeMidi([0x91,60,80])?.type).toBe('on');expect(decodeMidi([0xf8])).toBeNull();expect(decodeMidi([0xb2,64,127])?.type).toBe('sustain');expect(decodeMidi([0xb2,123,0])?.type).toBe('panic');});
  it('requires releasing repeated notes rather than treating a held key as repeats',()=>{const j=new Judge([n('a',60),n('b',60,1)],'wait');j.on(60,0);j.on(60,1);expect(j.hits.size).toBe(1);j.off(60,1);j.on(60,2);expect(j.hits.size).toBe(2);});
  it('requires both chord notes to overlap and be freshly played for the next chord',()=>{const j=new Judge([n('a',48),n('b',60),n('c',48,2),n('d',62,2)],'wait');expect(j.on(48,0)).toBe('pending');j.off(48,0);expect(j.on(60,0)).toBe('pending');expect(j.on(48,0)).toBe('correct');j.off(60,0);expect(j.on(62,0)).toBe('pending');expect(j.hits.size).toBe(2);j.off(48,0);expect(j.on(48,0)).toBe('correct');expect(j.hits.size).toBe(4);});
  it('keeps wrong notes separate without advancing the target',()=>{const j=new Judge([n('a',60)],'wait');j.on(62,0);expect(j.wrong).toBe(1);expect(j.groupIndex).toBe(0);j.off(62,0);j.on(60,0);expect(j.hits.size).toBe(1);});
  it('matches the nearest available note and reports timing separately from pitch',()=>{const j=new Judge([n('a',60,1),n('b',60,2)],'rhythm');j.on(60,.78);j.off(60,1.78);j.on(60,2.24);j.off(60,3.24);expect(j.hits.size).toBe(2);expect(j.early).toBe(1);expect(j.late).toBe(1);expect(j.durationErrors).toBe(0);});
  it('rejects correct pitches outside the timing window',()=>{const j=new Judge([n('a',60,2)],'rhythm');expect(j.on(60,0)).toBe('wrong');expect(j.hits.size).toBe(0);});
  it('counts missed notes at completion and flags an early release',()=>{const j=new Judge([n('a',48,0,4),n('b',60,2)],'rhythm');j.on(48,0);j.off(48,.5);j.finish(4);expect(j.notes.length-j.hits.size).toBe(1);expect(j.durationErrors).toBe(1);});
  it('does not evaluate duration in waiting mode',()=>{const j=new Judge([n('a',60)],'wait');j.on(60,0);j.off(60,20);expect(j.durationErrors).toBe(0);expect(j.early+j.late).toBe(0);});
  it('all authored lessons have legal durations, unique IDs, and complete bar bounds',()=>{for(const l of lessons){expect(new Set(l.notes.map(n=>n.id)).size).toBe(l.notes.length);for(const note of l.notes){expect(note.beat+note.duration).toBeLessThanOrEqual(l.beats);expect(note.midi).toBeGreaterThanOrEqual(21);expect(note.finger).toBeGreaterThanOrEqual(1);expect(note.finger).toBeLessThanOrEqual(5);}expect(l.notes.filter(n=>matchesHand(n,'both')).length).toBe(l.notes.length);}});
});
