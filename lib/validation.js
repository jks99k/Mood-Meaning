/**
 * lib/validation.js
 * 
 * 입력값 및 AI 응답 데이터 검증 모듈
 * - 사용자의 입력 문장이 길이 및 형식 제한에 부합하는지 검증합니다.
 * - OpenAI가 생성한 응답이 약속된 스키마(규격)에 맞는지 엄격하게 검증합니다.
 */

// 허용되는 감정 분류 목록 (상수)
export const VALID_SENTIMENTS = ['positive', 'negative', 'neutral'];

// 최대 입력 글자 수 제한
export const MAX_TEXT_LENGTH = 2000;

// 최대 분석 이유 글자 수 제한
export const MAX_REASON_LENGTH = 500;

/**
 * 1. 클라이언트가 제출한 입력 텍스트 검증 함수
 * @param {unknown} text - 사용자가 입력한 값
 * @returns {{ isValid: boolean, sanitizedText?: string, error?: { code: string, message: string } }}
 */
export function validateInputText(text) {
  // 1-1. 텍스트가 문자열 타입인지 확인
  if (typeof text !== 'string') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '분석할 문장은 올바른 문자열 형식이어야 합니다.'
      }
    };
  }

  // 1-2. 앞뒤 공백 제거 (trim)
  const trimmedText = text.trim();

  // 1-3. 빈 문자열이거나 공백만 있는 경우 검사
  if (trimmedText.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '분석할 문장을 입력해 주세요. (공백만으로는 분석할 수 없습니다.)'
      }
    };
  }

  // 1-4. 최대 입력 길이(2,000자) 초과 여부 검사
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `문장의 길이는 최대 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력 가능합니다. (현재: ${trimmedText.length.toLocaleString()}자)`
      }
    };
  }

  // 모든 검증 통과 시 정리된 텍스트 반환
  return {
    isValid: true,
    sanitizedText: trimmedText
  };
}

/**
 * 2. OpenAI가 반환한 감성 분석 결과 데이터 검증 함수
 * @param {unknown} data - OpenAI API로부터 파싱된 객체
 * @returns {{ isValid: boolean, data?: { sentiment: 'positive'|'negative'|'neutral', confidence: number, reason: string }, error?: { code: string, message: string } }}
 */
export function validateAiResponse(data) {
  // 2-1. 데이터가 null이 아닌 순수 객체인지 확인
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: 'AI 분석 응답 형식이 올바르지 않습니다.'
      }
    };
  }

  const { sentiment, confidence, reason } = data;

  // 2-2. 감정(sentiment) 값 검증: 'positive', 'negative', 'neutral' 중 하나여야 함
  if (typeof sentiment !== 'string' || !VALID_SENTIMENTS.includes(sentiment.toLowerCase())) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: 'AI가 반환한 감정 분류 값이 유효하지 않습니다.'
      }
    };
  }

  // 2-3. 신뢰도(confidence) 값 검증: 0 이상 100 이하의 정수여야 함
  const isInteger = Number.isInteger(confidence);
  if (!isInteger || confidence < 0 || confidence > 100) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: 'AI가 반환한 신뢰도 점수가 0~100 사이의 정수가 아닙니다.'
      }
    };
  }

  // 2-4. 분석 이유(reason) 값 검증: 비어있지 않은 문자열이어야 함
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: 'AI가 반환한 분석 이유가 비어 있습니다.'
      }
    };
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length > MAX_REASON_LENGTH) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_AI_RESPONSE',
        message: 'AI가 반환한 분석 이유의 길이가 제한을 초과했습니다.'
      }
    };
  }

  // 모든 검증 통과 시 표준화된 결과 반환
  return {
    isValid: true,
    data: {
      sentiment: sentiment.toLowerCase(),
      confidence,
      reason: trimmedReason
    }
  };
}

