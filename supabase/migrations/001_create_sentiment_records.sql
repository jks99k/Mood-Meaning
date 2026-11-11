-- ==============================================================================
-- 001_create_sentiment_records.sql
-- 목적: 감성 분석 웹 서비스(Mood & Meaning)의 분석 결과 저장용 테이블 생성 및 보안(RLS) 설정
-- ==============================================================================

-- 1. 테이블 생성
-- 사용자가 입력한 문장과 AI 분석 결과(감정, 신뢰도, 분석 이유), 분석 모델, 생성 시각을 저장합니다.
CREATE TABLE IF NOT EXISTS public.sentiment_records (
    -- 고유 식별자 (자동 생성 UUID)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 분석 대상 입력 문장 (최대 2,000자 제한)
    text TEXT NOT NULL,

    -- 감정 분류 결과: 'positive'(긍정), 'negative'(부정), 'neutral'(중립)만 허용
    sentiment VARCHAR(20) NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),

    -- 모델 신뢰도 추정치: 0부터 100까지의 정수만 허용
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

    -- 감정 판단 근거/이유 (AI가 생성한 1~2문장의 설명)
    reason TEXT NOT NULL,

    -- 분석에 사용된 OpenAI 모델명 (예: gpt-4o-mini)
    model VARCHAR(100) NOT NULL,

    -- 기록 생성 일시 (기본값: 데이터가 입력된 현재 시간, UTC 기준)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 테이블 및 컬럼 설명(주석) 추가
COMMENT ON TABLE public.sentiment_records IS '감성 분석 결과 저장 테이블';
COMMENT ON COLUMN public.sentiment_records.id IS '레코드 고유 식별자 (UUID)';
COMMENT ON COLUMN public.sentiment_records.text IS '사용자가 입력한 원본 문장';
COMMENT ON COLUMN public.sentiment_records.sentiment IS '감정 분류 결과 (positive/negative/neutral)';
COMMENT ON COLUMN public.sentiment_records.confidence IS '모델 추정 신뢰도 (0~100%)';
COMMENT ON COLUMN public.sentiment_records.reason IS '감정 분석 이유 설명';
COMMENT ON COLUMN public.sentiment_records.model IS '분석에 사용된 AI 모델명';
COMMENT ON COLUMN public.sentiment_records.created_at IS '분석 일시 (UTC)';

-- 빠른 조회를 위한 생성 일시 인덱스
CREATE INDEX IF NOT EXISTS idx_sentiment_records_created_at 
ON public.sentiment_records (created_at DESC);


-- ==============================================================================
-- 2. 보안 설정 (Row Level Security - RLS 활성화)
-- ==============================================================================
-- 설명:
-- RLS를 켜두면 브라우저(익명 사용자)가 Supabase의 공개 API 키(anon key)를 탈취하더라도
-- 임의로 테이블 데이터를 읽거나 수정, 삭제할 수 없습니다.
-- 오직 백엔드 서버에서 SUPABASE_SERVICE_ROLE_KEY(최고 관리자 키)를 사용해서만 데이터를 저장할 수 있도록 보호합니다.
ALTER TABLE public.sentiment_records ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 삭제 후 재생성 (초기화 보장)
DROP POLICY IF EXISTS "Service role can insert sentiment records" ON public.sentiment_records;
DROP POLICY IF EXISTS "Deny all public access" ON public.sentiment_records;

-- 일반 공개(anon, authenticated) 사용자의 직접 접근은 기본적으로 모두 거부됩니다.
-- (Supabase의 Service Role 키는 RLS를 자동으로 우회하므로 서버에서만 안전하게 INSERT 할 수 있습니다.)

