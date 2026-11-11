/**
 * test/validation.test.js
 * 
 * 입력값 및 AI 응답 유효성 검증 단위 테스트
 * - Node.js 내장 테스트 러너(node --test)를 사용하여 외부 라이브러리 없이 실행됩니다.
 * - 수용 기준(PRD 및 docs/06-testing-deployment.md)에 명시된 필수 검증 조건을 자동 검증합니다.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInputText, validateAiResponse, MAX_TEXT_LENGTH } from '../lib/validation.js';

// ==============================================================================
// 1. 입력 텍스트 검증(validateInputText) 테스트
// ==============================================================================

test('입력 텍스트: 빈 문자열 또는 공백만 있는 경우 거부되어야 함', () => {
  const emptyResult = validateInputText('');
  assert.equal(emptyResult.isValid, false);
  assert.equal(emptyResult.error?.code, 'INVALID_INPUT');

  const spacesResult = validateInputText('     \n\t   ');
  assert.equal(spacesResult.isValid, false);
  assert.equal(spacesResult.error?.code, 'INVALID_INPUT');
});

test('입력 텍스트: 문자열이 아닌 다른 타입(숫자, 객체, null 등)은 거부되어야 함', () => {
  const nullResult = validateInputText(null);
  assert.equal(nullResult.isValid, false);

  const numberResult = validateInputText(12345);
  assert.equal(numberResult.isValid, false);

  const objResult = validateInputText({ text: '안녕하세요' });
  assert.equal(objResult.isValid, false);
});

test('입력 텍스트: 앞뒤 공백이 제거되고 정상 문자열이 통과되어야 함', () => {
  const validSentence = '   오늘 하루도 정말 보람차고 즐거웠습니다.   ';
  const result = validateInputText(validSentence);

  assert.equal(result.isValid, true);
  assert.equal(result.sanitizedText, '오늘 하루도 정말 보람차고 즐거웠습니다.');
});

test('입력 텍스트: 최대 허용 길이(2,000자) 경계값 테스트', () => {
  // 정확히 2,000자
  const exactLimitText = '가'.repeat(MAX_TEXT_LENGTH);
  const exactResult = validateInputText(exactLimitText);
  assert.equal(exactResult.isValid, true);
  assert.equal(exactResult.sanitizedText?.length, MAX_TEXT_LENGTH);

  // 2,001자 (1자 초과)
  const overLimitText = '가'.repeat(MAX_TEXT_LENGTH + 1);
  const overResult = validateInputText(overLimitText);
  assert.equal(overResult.isValid, false);
  assert.equal(overResult.error?.code, 'INVALID_INPUT');
});


// ==============================================================================
// 2. AI 응답 스키마 검증(validateAiResponse) 테스트
// ==============================================================================

test('AI 응답: 정상적인 positive, negative, neutral 응답 통과', () => {
  const samplePositive = {
    sentiment: 'positive',
    confidence: 95,
    reason: '성취감과 기쁨을 나타내는 단어가 풍부합니다.'
  };
  const posResult = validateAiResponse(samplePositive);
  assert.equal(posResult.isValid, true);
  assert.equal(posResult.data?.sentiment, 'positive');

  const sampleNegative = {
    sentiment: 'NEGATIVE', // 대소문자 무관하게 소문자로 정규화
    confidence: 88,
    reason: '실망과 불편함이 명시되어 있습니다.'
  };
  const negResult = validateAiResponse(sampleNegative);
  assert.equal(negResult.isValid, true);
  assert.equal(negResult.data?.sentiment, 'negative');

  const sampleNeutral = {
    sentiment: 'neutral',
    confidence: 70,
    reason: '감정 표현 없이 사실 정보만 전달하고 있습니다.'
  };
  const neuResult = validateAiResponse(sampleNeutral);
  assert.equal(neuResult.isValid, true);
  assert.equal(neuResult.data?.sentiment, 'neutral');
});

test('AI 응답: 허용되지 않은 감정 분류 값은 거부되어야 함', () => {
  const invalidSentiment = {
    sentiment: 'happy', // positive/negative/neutral 이외의 값
    confidence: 80,
    reason: '행복합니다.'
  };
  const result = validateAiResponse(invalidSentiment);
  assert.equal(result.isValid, false);
  assert.equal(result.error?.code, 'INVALID_AI_RESPONSE');
});

test('AI 응답: confidence(신뢰도)가 0~100 범위를 벗어나거나 정수가 아니면 거부되어야 함', () => {
  // 음수
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: -1, reason: '이유' }).isValid, false);

  // 100 초과
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: 101, reason: '이유' }).isValid, false);

  // 소수점 (정수가 아님)
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: 85.5, reason: '이유' }).isValid, false);

  // 문자열 숫자
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: '90', reason: '이유' }).isValid, false);
});

test('AI 응답: reason(분석 이유)이 비어있거나 누락되면 거부되어야 함', () => {
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: 80, reason: '' }).isValid, false);
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: 80, reason: '   ' }).isValid, false);
  assert.equal(validateAiResponse({ sentiment: 'positive', confidence: 80 }).isValid, false);
});

