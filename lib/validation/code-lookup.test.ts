import { describe, expect, it } from 'vitest';
import { codeLookupSchema, lookupSchema } from './reservation';
describe('예약번호 전용 조회', () => {
  it('전화번호 없이 예약번호만 허용하고 공백과 소문자를 정리합니다', () => {
    expect(codeLookupSchema.parse({ code: ' er7jhacc ' })).toEqual({ code: 'ER7JHACC' });
  });
  it('비어 있는 예약번호는 거절합니다', () => {
    expect(codeLookupSchema.safeParse({ code: '   ' }).success).toBe(false);
  });
  it('기존 취소 인증은 전화번호를 계속 요구합니다', () => {
    expect(lookupSchema.safeParse({ code: 'ER7JHACC' }).success).toBe(false);
  });
});
