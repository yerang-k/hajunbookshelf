// Cloudflare Pages Function
// Route: /api/lookup?isbn=9788934985471
// Proxies Aladin OpenAPI's ItemLookUp so the TTBKey never reaches the browser
// and so the request isn't blocked by CORS.
//
// Setup:
// 1. Deploy this whole project (index.html + functions/) to Cloudflare Pages.
// 2. In the Pages project settings -> Environment variables, add:
//      ALADIN_TTBKEY = <your TTBKey>
// 3. Redeploy so the variable is picked up.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawIsbn = url.searchParams.get('isbn') || '';
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, '');

  if (!isbn) {
    return jsonResponse({ error: 'ISBN이 필요해요.' }, 400);
  }

  const ttbkey = env.ALADIN_TTBKEY;
  if (!ttbkey) {
    return jsonResponse({ error: '서버에 알라딘 TTBKey가 설정되어 있지 않아요. Cloudflare Pages 환경 변수 ALADIN_TTBKEY를 등록해주세요.' }, 500);
  }

  const itemIdType = isbn.length <= 10 ? 'ISBN' : 'ISBN13';
  const apiUrl = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx'
    + '?ttbkey=' + encodeURIComponent(ttbkey)
    + '&itemIdType=' + itemIdType
    + '&ItemId=' + encodeURIComponent(isbn)
    + '&output=js&Version=20131101&Cover=Big';

  try {
    const res = await fetch(apiUrl);
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      return jsonResponse({ error: '알라딘 응답을 해석하지 못했어요.' }, 502);
    }

    if (data.errorCode) {
      return jsonResponse({ error: data.errorMessage || '알라딘 조회 중 오류가 발생했어요.' }, 502);
    }

    const item = data.item && data.item[0];
    if (!item) {
      return jsonResponse({ error: '해당 ISBN으로 책을 찾을 수 없어요.' }, 404);
    }

    return jsonResponse({
      isbn: item.isbn13 || item.isbn || isbn,
      title: cleanTitle(item.title),
      author: item.author || '',
      publisher: item.publisher || '',
      cover: item.cover || '',
      link: item.link || ''
    });
  } catch (fetchErr) {
    return jsonResponse({ error: '알라딘 서버에 연결하지 못했어요.' }, 502);
  }
}

function cleanTitle(title) {
  // Aladin titles sometimes include a " - " subtitle/series suffix; keep as-is,
  // just trim whitespace.
  return (title || '').trim();
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
