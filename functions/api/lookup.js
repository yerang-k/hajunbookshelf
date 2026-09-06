export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawIsbn = url.searchParams.get('isbn') || '';
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, '');

  if (!isbn) return jsonResponse({ error: 'ISBN이 필요해요.' }, 400);

  const kakaoKey = env.KAKAO_REST_API_KEY;
  if (!kakaoKey) return jsonResponse({ error: '서버에 카카오 REST API 키가 설정되어 있지 않아요.' }, 500);

  const apiUrl = 'https://dapi.kakao.com/v3/search/book?target=isbn&query=' + encodeURIComponent(isbn);

  try {
    const res = await fetch(apiUrl, { headers: { 'Authorization': 'KakaoAK ' + kakaoKey } });
    if (!res.ok) {
      if (res.status === 401) return jsonResponse({ error: '카카오 REST API 키가 올바르지 않아요.' }, 502);
      return jsonResponse({ error: '카카오 API 오류 (' + res.status + ')' }, 502);
    }
    const data = await res.json();
    const item = data.documents && data.documents[0];
    if (!item) return jsonResponse({ error: '해당 ISBN으로 책을 찾을 수 없어요.' }, 404);
    return jsonResponse({
      isbn: isbn,
      title: (item.title || '').trim(),
      author: (item.authors || []).join(', '),
      publisher: item.publisher || '',
      cover: item.thumbnail || '',
      link: item.ur
