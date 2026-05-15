# GitService 개발 계획서

## 목표

Git CLI를 통해 저자 목록과 변경 파일 목록을 조회하는 서비스를 구현한다.

## 공개 인터페이스

```typescript
export interface GitAuthor {
  name: string;
  email: string;
  raw: string;
}

export class GitService {
  getAuthors(query?: string): Promise<GitAuthor[]>;
  searchChangedFiles(authors: string[], from: string, to: string): Promise<string[]>;
}
```

## 저자 목록 조회

사용 명령:

```bash
git shortlog -sne HEAD
```

파싱 예:

```text
12  Ethan Kim <ethan@company.com>
```

구현 기준:

- 탭 또는 연속 공백 이후의 `Name <email>` 부분을 추출한다.
- 검색어는 이름과 이메일에 대해 대소문자 구분 없이 부분 매칭한다.
- UI에는 `Ethan Kim <ethan@company.com>` 형태의 `raw` 값을 전달한다.

## 변경 파일 조회

복수 저자는 `git log --author`의 OR 조건에 의존하지 않고 저자별로 병렬 조회 후 병합한다.

```bash
git log --author="ethan" --after="2026-01-01" --before="2026-05-15" --name-only --pretty=format:
```

구현 기준:

- `Promise.all`로 저자별 명령을 병렬 실행한다.
- stdout에서 빈 줄을 제거한다.
- 파일 경로는 `/` 구분의 workspace 상대 경로로 유지한다.
- `Set`으로 중복 파일을 제거한다.
- 정렬은 디렉토리/파일 트리 렌더링의 안정성을 위해 사전순으로 처리한다.

## 오류 처리

| 오류 | 판별 기준 | 반환/표시 |
|------|-----------|-----------|
| Git 미설치 | `ENOENT` 또는 실행 실패 | Git이 설치되어 있지 않습니다. |
| 저장소 없음 | `not a git repository` | Git 저장소를 찾을 수 없습니다. |
| 날짜 오류 | Git 명령 실패 또는 입력 검증 실패 | 날짜 범위를 확인해주세요. |
| 기타 오류 | stderr 존재 | Git 조회 중 오류가 발생했습니다. |

## 테스트 계획

- 저자 목록 stdout 파싱 테스트
- query 부분 매칭 테스트
- 파일 목록 stdout 파싱 테스트
- 복수 저자 결과 병합 및 중복 제거 테스트
- Git 오류 메시지 정규화 테스트

