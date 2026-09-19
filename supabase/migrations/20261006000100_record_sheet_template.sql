-- 촬영 기록표(촬영 후 손님에게 받는 서명지) 양식을 관리자가 설정
-- 화면에서 직접 편집할 수 있게, 행(row) 구성을 저장해둔다. settings와
-- 같은 패턴으로 딱 한 행만 존재한다(id=1). rows에 들어가는 JSON의
-- 실제 계약은 lib/record-sheet/schema.ts의 RecordSheetRow 타입이다
-- (제목/구간제목/항목(라벨+값)/안내문구/빈칸 다섯 종류).
--
-- 처음 값은 지금까지 고정돼 있던 레이아웃을 그대로 행으로 옮긴
-- 것이라, 관리자가 아직 한 번도 손대지 않았어도 인쇄 미리보기는
-- 지금과 똑같이 나온다.
create table record_sheet_template (
  id int primary key default 1 check (id = 1),
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger record_sheet_template_set_updated_at
  before update on record_sheet_template
  for each row execute function set_updated_at();

insert into record_sheet_template (id, rows) values (
  1,
  '[{"id":"title","type":"title","text":"푸르른 스튜디오 촬영 기록표"},{"id":"r_name","type":"field","label":"성명*","tag":"성명"},{"id":"r_birth","type":"field","label":"생년월일(8자리)*","tag":"생년월일","tag2":"성별"},{"id":"r_phone","type":"field","label":"연락처*","tag":"연락처"},{"id":"r_email","type":"field","label":"이메일*","sublabel":"(완성본을 전달받으실 이메일)","tag":"이메일"},{"id":"r_app_name","type":"field","label":"신청자 성명","tag":"신청자성명"},{"id":"r_app_birth","type":"field","label":"신청자 생년월일(8자리)","tag":"신청자생년월일","tag2":"신청자성별"},{"id":"r_app_phone","type":"field","label":"신청자 연락처","tag":"신청자연락처"},{"id":"r_app_relation","type":"field","label":"신청자와의 관계","tag":"신청자관계"},{"id":"r_note1","type":"note","text":"*신청자란은 배우가 미성년자이거나 1명의 배우가 대표로 예약한 경우에만 작성합니다.","align":"left","small":true},{"id":"r_shoot","type":"field","label":"촬영일시*","tag":"촬영일시"},{"id":"r_delivery","type":"field","label":"완성본 전달예정일*","tag":"전달예정일","suffix":" 이내","align":"right"},{"id":"r_spacer1","type":"spacer"},{"id":"r_section_price","type":"section","text":"상품 옵션 및 금액*"},{"id":"r_base","type":"field","label":"기본촬영*","tag":"기본가","prefix":"₩","wideLabel":true},{"id":"r_opt1","type":"field","label":"추가옵션1","tag":"옵션1라벨","tag2":"옵션1금액","prefix2":"₩"},{"id":"r_opt2","type":"field","label":"추가옵션2","tag":"옵션2라벨","tag2":"옵션2금액","prefix2":"₩"},{"id":"r_opt3","type":"field","label":"추가옵션3","tag":"옵션3라벨","tag2":"옵션3금액","prefix2":"₩"},{"id":"r_opt4","type":"field","label":"추가옵션4","tag":"옵션4라벨","tag2":"옵션4금액","prefix2":"₩"},{"id":"r_total","type":"field","label":"계","tag":"합계","prefix":"₩","wideLabel":true},{"id":"r_account","type":"note","text":"*입금계좌: {계좌}","align":"left"},{"id":"r_sns","type":"field","label":"완성본의 ''푸르른 스튜디오''\n인스타그램 게시*","tag":"SNS동의"},{"id":"r_confirm","type":"note","text":"위와 같이 촬영을 완료하였음을 확인합니다.","align":"center"},{"id":"r_sign","type":"note","text":"20     .     .     .     (인)","align":"center"}]'::jsonb
);

alter table record_sheet_template enable row level security;

create policy "관리자만 기록표 양식 조회"
  on record_sheet_template for select
  to authenticated
  using (true);

create policy "관리자만 기록표 양식 수정"
  on record_sheet_template for update
  to authenticated
  using (true)
  with check (true);
