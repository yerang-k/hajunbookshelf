# 하준이의 책장 배포 안내

## 파일 구성
- `index.html` — 앱 전체 (홈 / 등록 / 책장 / 통계)
- `functions/api/lookup.js` — 알라딘 API를 대신 호출해주는 Cloudflare Pages Function
  (브라우저에서 알라딘 API로 직접 요청하면 CORS 때문에 막히고, TTBKey도 노출되므로 서버 쪽에서 대신 호출)

## 배포 (Cloudflare Pages)
1. 이 폴더(`doongi-app`) 전체를 GitHub 저장소에 올리거나, Cloudflare Pages에 직접 업로드합니다.
2. Cloudflare Pages 프로젝트 설정 → **환경 변수(Environment variables)** 에서
   `ALADIN_TTBKEY` 라는 이름으로 알라딘 TTBKey 값을 등록합니다.
3. TTBKey가 없다면: 알라딘 계정으로 로그인 후 알라딘 오픈API 블로그(blog.aladin.co.kr/openapi)에서
   사이트 주소(개인 블로그 주소도 가능)를 등록하면 1~2일 내 메일로 발급됩니다. 하루 호출 5,000건까지 무료입니다.
4. 환경 변수 등록 후 재배포하면 `/api/lookup?isbn=...` 이 정상 동작합니다.

## 참고
- 알라딘 API 이용약관에 따라 화면에 "도서 정보 제공: 알라딘 인터넷서점" 문구와 알라딘 상품 링크를
  넣어두었습니다(조회 성공 시 자동 표시).
- 바코드 스캔은 카메라 권한이 필요해 https 환경(Cloudflare Pages는 기본 https)에서만 동작합니다.
- 데이터는 기기의 localStorage에만 저장돼요. 기기를 바꾸면 기록이 이어지지 않으니,
  필요하면 나중에 계정/동기화 기능을 추가로 논의해요.
