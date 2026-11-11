/**
 * api/analyze.js
 * 
 * 감성 분석 Vercel Serverless Function (백엔드 엔드포인트)
 * - HTTP POST /api/analyze 요청을 수신하여 문장을 분석하고 결과를 반환합니다.
 * - 입력 검증 -> OpenAI 분석 -> AI 응답 검증 -> Supabase 저장 -> 클라이언트 응답의 전 과정을 제어합니다.
 */

import dotenv from 'dotenv';
// 로컬 개발 환경에서 .env 파일을 읽어올 수 있도록 설정
dotenv.config();

import { validateInputText, validateAiResponse } from '../lib/validation.js';
import { analyzeSentimentWithOpenAI } from '../lib/openai.js';
import { saveSentimentRecord } from '../lib/supabase.js';

/**
 * Vercel Serverless Function 메인 핸들러
 * @param {import('http').IncomingMessage} req - 요청 객체
 * @param {import('http').ServerResponse} res - 응답 객체
 */
export default async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 1. HTTP 메서드 검사 (POST만 허용)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '지원하지 않는 요청 방식입니다. POST 메서드만 허용됩니다.'
      }
    });
  }

  try {
    // 2. 요청 본문 파싱 (문자열 또는 객체 처리)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '올바른 JSON 형식의 본문 데이터를 보내주세요.'
          }
        });
      }
    }

    const rawText = body?.text;

    // 3. 서버 측 입력값 유효성 검사 (타입, 공백, 2,000자 제한)
    const textValidation = validateInputText(rawText);
    if (!textValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: textValidation.error
      });
    }

    const sanitizedText = textValidation.sanitizedText;

    // 4. OpenAI API 감성 분석 요청
    const aiRawResult = await analyzeSentimentWithOpenAI(sanitizedText);

    // 5. AI 응답 데이터 스키마 및 값 범위 검증
    const aiValidation = validateAiResponse(aiRawResult);
    if (!aiValidation.isValid) {
      return res.status(502).json({
        success: false,
        error: aiValidation.error
      });
    }

    const { sentiment, confidence, reason } = aiValidation.data;

    // 6. Supabase 데이터베이스에 분석 결과 저장 시도
    // (주의: 저장이 실패하더라도 사용자는 AI 분석 결과를 볼 수 있어야 하므로 saved 값만 false로 전달)
    const isSaved = await saveSentimentRecord({
      text: sanitizedText,
      sentiment: sentiment,
      confidence: confidence,
      reason: reason,
      model: aiRawResult.model
    });

    // 7. 최종 성공 응답 반환 (HTTP 200)
    return res.status(200).json({
      success: true,
      result: {
        sentiment: sentiment,
        confidence: confidence,
        reason: reason
      },
      saved: isSaved
    });

  } catch (error) {
    // 보안 준수: 스택 트레이스나 민감한 정보는 클라이언트에 절대 보내지 않음
    console.error('[서버 에러 발생]:', error.message);

    // 에러 코드별 적절한 HTTP 상태 코드 반환
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = '서버에서 요청을 처리하는 중 오류가 발생했습니다.';

    if (error.code === 'CONFIG_ERROR') {
      statusCode = 500;
      errorCode = 'CONFIG_ERROR';
      errorMessage = error.message;
    } else if (error.code === 'AI_AUTH_ERROR') {
      statusCode = 502;
      errorCode = 'AI_AUTH_ERROR';
      errorMessage = error.message;
    } else if (error.code === 'RATE_LIMITED') {
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
      errorMessage = error.message;
    } else if (error.code === 'INVALID_AI_RESPONSE') {
      statusCode = 502;
      errorCode = 'INVALID_AI_RESPONSE';
      errorMessage = error.message;
    } else if (error.code === 'AI_PROVIDER_ERROR') {
      statusCode = 502;
      errorCode = 'AI_PROVIDER_ERROR';
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    });
  }
}

