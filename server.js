/**
 * server.js
 * 
 * 로컬 개발 및 테스트용 내장 웹 서버
 * - 별도의 외부 프레임워크나 CLI 설치 없이 순수 Node.js 환경에서
 *   정적 프론트엔드(HTML/CSS/JS)와 백엔드 API(/api/analyze)를 동시에 로컬에서 구동합니다.
 * - 사용법: npm start 또는 node server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// .env 환경변수 로드
dotenv.config();

// ES 모듈 환경에서 현재 디렉터리 경로 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// api/analyze.js 핸들러 동적 가져오기
import analyzeHandler from './api/analyze.js';

// MIME 타입 매핑 표
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const PORT = process.env.PORT || 3000;

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // 1. API 요청 처리 (/api/analyze)
  if (pathname === '/api/analyze') {
    // Vercel Serverless Function과 호환되도록 req/res 객체 보강 (Helper 함수 부착)
    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });

    req.on('end', async () => {
      // 본문 파싱 시도
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (err) {
        req.body = bodyData;
      }

      // res.status(code).json(payload) 헬퍼 메서드 추가
      res.status = function (statusCode) {
        res.statusCode = statusCode;
        return {
          json: function (data) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
          }
        };
      };

      try {
        await analyzeHandler(req, res);
      } catch (handlerErr) {
        console.error('[API 핸들러 에러]:', handlerErr);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: '서버 내부 오류가 발생했습니다.'
            }
          }));
        }
      }
    });

    return;
  }

  // 2. 정적 웹 파일 서빙 (HTML, CSS, JS)
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(__dirname, filePath));

  // 상위 경로 탐색 방지 (Directory Traversal 취약점 차단)
  if (!safePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(safePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('404 Not Found - 요청하신 파일을 찾을 수 없습니다.');
      } else {
        res.statusCode = 500;
        res.end(`서버 에러: ${err.code}`);
      }
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content);
    }
  });
});

// 서버 포트 리스닝 시작
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 [Mood & Meaning] 감성 분석 로컬 서버가 시작되었습니다!`);
  console.log(`👉 브라우저 주소: http://localhost:${PORT}`);
  console.log('====================================================');
});

