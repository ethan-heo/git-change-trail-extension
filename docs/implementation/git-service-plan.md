# GitService 개발 계획서

## 목표

Git CLI를 통해 파일의 커밋 이력, 커밋별 변경 파일 목록, 특정 커밋 시점의 파일 내용을 조회하는 서비스를 구현한다.

## 공개 인터페이스

```typescript
export interface CommitEntry {
  hash: string;
  date: string;      // ISO 8601 형식 (예: 2026-05-18T10:30:00+09:00)
  subject: string;   // 커밋 메시지 첫 줄
  index: number;     // 1-based, 최신 커밋이 #1
}

export interface DateFilter {
  from?: string;  // YYYY-MM-DD
  to?: string;    // YYYY-MM-DD
}

export class GitService {
  getFileHistory(filePath: string, filter?: DateFilter): Promise<CommitEntry[]>;
  getCommitFiles(hash: string): Promise<string[]>;
  getFileContentAtCommit(hash: string, relativePath: string): Promise<string>;
  getAdjacentCommit(hash: string, filePath: string, direction: 'prev' | 'next'): Promise<CommitEntry | undefined>;
}
```

## 커밋 이력 조회 (getFileHistory)

사용 명령:

```bash
git log --follow --format="%H%x00%ai%x00%s" [--after=<from>] [--before=<to>] -- <file>
```

- `--follow`: 파일 이름이 변경된 경우도 추적한다.
- `%x00`: null 문자를 구분자로 사용해 메시지 내 특수문자를 안전하게 처리한다.
- `--after` / `--before`: DateFilter가 있을 때만 추가한다.

파싱 규칙:
- stdout을 줄 단위로 분리한다.
- 각 줄을 `\x00`으로 분리해 `hash`, `date`, `subject`를 추출한다.
- 빈 줄은 건너뛴다.
- 결과 배열에 1-based `index`를 부여한다 (index 1 = 가장 최신).

## 커밋 변경 파일 조회 (getCommitFiles)

사용 명령:

```bash
git diff-tree --no-commit-id -r --name-only <hash>
```

- 루트 커밋(부모 없음)의 경우 `diff-tree`가 빈 결과를 반환할 수 있다. 이때 fallback으로 사용:

```bash
git show --stat --format="" <hash>
```

파싱 규칙:
- stdout을 줄 단위로 분리한다.
- 빈 줄을 제거한다.
- workspace 상대 경로(`/` 구분자)를 유지한다.

## 파일 내용 조회 (getFileContentAtCommit)

사용 명령:

```bash
git show <hash>:<relativePath>
```

- stdout을 그대로 문자열로 반환한다.
- 파일이 해당 커밋에 없는 경우 stderr에 오류가 출력된다 → `GitFileNotFoundError`로 정규화한다.

## 인접 커밋 조회 (getAdjacentCommit)

`getFileHistory`로 전체 이력을 조회한 뒤 현재 hash의 인덱스를 찾아 반환한다.

- `direction: 'prev'` → 현재보다 오래된 커밋 (index + 1)
- `direction: 'next'` → 현재보다 최신 커밋 (index - 1)
- 범위를 벗어나면 `undefined` 반환

DateFilter는 `getFileHistory` 호출 시 동일하게 적용해야 인덱스가 일치한다.

## 오류 처리

| 오류 | 판별 기준 | 정규화 메시지 |
|------|-----------|----------------|
| Git 미설치 | `ENOENT` 또는 실행 실패 | Git이 설치되어 있지 않습니다. |
| 저장소 없음 | stderr에 `not a git repository` | Git 저장소를 찾을 수 없습니다. |
| 파일 없음 | stderr에 `does not exist` / `unknown revision` | 해당 커밋에 파일이 존재하지 않습니다. |
| 기타 오류 | stderr 존재 | Git 조회 중 오류가 발생했습니다. |

## 테스트 계획

- `getFileHistory` stdout 파싱 및 index 부여 검증
- DateFilter 적용 시 git 명령 인자 검증
- `getCommitFiles` stdout 파싱 및 빈 줄 제거 검증
- 루트 커밋 fallback 처리 검증
- `getFileContentAtCommit` 정상/파일 없음 케이스 검증
- `getAdjacentCommit` prev/next/범위 초과 케이스 검증
- 오류 메시지 정규화 검증
