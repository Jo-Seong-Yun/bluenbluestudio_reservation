// Hobby에서도 Supabase가 매분 호출할 수 있는 전용 주소입니다.
// 기존 배포에는 이 주소가 없어 스케줄러를 먼저 등록해도 과거 로직을 실행하지 않습니다.
export { GET } from "../reminders/route";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
