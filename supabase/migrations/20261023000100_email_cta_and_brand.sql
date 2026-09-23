-- 이메일 규칙 CTA 버튼
alter table email_rules add column if not exists cta_text text;
alter table email_rules add column if not exists cta_url  text;

-- 메일 이미지 로고 + 브랜드 색상
alter table settings add column if not exists logo_url    text;
alter table settings add column if not exists brand_color text;
