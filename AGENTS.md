# Agent Guide

이 문서는 Git File Explorer 확장을 구현하거나 수정하는 에이전트가 작업 전에 반드시 참고해야 할 기준을 정리한다.

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
| 구조 변경, provider/command/이벤트 흐름 수정 | [docs/design/architecture.md](./docs/design/architecture.md) |
| Git CLI 연동, 커밋 이력/변경 파일/파일 내용 조회 | [docs/implementation/git-service-plan.md](./docs/implementation/git-service-plan.md) |
| CommitHistoryProvider, CommitFilesProvider 수정 | [docs/implementation/file-tree-provider-plan.md](./docs/implementation/file-tree-provider-plan.md) |
| 패널 인터랙션, 버튼, 날짜 필터, diff UI | [docs/implementation/webview-ui-plan.md](./docs/implementation/webview-ui-plan.md) |
| 일정, 구현 순서, 범위 조정 | [docs/planning/milestones.md](./docs/planning/milestones.md) |
| QA, 테스트, 패키징, 배포 | [docs/release/qa-release-plan.md](./docs/release/qa-release-plan.md) |

## 소스 파일 맵

| 파일 | 역할 |
|------|------|
| `src/extension.ts` | 진입점. provider 등록, command 등록, 에디터 이벤트 구독 |
| `src/gitService.ts` | Git CLI 실행 및 파싱. `getFileHistory`, `getCommitFiles`, `getFileContentAtCommit`, `getAdjacentCommit` |
| `src/commitHistoryProvider.ts` | Commit History 패널 TreeDataProvider. 핀·날짜 필터 상태 관리 |
| `src/commitFilesProvider.ts` | Commit Files 패널 TreeDataProvider. 변경 파일 디렉토리 트리 렌더링, diff 비교 상태 표시 |
| `src/revisionContentProvider.ts` | `gitrevision://` scheme 가상 문서 Provider. `git show <hash>:<path>` 실행 |

## 구현 원칙

- 문서에 정의된 MVP 범위를 우선 구현한다.
- Post-MVP 기능은 사용자가 명시적으로 요청하거나 MVP 구현에 영향을 주지 않는 경우에만 진행한다.
- Git 관련 로직은 `GitService`로 격리한다. CLI 명령은 이 파일 밖에서 직접 실행하지 않는다.
- 커밋 이력 표시와 핀/날짜 필터 상태는 `CommitHistoryProvider` 책임으로 둔다.
- 변경 파일 트리 렌더링과 diff 비교 상태 표시는 `CommitFilesProvider` 책임으로 둔다.
- 가상 문서 제공(`gitrevision://`)은 `RevisionContentProvider` 책임으로 둔다.
- Webview는 사용하지 않는다. 모든 UI는 VSCode 네이티브 API(Tree View, QuickPick, InputBox, Editor Title Actions)로 구현한다.
- diff 버튼은 `when: resourceScheme == gitrevision` 조건으로 가상 문서가 열렸을 때만 노출한다.
- 기존 결정과 충돌하는 변경은 먼저 [docs/planning/decision-log.md](./docs/planning/decision-log.md)에 결정 이력을 갱신한다.

## 수정 시 문서 갱신 기준

다음 변경이 있으면 코드와 함께 관련 문서를 갱신한다.

- 기능 요구사항이 추가, 삭제, 변경됨
- 컴포넌트 책임이나 데이터 흐름이 바뀜
- Git 명령, 파싱 규칙, 오류 처리 방식이 바뀜
- `gitrevision://` URI 형식이나 `RevisionContentProvider` 동작이 바뀜
- 커밋 이력 패널 또는 커밋 파일 패널의 타이틀·버튼 구성이 바뀜
- 파일 열기 또는 diff 열기 방식이 바뀜
- `package.json`의 commands, menus, views contribution이 바뀜
- 마일스톤 범위나 구현 순서가 바뀜
- 테스트, 패키징, 배포 절차가 바뀜

## 검증 기준

작업 완료 전 다음을 확인한다.

- 변경한 기능이 [docs/design/requirements.md](./docs/design/requirements.md)의 요구사항과 맞는지 확인한다.
- 컴포넌트 책임이 [docs/design/architecture.md](./docs/design/architecture.md)와 어긋나지 않는지 확인한다.
- 관련 구현 계획서의 테스트 계획을 기준으로 가능한 테스트를 실행한다.
- 일반 구현, 문서 수정, 리팩터링 작업 완료 시 `pnpm run package:vsix`를 자동으로 실행하지 않는다.
- `pnpm run package:vsix`는 사용자가 명시적으로 요청했거나, 작업 범위가 패키징/배포 검증 자체일 때만 실행한다.
- 테스트를 실행하지 못했다면 이유와 남은 위험을 최종 응답에 명확히 남긴다.
- 문서 경로나 파일 이동이 있었다면 [docs/README.md](./docs/README.md)의 링크를 함께 갱신한다.

## 우선 구현 범위

현재 우선순위는 MVP 구현이다.

1. `package.json` contribution 재구성 (views, commands, menus, activationEvents)
2. `GitService` 구현 및 단위 테스트
3. `CommitHistoryProvider` 구현 (에디터 추적, 날짜 필터, 핀)
4. `CommitFilesProvider` 구현 (변경 파일 트리, diff 비교 상태)
5. `RevisionContentProvider` 구현 및 diff 연결
6. QA 및 패키징 준비
