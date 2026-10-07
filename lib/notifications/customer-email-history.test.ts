import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const log=(id:string,recipient:string,reservation_id:string|null)=>({id,recipient,reservation_id,purpose:'custom',success:true,error:null,created_at:'2026-10-07T00:00:00Z'});
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:(table:string)=>{
 const q:Record<string,unknown>={};for(const method of ['select','eq','order','range','maybeSingle'])q[method]=()=>q;
 q.then=(resolve:(x:unknown)=>unknown)=>Promise.resolve({error:null,data:table==='customers'?{email:'now@example.com'}:table==='reservations'?[{id:'own',customer_email:'old@example.com',team_emails:['team@example.com']}]:[log('1','other@example.com','own'),log('2','old@example.com',null),log('3','NOW@example.com',null),log('4','team@example.com',null),log('5','now@example.com','other'),log('6','random@example.com',null),log('7','old@example.com','own'),log('8','studio@example.com','own')]}).then(resolve);return q;
}})}));
import {loadCustomerEmailHistory} from './customer-email-history';
describe('고객 이메일 기록 연결',()=>{it('고객 본인 수신 기록만 포함하고 팀원·사장님·타 고객의 예약 기록을 제외',async()=>{expect((await loadCustomerEmailHistory('010')).map(r=>r.id)).toEqual(['2','3','7']);});});
