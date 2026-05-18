# Tree Provider 개발 계획서

## 목표

`CommitHistoryProvider`와 `CommitFilesProvider` 두 개의 TreeDataProvider를 구현해 커밋 이력 목록과 커밋 변경 파일 트리를 각각 렌더링한다.

---

## CommitHistoryProvider

### 역할

파일의 커밋 이력을 번호 순으로 나열하고, 날짜 필터와 핀 고정 상태를 관리한다.

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
| `commits` | `CommitEntry[]` | 현재 표시 중인 커밋 목록 |

### 공개 메서드

```typescript
async loadFile(filePath: string): Promise<void>  // 파일 변경 시 호출
setDateFilter(filter: DateFilter): void           // 날짜 필터 적용
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
| directory | Collapsed | 없음 |
| file | None | `gitFileExplorer.openFileAtCommit` |

파일 클릭 시:

```typescript
// URI: gitrevision://<hash>/<relativePath>
const uri = vscode.Uri.parse(`gitrevision://${hash}/${relativePath}`);
vscode.window.showTextDocument(uri, { preview: true, preserveFocus: false });
```

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
