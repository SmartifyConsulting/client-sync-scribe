import {describe,it,expect} from 'bun:test';
import {quoteCheckpoints,setStatus} from '../src/features/wealth-workflow/map/quoteJobs';
describe('confirmed quote checkpoints',()=>{
 it('never fills PDF or Saved just because a request is generating or time passes',()=>{
  expect(quoteCheckpoints({n:1,status:'generating',since:0}).map(p=>p.done)).toEqual([true,true,false,false]);
 });
 it('distinguishes received PDF from a successful save, preserving the acknowledgement through status changes',()=>{
  const jobs=setStatus({OM:[{n:1,status:'generating',since:1,pdfReceived:true}]},'OM',1,'failed',2);
  expect(jobs.OM[0].pdfReceived).toBe(true);
  expect(quoteCheckpoints(jobs.OM[0]).map(p=>p.done)).toEqual([true,true,true,false]);
  expect(quoteCheckpoints({n:1,status:'captured',since:3}).every(p=>p.done)).toBe(true);
 });
 it('does not claim that queued or stopped work has completed',()=>{
  expect(quoteCheckpoints({n:1,status:'queued',since:0}).map(p=>p.done)).toEqual([true,false,false,false]);
  expect(quoteCheckpoints({n:1,status:'stopped',since:0}).some(p=>p.label==='Saved'&&p.done)).toBe(false);
 });
});
