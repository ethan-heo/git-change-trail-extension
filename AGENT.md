# Agent Guide

이 문서는 Git Author Explorer 확장을 구현하거나 수정하는 에이전트가 작업 전에 반드시 참고해야 할 기준을 정리한다.

## 작업 전 확인 순서

1. [docs/README.md](./docs/README.md)를 먼저 읽어 문서 구조를 파악한다.
2. 기능 요구사항을 확인해야 하면 [docs/design/requirements.md](./docs/design/requirements.md)를 읽는다.
3. 전체 구조나 책임 분리를 확인해야 하면 [docs/design/architecture.md](./docs/design/architecture.md)를 읽는다.
4. 작업 대상 컴포넌트에 맞는 구현 계획서를 읽는다.
5. 기존 결정과 다른 방향의 변경이 필요하면 [docs/planning/decision-log.md](./docs/planning/decision-log.md)를 확인하고, 변경 이유를 문서에 남긴다.

## 작업 유형별 참고 문서

| 작업 유형 | 먼저 볼 문서 |
|-----------|--------------|
| 제품 방향, 원본 기획 확인 | [docs/overview/git-author-explorer-plan.md](./docs/overview/git-author-explorer-plan.md) |
| 요구사항 추가/수정 | [docs/design/requirements.md](./docs/design/requirements.md) |
| 구조 변경, provider/command/message 흐름 수정 | [docs/design/architecture.md](./docs/design/architecture.md) |
| Git CLI 연동, 저자 조회, 파일 목록 조회 | [docs/implementation/git-service-plan.md](./docs/implementation/git-service-plan.md) |
| 파일 트리, 파일 열기, diff 열기 | [docs/implementation/file-tree-provider-plan.md](./docs/implementation/file-tree-provider-plan.md) |
| Webview UI, 입력 폼, 메시지 통신 | [docs/implementation/webview-ui-plan.md](./docs/implementation/webview-ui-plan.md) |
| 일정, 구현 순서, 범위 조정 | [docs/planning/milestones.md](./docs/planning/milestones.md) |
| QA, 테스트, 패키징, 배포 | [docs/release/qa-release-plan.md](./docs/release/qa-release-plan.md) |

## 구현 원칙

- 문서에 정의된 MVP 범위를 우선 구현한다.
- Post-MVP 기능은 사용자가 명시적으로 요청하거나 MVP 구현에 영향을 주지 않는 경우에만 진행한다.
- Git 관련 로직은 `GitService`로 격리한다.
- UI 상태와 입력 처리는 `WebviewViewProvider`와 Webview script에 집중한다.
- 파일 트리 변환과 Tree View 렌더링은 `FileTreeProvider` 책임으로 둔다.
- Extension Host와 Webview 사이의 메시지 payload는 `docs/design/architecture.md`의 메시지 계약을 기준으로 한다.
- 기존 결정과 충돌하는 변경은 먼저 `docs/planning/decision-log.md`에 결정 이력을 갱신한다.

## 수정 시 문서 갱신 기준

다음 변경이 있으면 코드와 함께 관련 문서를 갱신한다.

- 기능 요구사항이 추가, 삭제, 변경됨
- 컴포넌트 책임이나 데이터 흐름이 바뀜
- Git 명령, 파싱 규칙, 오류 처리 방식이 바뀜
- Webview 메시지 타입이나 payload가 바뀜
- 파일 열기 또는 diff 열기 방식이 바뀜
- 마일스톤 범위나 구현 순서가 바뀜
- 테스트, 패키징, 배포 절차가 바뀜

## 검증 기준

작업 완료 전 다음을 확인한다.

- 변경한 기능이 [docs/design/requirements.md](./docs/design/requirements.md)의 요구사항과 맞는지 확인한다.
- 컴포넌트 책임이 [docs/design/architecture.md](./docs/design/architecture.md)와 어긋나지 않는지 확인한다.
- 관련 구현 계획서의 테스트 계획을 기준으로 가능한 테스트를 실행한다.
- 테스트를 실행하지 못했다면 이유와 남은 위험을 최종 응답에 명확히 남긴다.
- 문서 경로나 파일 이동이 있었다면 [docs/README.md](./docs/README.md)의 링크를 함께 갱신한다.

## 우선 구현 범위

현재 우선순위는 MVP 구현이다.

1. VSCode 확장 프로젝트 초기화
2. `GitService` 구현
3. `FileTreeProvider` 구현
4. `WebviewViewProvider` 구현
5. 검색 플로우 통합
6. QA 및 패키징 준비

