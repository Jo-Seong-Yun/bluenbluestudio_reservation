/**
 * 손님용 예약번호.
 *
 * 전화로 불러주거나 손으로 옮겨 적을 일이 있어서 헷갈리는 문자를 뺀다.
 * 0/O, 1/I/L, 2/Z 처럼 폰트나 손글씨로 구분하기 어려운 조합을 제외했다.
 */
const ALPHABET = "3456789ABCDEFGHJKMNPQRSTUVWXY";
const LENGTH = 8;

export function generateReservationCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
