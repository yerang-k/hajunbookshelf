/**
 * 공용 독서기록 백엔드 (Google Apps Script Web App)
 *
 * 하준이의 책장, 예랑의 책장 두 앱이 이 스크립트 하나를 함께 써요.
 * 스프레드시트 안에 앱별로 다른 "탭(시트)"을 만들어서 데이터를 나눠 저장해요
 * (기본값: 하준이의 책장 -> "하준이" 탭, 예랑의 책장 -> "예랑" 탭).
 *
 * 배포 방법:
 * 1. 본인 구글 계정으로 새 스프레드시트 하나 생성 (또는 기존 것 사용)
 * 2. 스프레드시트 메뉴 -> 확장 프로그램 -> Apps Script
 * 3. 열린 편집기에 기본 코드 전부 지우고 이 파일 내용 붙여넣기
 * 4. 저장 -> 배포 -> 새 배포
 *    - 유형: 웹 앱
 *    - 실행: 나
 *    - 액세스 권한: 누구나 (익명 사용자 포함)
 * 5. 배포 후 나오는 웹 앱 URL을 복사
 * 6. 각 앱의 설정 화면에 그 URL을 "스프레드시트 연동 URL"로 붙여넣기
 *
 * 각 행 = 읽은 기록 한 건. 같은 책을 여러 번 읽으면 행이 여러 개 생겨요.
 */

var COLUMNS = ['ISBN', '제목', '저자', '출판사', '표지', '링크', '분류', '날짜', '이모지', '메모', '등록시각'];

function doGet(e) {
  try {
    var sheetName = (e.parameter.sheet || 'Sheet1').toString();
    var sheet = getOrCreateSheet_(sheetName);
    var books = readBooks_(sheet);
    return jsonOut_({ books: books });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheetName = (payload.sheet || 'Sheet1').toString();
    var sheet = getOrCreateSheet_(sheetName);
    var action = payload.action;

    if (action === 'addRead') {
      var b = payload.book || {};
      var r = payload.read || {};
      sheet.appendRow([
        b.isbn || '', b.title || '', b.author || '', b.publisher || '',
        b.cover || '', b.link || '', b.category || '',
        r.date || '', r.emoji || '', r.note || '', r.ts || Date.now()
      ]);
      return jsonOut_({ ok: true });
    }

    if (action === 'deleteRead') {
      deleteRowsWhere_(sheet, function(rec) { return String(rec['등록시각']) === String(payload.ts); });
      return jsonOut_({ ok: true });
    }

    if (action === 'deleteBook') {
      deleteRowsWhere_(sheet, function(rec) { return String(rec['ISBN']) === String(payload.isbn); });
      return jsonOut_({ ok: true });
    }

    if (action === 'replaceAll') {
      // Bulk sync: wipe the tab and rewrite from the given books object.
      // Used for a one-time upload of existing localStorage data into the sheet.
      var books = payload.books || {};
      sheet.clearContents();
      sheet.appendRow(COLUMNS);
      Object.keys(books).forEach(function(isbn) {
        var b = books[isbn];
        (b.reads || []).forEach(function(r) {
          sheet.appendRow([
            b.isbn || isbn, b.title || '', b.author || '', b.publisher || '',
            b.cover || '', b.link || '', b.category || '',
            r.date || '', r.emoji || '', r.note || '', r.ts || Date.now()
          ]);
        });
      });
      return jsonOut_({ ok: true });
    }

    return jsonOut_({ error: '알 수 없는 action: ' + action });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(COLUMNS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  }
  return sheet;
}

function readBooks_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  var headers = values[0];
  var books = {};
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rec = {};
    headers.forEach(function(h, idx) { rec[h] = row[idx]; });
    var isbn = String(rec['ISBN'] || '');
    if (!isbn) continue;
    if (!books[isbn]) {
      books[isbn] = {
        isbn: isbn, title: rec['제목'] || '', author: rec['저자'] || '',
        publisher: rec['출판사'] || '', cover: rec['표지'] || '', link: rec['링크'] || '',
        category: rec['분류'] || '', reads: []
      };
    }
    books[isbn].reads.push({
      date: rec['날짜'] || '', emoji: rec['이모지'] || '', note: rec['메모'] || '',
      ts: Number(rec['등록시각']) || 0
    });
  }
  return books;
}

function deleteRowsWhere_(sheet, matchFn) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rowsToDelete = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rec = {};
    headers.forEach(function(h, idx) { rec[h] = row[idx]; });
    if (matchFn(rec)) rowsToDelete.push(i + 1); // 1-indexed sheet row
  }
  // delete from the bottom up so row indices don't shift under us
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
