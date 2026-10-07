import { describe, it, expect } from "vitest";
import { customerEmailValues,parseCustomerVariableOverrides,renderCustomerCtas,type CustomerEmailContext } from "./customer-email-shared";
import { renderEmailHtml } from "./email-html";
const context:CustomerEmailContext={phone:'010',name:'고객',variables:{이름:'고객',일시:''},reservations:[{id:'own',label:'내 예약',variables:{이름:'고객',일시:'10월 8일 14:00',추가옵션:'대본 (+10000원)'}}]};
describe('고객별 발송 변수와 편집',()=>{
 it('예약 연결 값과 직접 수정 값 사용',()=>expect(customerEmailValues(context,'own',{결과물링크:'https://example.com/file',일시:'수정 시각'})).toEqual({이름:'고객',일시:'수정 시각',추가옵션:'대본 (+10000원)',결과물링크:'https://example.com/file'}));
 it('다른 고객 예약 ID와 삭제된 예약은 거부',()=>expect(()=>customerEmailValues(context,'other',{})).toThrow('해당 고객'));
 it('예약 없는 고객도 직접 입력으로 모든 변수 사용',()=>expect(customerEmailValues({...context,reservations:[]},'',{상품명:'직접 작성'})).toMatchObject({이름:'고객',상품명:'직접 작성'}));
 it('잘못된 형식/허용하지 않은 키/너무 긴 값 거부',()=>{for(const raw of ['null','[]','{"evil":"x"}','{"이름":1}',JSON.stringify({이름:'x'.repeat(10001)})])expect(()=>parseCustomerVariableOverrides(raw)).toThrow();});
 it('빈 값으로 덮어쓰기와 줄바꿈 보존',()=>expect(parseCustomerVariableOverrides('{"이름":"","추가옵션":"A\\nB"}')).toEqual({이름:'',추가옵션:'A\nB'}));
 it('본문 변수는 HTML 탈출하고 버튼에도 변수 적용',()=>{
 expect(renderEmailHtml('<p>{{이름}} {{결과물링크}}</p>',{이름:'<script>x</script>',결과물링크:'https://example.com'})).toContain('&lt;script&gt;');
 expect(renderCustomerCtas([{text:'{{이름}} 결과물',url:'{{결과물링크}}'}],{이름:'고객',결과물링크:'https://example.com'})).toEqual([{text:'고객 결과물',url:'https://example.com'}]);
 });
});
