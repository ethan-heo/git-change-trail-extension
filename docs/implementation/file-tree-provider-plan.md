# FileTreeProvider 개발 계획서

## 목표

GitService가 반환한 파일 경로 배열을 VSCode Tree View에서 탐색 가능한 디렉토리 트리로 렌더링한다.

## 자료구조

```typescript
export interface FileTreeNode {
  label: string;
  type: 'file' | 'directory';
  relativePath: string;
  absolutePath: string;
  children?: FileTreeNode[];
}
```

## 트리 변환 규칙

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

구현 기준:

- `/`로 경로를 분할한다.
- 중간 segment는 `directory`, 마지막 segment는 `file`로 만든다.
- 같은 디렉토리/파일 노드는 중복 생성하지 않는다.
- 디렉토리는 파일보다 먼저 표시한다.
- 같은 타입 안에서는 label 기준 오름차순 정렬한다.

## TreeItem 동작

| 노드 타입 | collapsibleState | command |
|-----------|------------------|---------|
| directory | Collapsed 또는 Expanded | 없음 |
| file | None | `gitAuthorExplorer.openFile` |

파일 노드 클릭 시:

```typescript
vscode.window.showTextDocument(vscode.Uri.file(node.absolutePath));
```

## Diff 열기

파일 트리의 파일 행 인라인 버튼에서 Extension command를 호출한다.

```typescript
vscode.commands.executeCommand(
  'vscode.diff',
  previousUri,
  currentUri,
  `${node.label} (Git Author Explorer)`
);
```

MVP에서는 현재 working tree 파일과 `HEAD` revision 파일을 비교한다. `git show HEAD:<path>` 결과를 `TextDocumentContentProvider`로 제공하고, 해당 가상 문서 URI와 현재 파일 URI를 `vscode.diff`에 전달한다.

## 테스트 계획

- 단일 파일 경로 트리 변환
- 다중 디렉토리 트리 변환
- 중복 경로 제거 후 트리 안정성
- 정렬 규칙 검증
- 파일 노드 command 생성 검증
