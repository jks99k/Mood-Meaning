/**
 * test/api.test.js
 * 
 * /api/analyze 엔드포인트 핸들러 테스트
 * - POST 이외 메서드 거부 (405 Method Not Allowed)
 * - 잘못된 본문 데이터 및 빈 값 거부 (400 Invalid Input)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import analyzeHandler from '../api/analyze.js';

// 가상 응답 객체 Mock 생성기
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    bodyData: null,
    setHeader(key, val) {
      this.headers[key] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.bodyData = data;
      return this;
    }
  };
  return res;
}

test('API 핸들러: GET 메서드 요청 시 405 Method Not Allowed 반환', async () => {
  const req = {
    method: 'GET',
    headers: {},
    body: {}
  };
  const res = createMockResponse();

  await analyzeHandler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.bodyData?.success, false);
  assert.equal(res.bodyData?.error?.code, 'METHOD_NOT_ALLOWED');
});

test('API 핸들러: 빈 텍스트 입력 시 400 INVALID_INPUT 반환', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: { text: '   ' }
  };
  const res = createMockResponse();

  await analyzeHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.bodyData?.success, false);
  assert.equal(res.bodyData?.error?.code, 'INVALID_INPUT');
});

test('API 핸들러: 2,000자 초과 텍스트 입력 시 400 INVALID_INPUT 반환', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: { text: 'A'.repeat(2001) }
  };
  const res = createMockResponse();

  await analyzeHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.bodyData?.success, false);
  assert.equal(res.bodyData?.error?.code, 'INVALID_INPUT');
});

