# Tree Provider 개발 계획서

## 목표

`CommitHistoryProvider`와 `CommitFilesProvider` 두 개의 TreeDataProvider를 구현해 커밋 이력 목록과 커밋 변경 파일 트리를 각각 렌더링한다.

---

## CommitHistoryProvider

### 역할

파일의 커밋 이력을 번호 순으로 나열하고, 날짜 필터와 핀 고정 상태를 관리한다.
저자 필터가 적용된 경우 선택한 저자의 커밋만 표시한다.

### 자료구조

```typescript
export interface CommitNode {
  entry: CommitEntry;  // { hash, date, subject, index }
}
```

### TreeItem 렌더링

```typescript
// label 예시: "#1  2026-05-18  feat: add login button"
label: `#${entry.index}  ${entry.date.slice(0, 10)}  ${entry.subject}`
collapsibleState: None
command: gitFileExplorer.selectCommit (payload: CommitEntry)
```

### 상태 관리

| 상태 | 타입 | 설명 |
|------|------|------|
| `currentFilePath` | `string \| undefined` | 현재 추적 중인 파일 경로 |
| `pinned` | `boolean` | true면 에디터 전환에도 갱신하지 않음 |
| `dateFilter` | `DateFilter` | from/to 날짜 필터 |
| `authorFilter` | `string[]` | `"Name <email>"` 형식의 선택 저자 목록 |
| `commits` | `CommitEntry[]` | 현재 표시 중인 커밋 목록 |

### 공개 메서드

```typescript
async loadFile(filePath: string): Promise<void>  // 파일 변경 시 호출
setDateFilter(filter: DateFilter): void           // 날짜 필터 적용 또는 빈 필터로 초기화
setAuthorFilter(authors: string[]): void          // 저자 필터 적용 또는 빈 배열로 초기화
clearFilters(): void                              // 날짜/저자 필터 초기화
togglePin(): void                                 // 핀 on/off
```

### 이벤트

```typescript
readonly onDidSelectCommit: vscode.Event<CommitEntry>
```

커밋 항목 클릭 시 `CommitFilesProvider`로 전달된다.

### 패널 타이틀 동작

- 핀 활성화 시 타이틀에 `📌` 접두 표시 (description 또는 title 갱신)
- 날짜 필터 적용 시 타이틀에 기간 범위 표시 (예: `2026-05-01 ~ 2026-05-18`)
- 저자 필터 적용 시 타이틀에 저자명 또는 선택 저자 수 표시
- 날짜 필터 초기화 시 기간 범위 표시 제거

---

## CommitFilesProvider

### 역할

선택된 커밋에서 변경된 파일 목록을 디렉토리 트리로 렌더링하고, diff 비교 상태를 패널 타이틀에 반영한다.

### 자료구조

```typescript
export interface FileTreeNode {
  label: string;
  type: 'file' | 'directory';
  relativePath: string;
  children?: FileTreeNode[];
}
```

### 트리 변환 규칙

입력:

```text
src/components/Button.tsx
src/utils/format.ts
README.md
```

출력:

```text
src/
  components/
    Button.tsx
  utils/
    format.ts
README.md
```

- `/`로 경로를 분할한다.
- 중간 segment는 `directory`, 마지막 segment는 `file`로 만든다.
- 같은 디렉토리/파일 노드는 중복 생성하지 않는다.
- 디렉토리는 파일보다 먼저 표시한다.
- 같은 타입 내에서는 label 기준 오름차순 정렬한다.

### TreeItem 동작

| 노드 타입 | collapsibleState | command |
|-----------|------------------|---------|
| directory | Expanded | 없음 |
| file | None | `gitFileExplorer.openFileAtCommit` |

파일 클릭 시:

```typescript
// URI: gitrevision://<hash>/<displayPath>?path=<relativePath>
// displayPath 예시: src/components/Button (Git abc1234).tsx
const uri = createRevisionUri(hash, relativePath);
vscode.window.showTextDocument(uri, { preview: true, preserveFocus: false });
```

- 에디터 탭에서 실제 파일과 구분되도록 표시용 파일명에는 짧은 커밋 hash를 포함한다.
- 파일 확장자 기반 언어 인식을 유지하기 위해 커밋 표식은 확장자 앞에 넣는다.
- `RevisionContentProvider`는 query의 `path` 값을 실제 Git 조회 경로로 사용한다.

파일 노드에는 `view/item/context` 인라인 액션으로 전체 이력 버튼과 이전/이후 커밋 diff 버튼을 표시한다.

```json
{
  "command": "gitFileExplorer.showFileHistoryFromCommitFile",
  "when": "view == gitFileExplorer.commitFiles && viewItem == file",
  "group": "inline@1"
}
```

전체 이력 버튼 클릭 시 날짜/저자 필터를 초기화한 뒤 파일 노드의 `relativePath`를 기준으로 `CommitHistoryProvider.loadFile()`을 호출해 Commit History 패널을 해당 파일의 전체 커밋 이력으로 갱신한다.

인라인 diff 버튼 클릭 시 선택된 커밋의 hash와 파일 노드의 `relativePath`를 기준으로 인접 커밋을 찾고, VSCode 기본 diff 에디터로 연다.

### 공개 메서드

```typescript
async loadCommit(entry: CommitEntry): Promise<void>  // 커밋 선택 시 호출
setCompareState(a: CommitEntry, b: CommitEntry): void // diff 비교 상태 설정
clearCompareState(): void
```

### 패널 타이틀 동작

- 커밋 선택 시: `Commit Files (#2)`
- diff 비교 중: `Commit Files (#2)` + description `comparing: #2 ↔ #3`

---

## 테스트 계획

- 단일/다중 경로 트리 변환 검증
- 중복 경로 처리 후 트리 안정성 검증
- 디렉토리 우선 + label 오름차순 정렬 검증
- `CommitHistoryProvider` 날짜 필터 적용 시 재조회 검증
- 핀 상태에서 `loadFile` 무시 검증
- `CommitFilesProvider` 패널 타이틀 비교 상태 반영 검증
