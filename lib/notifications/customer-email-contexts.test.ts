import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/booking/deposit-server',()=>({reservationDepositRequired:async()=>true}));
const m=vi.hoisted(()=>({failure:false,options:vi.fn(),site:vi.fn()}));
vi.mock('@/lib/notifications/notify',()=>({siteVariableOverrides:m.site}));
vi.mock('@/lib/booking/custom-fields',()=>({loadSelectedPricedOptions:m.options}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:(table:string)=>{
 const q:Record<string,unknown>={};for(const key of ['select','in','eq','order','range'])q[key]=()=>q;
 q.then=(resolve:(x:unknown)=>unknown)=>Promise.resolve({error:m.failure?new Error('DB error'):null,data:table==='customers'?[{phone:'010',name:'고객',email:'test@example.com'}]:table==='reservations'?[{id:'r',code:'ABC',customer_phone:'010',product_id:'p',shoot_start:'2026-10-08T05:00:00Z',shoot_location:'스튜디오',estimated_amount:85000,cancel_reason:null}]:table==='products'?[{id:'p',name:'촬영'}]:[{shoot_start:'2026-10-08T05:00:00Z',rank:1}]}).then(resolve);return q;
}})}));
import {loadCustomerEmailContexts} from './customer-email-contexts';
beforeEach(()=>{vi.resetAllMocks();m.failure=false;m.options.mockResolvedValue([{label:'대본',price:15000}]);m.site.mockResolvedValue({계좌:'계좌',공지:'공지'});});
describe('고객 예약 변수 불러오기',()=>{
 it('상품·일시·장소·예약번호·후보·금액·옵션 및 설정 연결',async()=>{
 const [context]=await loadCustomerEmailContexts(['010']);const vars=context.reservations[0].variables;
 expect(vars).toMatchObject({이름:'고객',상품명:'촬영',촬영장소:'스튜디오',예약번호:'ABC',예상금액:'85,000원',계좌:'계좌'});
 expect(vars.일시).toContain('14:00');expect(vars.추가옵션).toContain('대본');expect(vars.후보목록).toContain('14:00');expect(vars.결과물링크).toBe('');expect(m.options).toHaveBeenCalledWith('r',{strict:true});
 });
 it('DB 조회 실패를 빈 변수로 숨기지 않음',async()=>{m.failure=true;await expect(loadCustomerEmailContexts(['010'])).rejects.toThrow('DB error');});
 it('옵션 조회 실패도 발송 중단',async()=>{m.options.mockRejectedValue(new Error('옵션 조회 실패'));await expect(loadCustomerEmailContexts(['010'])).rejects.toThrow('옵션 조회 실패');});
});
