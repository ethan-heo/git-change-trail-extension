# 아키텍처 개발 계획서

## 전체 구조

Git File Explorer는 VSCode Extension Host에서 Git 명령을 실행하고, 두 개의 Tree View 패널과 가상 문서 Provider를 조합해 파일 기반 커밋 이력 탐색 UI를 제공한다.

```text
VSCode Extension
  CommitHistoryProvider (TreeDataProvider)
    - 활성 파일의 커밋 이력 목록 (#1, #2, ...)
    - 날짜 필터 상태 관리
    - 핀 고정 상태 관리

  CommitFilesProvider (TreeDataProvider)
    - 선택 커밋의 변경 파일 디렉토리 트리
    - diff 비교 상태 (#N ↔ #M) 표시

  GitService
    - git log로 파일 커밋 이력 조회
    - git diff-tree로 커밋 변경 파일 조회
    - git show로 특정 커밋의 파일 내용 조회

  RevisionContentProvider (TextDocumentContentProvider)
    - git revision 파일 내용을 가상 문서로 제공

  Extension entry
    - onDidChangeActiveTextEditor 이벤트 처리
    - command 등록 및 라우팅
    - provider 등록
```

## 컴포넌트 책임

| 컴포넌트 | 책임 |
|----------|------|
| `CommitHistoryProvider` | 파일의 커밋 이력 TreeDataProvider 구현, 날짜 필터/핀 상태 보관, 커밋 선택 이벤트 발행 |
| `CommitFilesProvider` | 선택 커밋의 변경 파일을 디렉토리 트리로 렌더링, diff 비교 상태 패널 타이틀 반영 |
| `GitService` | Git CLI 실행, stdout 파싱, 오류 정규화 |
| `RevisionContentProvider` | `gitrevision://` scheme 가상 문서 제공, `git show <hash>:<path>` 실행 |
| `CommitNode` | 커밋 이력 노드: 번호, hash, 날짜, 메시지 보관 |
| `FileTreeNode` | 변경 파일 노드: 표시명, 타입(file/directory), 상대경로, 자식 노드 보관 |
| Extension entry | provider 등록, command 등록, 에디터 이벤트 구독, 메시지 라우팅 |

## 패널 레이아웃

```text
COMMIT HISTORY  [📌] [🗓]
  #1  2026-05-18  feat: add button
  #2  2026-05-17  fix: border issue
  #3  2026-05-15  refactor: cleanup

COMMIT FILES (#2)  [comparing: #2 ↔ #3]
  src/
    components/
      Button.tsx
  README.md
```

## 데이터 흐름

```text
[자동 추적] 에디터 탭 전환 (onDidChangeActiveTextEditor)
  → 핀 고정 여부 확인
  → GitService.getFileHistory(filePath, dateFilter)
  → CommitHistoryProvider.refresh(commits)
  → Commit History 패널 갱신

[명시적 트리거] Explorer 우클릭 → "커밋 이력 보기"
  → 핀 해제 후 동일 흐름 실행

커밋 항목 클릭
  → GitService.getCommitFiles(hash)
  → CommitFilesProvider.refresh(files, commitEntry)
  → Commit Files 패널 갱신

파일 항목 클릭 (Commit Files 트리)
  → Uri: gitrevision://<hash>/<relativePath>
  → RevisionContentProvider.provideTextDocumentContent()
  → GitService.getFileContentAtCommit(hash, path)
  → 읽기 전용 에디터로 열림

이전/이후 diff 버튼 클릭 (Editor Title)
  → GitService.getAdjacentCommit(hash, filePath, direction)
  → vscode.diff(revisionUri1, revisionUri2, title)
  → CommitFilesProvider.setCompareState(commitA, commitB)
  → 패널 타이틀에 "#N ↔ #M" 반영

날짜 필터 아이콘 클릭 (Commit History 타이틀)
  → QuickPick/InputBox로 from/to 입력
  → CommitHistoryProvider.setDateFilter(from, to)
  → 이력 재조회 및 패널 갱신

핀 버튼 클릭 (Commit History 타이틀)
  → CommitHistoryProvider.togglePin()
  → 핀 ON: 탭 전환 무시 / 핀 OFF: 자동 추적 재개
```

## VSCode Contribution 구조

```text
contributes.viewsContainers.activitybar
  - id: gitFileExplorer
  - title: Git File Explorer

contributes.views.gitFileExplorer
  - gitFileExplorer.commitHistory  (Commit History)
  - gitFileExplorer.commitFiles    (Commit Files)

contributes.commands
  - gitFileExplorer.showHistory       Explorer 우클릭 트리거
  - gitFileExplorer.filterByDate      날짜 필터 (calendar 아이콘)
  - gitFileExplorer.togglePin         핀 고정/해제 (pin 아이콘)
  - gitFileExplorer.openFileAtCommit  커밋 시점 파일 열기
  - gitFileExplorer.diffWithPrevious  이전 커밋과 diff (화살표 위 아이콘)
  - gitFileExplorer.diffWithNext      이후 커밋과 diff (화살표 아래 아이콘)

contributes.menus
  - explorer/context        showHistory 명령
  - view/title              filterByDate, togglePin (commitHistory 패널)
  - editor/title            diffWithPrevious, diffWithNext
                            (when: resourceScheme == gitrevision)
```

## 메시지/이벤트 계약

Extension Host 내부에서 컴포넌트 간 통신은 직접 메서드 호출과 VSCode `EventEmitter`로 처리한다. Webview는 사용하지 않는다.

```typescript
// CommitHistoryProvider → CommitFilesProvider
onDidSelectCommit: vscode.Event<CommitEntry>

// Extension entry → CommitHistoryProvider
onDidChangeActiveTextEditor (VSCode 네이티브 이벤트)

// CommitFilesProvider → Editor Title 버튼 활성화
// resourceScheme == 'gitrevision' when 조건으로 판단
```

## 구현 원칙

- Git 명령 실행은 `GitService`로 격리한다.
- 절대 경로 계산은 workspace root 기준으로 Extension Host에서 수행한다.
- 가상 문서 URI 형식: `gitrevision://<hash>/<workspace-relative-path>`
- 오류 메시지는 내부 예외를 그대로 노출하지 않고 사용자 행동이 가능한 문장으로 변환한다.
- diff 버튼은 `when` 조건(`resourceScheme == gitrevision`)으로 가상 문서가 열렸을 때만 노출한다.
