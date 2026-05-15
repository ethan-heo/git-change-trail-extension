# Webview UI 개발 계획서

## 목표

사이드바 패널에서 저자 검색, 복수 선택, 기간 입력, 검색 실행, 상태 메시지를 제공한다.

## 레이아웃

```text
Git Author Explorer
  Author
    [검색어 입력]
    [드롭다운]

  선택된 저자
    [Ethan Kim x] [Jason Park x]

  From          To
    [date]      [date]

  [Search]

  상태 영역
    로딩 / 빈 결과 / 오류 메시지
```

## 상태 모델

```typescript
interface ViewState {
  authorQuery: string;
  authors: string[];
  selectedAuthors: string[];
  from: string;
  to: string;
  loading: boolean;
  errorMessage?: string;
  emptyMessage?: string;
}
```

## 인터랙션

| 동작 | 결과 |
|------|------|
| Author 입력 | `searchAuthors` 메시지를 전송하고 드롭다운을 표시한다. |
| 드롭다운 항목 클릭 | 선택 태그를 추가한다. |
| 이미 선택된 저자 클릭 | 중복 추가하지 않고 선택 상태만 유지한다. |
| 태그 삭제 클릭 | 해당 저자를 선택 목록에서 제거한다. |
| Search 클릭 | 저자 0명인 경우 인라인 메시지, 아니면 `search` 메시지 전송 |
| 로딩 시작 | Search 버튼 비활성화, 스피너 표시 |
| 오류 수신 | 오류 메시지와 재시도 버튼 표시 |

## 날짜 기본값

패널 최초 렌더링 시:

- `to`: 오늘
- `from`: 오늘 기준 7일 전

날짜 포맷은 HTML date input과 Git 명령에 모두 전달하기 쉬운 `YYYY-MM-DD`를 사용한다.

## 스타일 기준

- VSCode theme color CSS variable을 우선 사용한다.
- 좁은 사이드바에서도 입력 필드와 태그가 줄바꿈되도록 한다.
- 버튼/입력/태그는 VSCode 기본 UI 톤과 유사하게 차분하게 만든다.
- 오류, 빈 결과, 로딩 상태는 같은 상태 영역에 표시해 레이아웃 흔들림을 줄인다.

## 보안 기준

- Webview script는 nonce를 적용한다.
- `enableScripts`는 필요 범위에서만 켠다.
- Webview HTML에 사용자 입력을 삽입할 때 HTML escape를 적용한다.
- 메시지 payload는 Extension Host에서 다시 검증한다.

