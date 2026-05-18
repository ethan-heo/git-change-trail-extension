# 패널 인터랙션 개발 계획서

> 이 문서는 기존 Webview UI 계획서를 대체한다. 저자 검색 Webview는 제거되었으며, 모든 UI는 VSCode 네이티브 API(Tree View, QuickPick, InputBox)로 구성된다.

## 목표

두 개의 Tree View 패널과 날짜/저자 필터 QuickPick을 조합해 파일 기반 커밋 이력 탐색 인터랙션을 제공한다.

## 인터랙션 목록

### 에디터 파일 자동 추적

| 동작 | 결과 |
|------|------|
| 에디터에서 파일 탭 전환 | 핀이 꺼져 있으면 Commit History 패널 자동 갱신 |
| 핀이 켜진 상태에서 탭 전환 | 패널 갱신 없음 |
| Git 파일이 아닌 경우 (신규 미저장 파일 등) | 패널 빈 상태로 유지, 안내 메시지 표시 |

### Commit History 패널 타이틀 버튼

| 버튼 | 아이콘 | 동작 |
|------|--------|------|
| 핀 고정/해제 | `$(pin)` / `$(pinned)` | 현재 파일 고정. 다시 클릭하면 자동 추적 재개 |
| 날짜 필터 | `$(calendar)` | QuickPick 열어 초기화/직접 입력/최근 기간 선택 |
| 저자 필터 | `$(account)` | QuickPick 다중 선택으로 현재 파일 이력의 저자 선택 |

### 날짜 필터 QuickPick

1. 아이콘 클릭 시 QuickPick으로 날짜 필터 조작을 선택한다.
   - 필터 적용 중이면 `날짜 필터 초기화` 항목을 첫 번째로 표시한다.
   - `기간 직접 입력` 선택 시 `From`/`To` 날짜를 순서대로 입력한다.
   - `최근 7일`, `최근 30일` 프리셋을 제공한다.
2. 직접 입력의 `From`/`To`는 `YYYY-MM-DD` 형식을 사용하며, 비워두면 해당 경계 제한을 두지 않는다.
3. 선택 완료 시 `CommitHistoryProvider.setDateFilter()` 호출 후 이력 재조회
4. 필터 적용 중에는 패널 타이틀 description에 기간 표시
5. 필터 초기화 시 빈 DateFilter를 적용하고 기간 표시를 제거

```text
Commit History  [2026-05-01 ~ 2026-05-18]
```

### 저자 필터 QuickPick

1. 아이콘 클릭 시 현재 파일 이력의 저자 목록을 QuickPick으로 표시한다.
2. 이미 선택된 저자는 체크된 상태로 표시한다.
3. `canPickMany`를 사용해 여러 저자를 선택할 수 있다.
4. 선택 완료 시 `CommitHistoryProvider.setAuthorFilter()` 호출 후 이력 재조회
5. 선택을 모두 해제하면 저자 필터를 초기화하고 패널 타이틀 description에서 저자 표시를 제거한다.

### 커밋 항목 클릭

| 동작 | 결과 |
|------|------|
| 커밋 행 클릭 | Commit Files 패널이 해당 커밋의 변경 파일 트리로 갱신 |

### Commit Files 패널

| 동작 | 결과 |
|------|------|
| 파일 행 클릭 | 해당 커밋 시점의 파일 내용을 읽기 전용 에디터로 열기 |
| 파일 행 인라인 전체 이력 버튼 클릭 | 해당 파일의 전체 커밋 이력을 Commit History 패널에 표시 |
| 파일 행 인라인 이전/이후 diff 버튼 클릭 | 선택 커밋 기준 이전/이후 커밋과 VSCode 기본 diff 열기 |
| 디렉토리 행 클릭 | 펼치기/접기 |
| diff 진행 중 | 패널 description에 `comparing: #2 ↔ #3` 표시 |

파일 행의 전체 이력/diff 버튼은 `view/item/context` contribution의 `inline` 그룹으로 등록하고, `viewItem == file` 조건에서만 노출한다.

### Explorer 컨텍스트 메뉴

| 동작 | 결과 |
|------|------|
| 파일 우클릭 → "커밋 이력 보기" | 핀 해제 후 해당 파일 이력 강제 로드 |
| 디렉토리 우클릭 | 메뉴 항목 미표시 (`when: !explorerResourceIsFolder`) |

## 상태 경계 처리

| 상황 | 표시 |
|------|------|
| 활성 파일 없음 | "파일을 열면 커밋 이력이 표시됩니다." |
| Git 저장소 없음 | "Git 저장소를 찾을 수 없습니다." |
| 커밋 이력 없음 | "이 파일의 커밋 이력이 없습니다." |
| 로딩 중 | Tree View `viewsWelcome` 또는 `description`으로 로딩 상태 표시 |

## 스타일 기준

- 모든 UI는 VSCode 네이티브 컴포넌트를 사용한다. 커스텀 CSS 없음.
- 아이콘은 VSCode codicon 라이브러리를 사용한다.
- 패널 타이틀 버튼은 `view/title` contribution으로 등록한다.
