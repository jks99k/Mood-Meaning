/**
 * js/app.js
 * 
 * Mood & Meaning 프론트엔드 인터랙션 스크립트 (Vanilla JavaScript)
 * - 사용자 입력 텍스트 길이 실시간 계산 및 사전 유효성 검사
 * - 로딩 상태 및 중복 제출 방지
 * - 백엔드 API (/api/analyze) 비동기 통신
 * - XSS(교차 사이트 스크립팅) 방지를 위한 안전한 textContent 기반 렌더링
 */

// 엄격 모드 활성화
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 필요한 DOM 요소 참조 가져오기
  const form = document.getElementById('sentiment-form');
  const textInput = document.getElementById('text-input');
  const currentCharsSpan = document.getElementById('current-chars');
  const charCountWrap = document.getElementById('char-count');
  const submitBtn = document.getElementById('submit-btn');
  const errorMessage = document.getElementById('error-message');

  // 결과 카드 관련 요소
  const resultCard = document.getElementById('result-card');
  const sentimentBadge = document.getElementById('sentiment-badge');
  const sentimentIcon = document.getElementById('sentiment-icon');
  const sentimentLabel = document.getElementById('sentiment-label');
  const confidenceValue = document.getElementById('confidence-value');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressBarWrap = document.getElementById('progress-bar-wrap');
  const reasonText = document.getElementById('reason-text');
  const saveStatusBadge = document.getElementById('save-status-badge');
  const saveStatusText = document.getElementById('save-status-text');

  // 최대 허용 글자 수 (2,000자)
  const MAX_CHAR_LIMIT = 2000;

  // 감정 분류별 한국어 라벨 및 기호 정의
  const SENTIMENT_META = {
    positive: { label: '긍정', icon: '+', className: 'positive' },
    negative: { label: '부정', icon: '−', className: 'negative' },
    neutral:  { label: '중립', icon: '○', className: 'neutral' }
  };

  /**
   * 2. 에러 메시지 표시/숨김 헬퍼 함수
   */
  function showError(message) {
    if (!message) {
      errorMessage.textContent = '';
      errorMessage.hidden = true;
      return;
    }
    // 보안: innerHTML 대신 textContent를 사용하여 XSS 공격 완벽 차단
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function clearError() {
    showError(null);
  }

  /**
   * 3. 텍스트 입력창 글자 수 실시간 반영 이벤트
   */
  textInput.addEventListener('input', () => {
    const length = textInput.value.length;
    currentCharsSpan.textContent = length.toLocaleString();

    // 2,000자 초과 시 시각적 경고 색상 표시
    if (length > MAX_CHAR_LIMIT) {
      charCountWrap.classList.add('limit-warning');
    } else {
      charCountWrap.classList.remove('limit-warning');
    }

    // 입력 중에는 기존 에러 메시지 초기화
    if (errorMessage.textContent) {
      clearError();
    }
  });

  /**
   * 4. 폼 제출(Submit) 이벤트 처리
   */
  form.addEventListener('submit', async (event) => {
    // 기본 새로고침 동작 차단
    event.preventDefault();

    // 이전 오류 초기화
    clearError();

    // 앞뒤 공백 제거
    const text = textInput.value.trim();

    // 4-1. 클라이언트 1차 유효성 검사 (빈 문장)
    if (!text) {
      showError('분석할 문장을 입력해 주세요. (공백만으로는 분석할 수 없습니다.)');
      textInput.focus();
      return;
    }

    // 4-2. 2,000자 초과 검사
    if (text.length > MAX_CHAR_LIMIT) {
      showError(`문장의 길이는 최대 ${MAX_CHAR_LIMIT.toLocaleString()}자까지 입력 가능합니다.`);
      textInput.focus();
      return;
    }

    // 4-3. 요청 시작: 버튼 비활성화 및 로딩 UI 표시 (중복 제출 방지)
    setLoadingState(true);

    try {
      // 4-4. 백엔드 API 요청
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const responseData = await response.json();

      // 서버 응답 오류 처리
      if (!response.ok || !responseData.success) {
        const errorMsg = responseData?.error?.message || '분석 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        showError(errorMsg);
        return;
      }

      // 4-5. 성공 응답 화면 렌더링
      renderResult(responseData.result, responseData.saved);

    } catch (networkError) {
      // 네트워크 연결 오류 처리
      showError('네트워크 연결이 불안정하거나 서버와 통신할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      // 4-6. 완료 후 로딩 상태 해제
      setLoadingState(false);
    }
  });

  /**
   * 5. 로딩 상태 전환 함수
   */
  function setLoadingState(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitBtn.querySelector('.btn-text').textContent = '문장 분석 중...';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      submitBtn.querySelector('.btn-text').textContent = '감성 분석 시작';
    }
  }

  /**
   * 6. 분석 결과 화면 렌더링 함수
   */
  function renderResult(result, isSaved) {
    const { sentiment, confidence, reason } = result;

    // 감정 메타데이터 매핑
    const meta = SENTIMENT_META[sentiment] || SENTIMENT_META.neutral;

    // 감정 배지 클래스 업데이트
    sentimentBadge.className = `sentiment-badge ${meta.className}`;
    sentimentIcon.textContent = meta.icon;
    sentimentLabel.textContent = meta.label;

    // 신뢰도 점수 및 진행 바 업데이트 (0 ~ 100)
    const validConfidence = Math.min(100, Math.max(0, Number(confidence) || 0));
    confidenceValue.textContent = `${validConfidence}%`;
    progressBarFill.style.width = `${validConfidence}%`;
    progressBarWrap.setAttribute('aria-valuenow', validConfidence);

    // 분석 근거 텍스트 설정 (보안 준수: textContent 사용)
    reasonText.textContent = reason;

    // 데이터베이스 저장 상태 표시
    if (isSaved) {
      saveStatusBadge.className = 'save-status-badge success';
      saveStatusBadge.textContent = '기록 저장 완료';
      saveStatusText.textContent = '분석 결과가 데이터베이스에 안전하게 기록되었습니다.';
    } else {
      saveStatusBadge.className = 'save-status-badge failed';
      saveStatusBadge.textContent = '기록 저장 건너뜀';
      saveStatusText.textContent = 'DB 연동이 설정되지 않았거나 일시적인 장애로 기록 저장을 건너뛰었습니다. (분석 결과 표시는 정상입니다)';
    }

    // 결과 카드 보이기
    resultCard.hidden = false;

    // 부드럽게 결과 카드 위치로 스크롤 이동
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

