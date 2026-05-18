# Git File Explorer 개발 문서

이 디렉토리는 Git File Explorer 확장의 설계와 구현 계획을 담은 개발 문서 모음입니다.

> **2026-05-18 피벗**: 기존 "저자 기반 파일 검색" MVP에서 "파일 기반 커밋 이력 탐색"으로 기능이 전면 전환되었습니다. 변경 이유는 [decision-log.md](./planning/decision-log.md)를 참고하세요.

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
| [requirements.md](./design/requirements.md) | MVP/Post-MVP 요구사항과 사용자 시나리오 |
| [architecture.md](./design/architecture.md) | 확장 전체 구조, 데이터 흐름, 컴포넌트 책임 |

### Implementation

| 문서 | 목적 |
|------|------|
| [git-service-plan.md](./implementation/git-service-plan.md) | Git CLI 연동, 파일 이력/커밋 파일/파일 내용 조회 계획 |
| [file-tree-provider-plan.md](./implementation/file-tree-provider-plan.md) | CommitHistoryProvider, CommitFilesProvider 구현 계획 |
| [webview-ui-plan.md](./implementation/webview-ui-plan.md) | 패널 인터랙션 계획 (Tree View, QuickPick, Editor Title Actions) |

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

1. `package.json` contribution 재구성 (views, commands, menus)
2. `GitService` 구현 및 단위 테스트
3. `CommitHistoryProvider` 구현 (에디터 추적, 날짜 필터, 핀)
4. `CommitFilesProvider` 구현 (변경 파일 트리, 비교 상태 표시)
5. `RevisionContentProvider` 구현 및 diff 연결
6. 전체 플로우 QA
7. 패키징 및 README/스크린샷 정리
