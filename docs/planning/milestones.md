# 마일스톤 개발 계획서

## M1. 프로젝트 재구성

예상 기간: 0.5일

- `package.json` contribution 전면 재작성 (views, commands, menus, activationEvents)
- 기존 소스 파일 제거 (`searchViewProvider.ts`, `fileTreeProvider.ts`, `dependencyService.ts`)
- 새 파일 골격 생성 (`commitHistoryProvider.ts`, `commitFilesProvider.ts`, `revisionContentProvider.ts`)

완료 기준:

- Extension Development Host에서 사이드바에 두 개의 패널(Commit History, Commit Files)이 표시된다.
- Explorer 우클릭 메뉴에 "커밋 이력 보기" 항목이 보인다.

## M2. GitService 구현

예상 기간: 1~2일

- `getFileHistory(filePath, filter)` 구현
- `getCommitFiles(hash)` 구현 (루트 커밋 fallback 포함)
- `getFileContentAtCommit(hash, path)` 구현
- `getAdjacentCommit(hash, filePath, direction)` 구현
- 오류 메시지 정규화
- 단위 테스트 작성

완료 기준:

- 실제 Git 저장소에서 파일 커밋 이력, 커밋 변경 파일, 커밋 시점 파일 내용을 정상 조회한다.
- 저장소 없음/파일 없음/명령 실패를 구분한 메시지를 반환한다.

## M3. CommitHistoryProvider 구현

예상 기간: 1일

- `CommitNode` TreeItem 정의 및 렌더링
- `loadFile`, `setDateFilter`, `togglePin` 구현
- `onDidSelectCommit` 이벤트 발행
- 에디터 `onDidChangeActiveTextEditor` 구독 연결
- 날짜 필터 QuickPick 연결
- 핀 버튼 상태 토글

완료 기준:

- 파일을 열거나 탭을 전환하면 Commit History 패널이 자동 갱신된다.
- 날짜 필터 적용 시 해당 기간 커밋만 표시된다.
- 핀 활성화 시 탭 전환에도 패널이 고정된다.

## M4. CommitFilesProvider 구현

예상 기간: 1일

- `FileTreeNode` 정의 및 경로 → 트리 변환 (`buildTree`) 구현
- `loadCommit`, `setCompareState`, `clearCompareState` 구현
- 파일 클릭 시 `gitrevision://` URI로 에디터 열기 연결
- 패널 타이틀 비교 상태 반영

완료 기준:

- 커밋 항목 클릭 시 변경 파일이 디렉토리 트리로 표시된다.
- 파일 클릭 시 해당 커밋 시점의 파일 내용이 읽기 전용으로 열린다.
- diff 진행 중 패널 타이틀에 `comparing: #N ↔ #M`이 표시된다.

## M5. RevisionContentProvider 및 Diff 구현

예상 기간: 1일

- `gitrevision://` scheme `TextDocumentContentProvider` 구현
- `getFileContentAtCommit` 연결
- Commit Files 파일 항목에서 전체 이력 버튼 연결
- 이전/이후 커밋 diff Commit Files 파일 항목 인라인 버튼 연결
- 전체 이력/diff 버튼 `when` 조건 (`view == gitFileExplorer.commitFiles && viewItem == file`) 적용
- diff 비교 시 `CommitFilesProvider.setCompareState` 호출

완료 기준:

- 커밋 시점 파일이 읽기 전용으로 열린다.
- Commit Files 파일 항목에서 해당 파일의 전체 커밋 이력을 열 수 있다.
- 이전/이후 커밋과의 diff가 VSCode 기본 diff 에디터로 열린다.
- Commit Files 전체 이력/diff 버튼은 파일 항목에만 노출된다.

## M6. 통합 및 QA

예상 기간: 1~2일

- 전체 플로우 E2E 검증
- 대형 저장소, 모노레포, 빈 저장소, 단일 커밋 저장소 테스트
- 루트 커밋(부모 없음) 처리 테스트
- 파일 이름 변경 이력 추적 테스트 (`--follow`)
- 날짜 경계값 테스트
- VSCode 최소 버전 호환성 확인

완료 기준:

- 주요 시나리오와 예외 시나리오가 모두 동작한다.
- 오류가 사용자에게 이해 가능한 메시지로 표시된다.

## M7. 패키징 및 배포

예상 기간: 1일

- `vsce package`로 `.vsix` 빌드
- README 작성
- 스크린샷 준비
- Marketplace 게시 여부 결정

완료 기준:

- 로컬 `.vsix` 설치 테스트를 통과한다.
- 배포용 메타데이터가 준비된다.
