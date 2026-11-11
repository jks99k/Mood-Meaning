@echo off
chcp 65001 > nul
echo ===================================================
echo [Mood & Meaning] GitHub 업로드 자동 실행 스크립트
echo ===================================================

echo [1/6] Git 저장소 초기화 중...
git init

echo [2/6] 업로드할 파일 장바구니에 담기 (.env, node_modules 자동 제외)...
git add .

echo [3/6] 현재 추가된 파일 목록 점검:
git status -s

echo [4/6] 첫 커밋 생성 중...
git commit -m "feat: Mood & Meaning 감성 분석 서비스 초기 버전 완성"

echo [5/6] 브랜치 이름을 main으로 설정 중...
git branch -M main

echo [6/6] 원격 저장소(origin) 연결 및 푸시 진행...
git remote remove origin 2>nul
git remote add origin https://github.com/jks99k/Mood-Meaning.git

echo GitHub로 전송(Push)을 시작합니다...
git push -u origin main

echo ===================================================
echo 완료되었습니다! GitHub 저장소를 확인해 보세요:
echo https://github.com/jks99k/Mood-Meaning
echo ===================================================
pause

