/**
 * lib/supabase.js
 * 
 * Supabase 데이터베이스 연동 모듈
 * - 성공적으로 분석된 감성 분석 결과를 Supabase의 'sentiment_records' 테이블에 저장합니다.
 * - [중요 원칙]: 만약 DB 장애로 저장이 실패하더라도 사용자는 AI 분석 결과를 확인할 수 있어야 하므로,
 *   예외를 던져 전체 프로세스를 중단시키지 않고 저장 실패 상태(false)만 안전하게 반환합니다.
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Supabase 클라이언트 초기화 함수
 */
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 설정값이 없거나 기본 플레이스홀더 그대로인 경우
  if (
    !supabaseUrl || 
    !serviceRoleKey || 
    supabaseUrl.includes('your-project-id') || 
    serviceRoleKey.includes('your_supabase_service_role_key_here')
  ) {
    console.warn('[경고] Supabase 환경변수가 설정되지 않았거나 기본값 상태입니다. 저장을 건너뜁니다.');
    return null;
  }

  // 서버 전용 Service Role Key를 사용하여 클라이언트 생성
  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}

/**
 * 감성 분석 결과를 데이터베이스에 저장하는 함수
 * @param {Object} record - 저장할 데이터 객체
 * @param {string} record.text - 원본 문장
 * @param {'positive'|'negative'|'neutral'} record.sentiment - 감정
 * @param {number} record.confidence - 신뢰도 (0~100)
 * @param {string} record.reason - 분석 이유
 * @param {string} record.model - 사용된 모델명
 * @returns {Promise<boolean>} 저장 성공 시 true, 실패 시 false
 */
export async function saveSentimentRecord({ text, sentiment, confidence, reason, model }) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false; // DB 설정이 안 되어 있으면 저장 실패로 처리 (분석 결과 표시는 계속 진행)
    }

    const { error } = await supabase
      .from('sentiment_records')
      .insert([
        {
          text: text,
          sentiment: sentiment,
          confidence: confidence,
          reason: reason,
          model: model
        }
      ]);

    if (error) {
      // 보안 준수: 로그에 사용자의 입력 문장(개인정보)을 출력하지 않고 에러 코드/메시지만 기록
      console.error('[Supabase 저장 실패]:', error.message);
      return false;
    }

    return true; // 저장 성공
  } catch (err) {
    console.error('[Supabase 예외 발생]:', err.message);
    return false; // 예외 발생 시에도 false 반환
  }
}

