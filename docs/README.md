# Git Author Explorer 개발 문서

이 디렉토리는 `overview/git-author-explorer-plan.md`의 기획 내용을 용도별로 나눈 개발 문서 모음입니다.

## 디렉토리 구조

| 디렉토리 | 목적 |
|----------|------|
| [overview](./overview/) | 원본 기획서와 제품 개요 |
| [design](./design/) | 요구사항, 아키텍처, 데이터 흐름 |
| [implementation](./implementation/) | 구현 컴포넌트별 개발 계획 |
| [planning](./planning/) | 마일스톤과 의사결정 이력 |
| [release](./release/) | QA, 테스트, 패키징, 배포 준비 |

## 문서 목록

### Overview

| 문서 | 목적 |
|------|------|
| [git-author-explorer-plan.md](./overview/git-author-explorer-plan.md) | 전체 기획 원문 |

### Design

| 문서 | 목적 |
|------|------|
| [requirements.md](./design/requirements.md) | MVP/Post-MVP 요구사항과 사용자 시나리오 정리 |
| [architecture.md](./design/architecture.md) | 확장 전체 구조, 데이터 흐름, 컴포넌트 책임 |

### Implementation

| 문서 | 목적 |
|------|------|
| [git-service-plan.md](./implementation/git-service-plan.md) | Git CLI 연동, 저자 조회, 파일 변경 목록 조회 계획 |
| [file-tree-provider-plan.md](./implementation/file-tree-provider-plan.md) | 파일 경로를 VSCode 트리로 변환하고 여는 기능 계획 |
| [webview-ui-plan.md](./implementation/webview-ui-plan.md) | 사이드바 Webview UI와 인터랙션 구현 계획 |

### Planning

| 문서 | 목적 |
|------|------|
| [milestones.md](./planning/milestones.md) | 개발 마일스톤, 작업 순서, 예상 기간 |
| [decision-log.md](./planning/decision-log.md) | 확정된 기술/UX 결정 이력 |

### Release

| 문서 | 목적 |
|------|------|
| [qa-release-plan.md](./release/qa-release-plan.md) | 검증 항목, 테스트 범위, 패키징/배포 준비 |

## 구현 순서

1. 프로젝트 스캐폴딩과 `package.json` contribution 설정
2. `GitService` 구현 및 단위 테스트
3. `FileTreeProvider` 구현 및 파일 열기 연결
4. `WebviewViewProvider` 구현 및 메시지 통신 연결
5. 전체 플로우 QA
6. 패키징 및 README/스크린샷 정리
