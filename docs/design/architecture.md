# 아키텍처 개발 계획서

## 전체 구조

Git Author Explorer는 VSCode Extension Host에서 Git 명령을 실행하고, 사이드바 Webview와 Tree View를 조합해 검색 UI와 결과 탐색 UI를 제공한다.

```text
VSCode Extension
  WebviewViewProvider
    - 저자 검색 UI
    - 기간 입력
    - 선택 태그
    - Search 메시지 전송

  GitService
    - git shortlog으로 저자 목록 조회
    - git log로 파일 변경 목록 조회
    - 결과 병합 및 중복 제거

  FileTreeProvider
    - 파일 경로 배열을 트리 노드로 변환
    - 파일/디렉토리 TreeItem 렌더링
    - 파일 열기 및 diff 명령 연결
```

## 컴포넌트 책임

| 컴포넌트 | 책임 |
|----------|------|
| `WebviewViewProvider` | 사이드바 검색 폼 렌더링, 입력 상태 관리, Extension Host로 메시지 전송 |
| `GitService` | Git CLI 실행, stdout 파싱, 오류 정규화 |
| `FileTreeProvider` | `TreeDataProvider<FileTreeNode>` 구현, 트리 갱신 이벤트 발행 |
| `RevisionContentProvider` | Git revision 파일 내용을 가상 문서로 제공해 diff 뷰에 연결 |
| `FileTreeNode` | 파일/디렉토리 노드의 표시명, 타입, 절대 경로, 자식 노드 보관 |
| Extension entry | provider 등록, command 등록, 메시지 라우팅 |

## 데이터 흐름

```text
사용자 Search 클릭
  -> Webview postMessage({ type: 'search', authors, from, to })
  -> Extension Host 메시지 수신
  -> GitService.search(authors, from, to)
  -> 저자별 git log 병렬 실행
  -> 파일 경로 병합 및 중복 제거
  -> buildTree(paths)
  -> FileTreeProvider.refresh(nodes)
  -> Tree View 갱신
  -> 파일 클릭 시 showTextDocument
```

## 메시지 계약

```typescript
type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'searchAuthors'; query: string }
  | { type: 'search'; authors: string[]; from: string; to: string }
  | { type: 'openFile'; path: string }
  | { type: 'openDiff'; path: string };

type ExtensionToWebviewMessage =
  | { type: 'authors'; authors: string[] }
  | { type: 'loading'; value: boolean }
  | { type: 'error'; message: string }
  | { type: 'empty'; message: string };
```

## 구현 원칙

- Git 명령 실행은 `GitService`로 격리한다.
- Webview는 검색 입력과 피드백에 집중하고, 파일 트리 렌더링은 VSCode Tree API를 우선 사용한다.
- 절대 경로 계산은 workspace root 기준으로 Extension Host에서 수행한다.
- 오류 메시지는 내부 예외를 그대로 노출하지 않고 사용자 행동이 가능한 문장으로 변환한다.
