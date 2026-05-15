# Git Author Explorer — VSCode 확장 기획 문서

> 버전: 0.1.0-draft  
> 작성일: 2026-05-15

---

## 1. 개요

### 1.1 배경

팀 단위 개발 환경에서 특정 기간 동안 특정 팀원이 어떤 파일을 수정했는지 파악하려면 `git log` 명령을 직접 실행하고 결과를 해석해야 한다. 이 과정은 반복적이고 불편하며, 특히 코드 리뷰·온보딩·감사(audit) 목적으로 빠르게 확인이 필요한 상황에 마찰을 유발한다.

### 1.2 목표

VSCode 사이드바 패널에서 **저자(Author) + 기간(Date Range)** 조건으로 Git 이력을 검색하고, 수정된 파일을 **디렉토리 트리** 형태로 탐색하며, 클릭 한 번으로 에디터에서 파일을 열 수 있는 확장 프로그램을 제공한다.

### 1.3 핵심 가치

| 가치 | 설명 |
|------|------|
| 즉시성 | 터미널 없이 VSCode 내에서 바로 조회 |
| 맥락 유지 | 파일 탐색과 에디터 뷰가 자연스럽게 연결 |
| 단순함 | 저자·기간 두 가지 조건만으로 충분한 조회 |

---

## 2. 사용자 시나리오

### 메인 시나리오 — 저자별 변경 파일 탐색

```
[전제조건] VSCode에 Git 저장소가 열려 있다.

1. 사이드바의 "Git Author Explorer" 패널을 연다.
2. Author 검색란에 이름 또는 이메일 일부를 입력한다.
   - 예: "ethan", "kim"
3. 입력값에 매칭되는 저자 목록이 드롭다운으로 표시된다.
4. 목록에서 원하는 저자를 클릭해 선택한다.
   - 복수 선택 가능. 선택된 저자는 태그(칩) 형태로 표시된다.
5. 시작일(From)과 종료일(To)을 설정한다.
6. "Search" 버튼을 클릭한다.
7. 패널 하단에 선택된 저자 전원이 기간 내에 수정한 파일이
   디렉토리 구조의 트리뷰로 통합 표시된다.
8. 트리에서 파일 항목을 클릭하면 에디터 탭에 해당 파일이 열린다.
   → 기존 파일 탐색기에서 파일을 여는 것과 동일하게 동작한다.
```

### 보조 시나리오 — 저자 복수 선택

```
4-1. 저자 태그의 × 버튼을 클릭하면 해당 저자만 선택 해제된다.
4-2. 이미 선택된 저자가 드롭다운에 다시 표시될 경우
     선택됨 상태(체크 아이콘)로 구분된다.
4-3. 저자를 한 명도 선택하지 않은 상태에서 Search 시
     "저자를 한 명 이상 선택해주세요." 안내 메시지가 표시된다.
```

### 예외 시나리오

```
E-1. 검색 결과가 없을 때
     → "해당 조건에 맞는 변경 파일이 없습니다." 안내 메시지 표시

E-2. Git이 설치되지 않았거나 저장소가 없을 때
     → "Git 저장소를 찾을 수 없습니다." 안내 메시지 표시

E-3. 검색 실행 중 오류 발생 시
     → 오류 내용을 패널에 표시하고 재시도 버튼 제공
```

---

## 3. 기능 요구사항

### 3.1 필수 기능 (MVP)

| ID | 기능 | 설명 |
|----|------|------|
| F-01 | 저자 검색 | 이름·이메일 부분 문자열로 저자 목록 필터링 |
| F-02 | 기간 설정 | 시작일·종료일 날짜 입력 |
| F-03 | 저자 드롭다운 | 검색어 매칭된 저자 목록 드롭다운 표시 |
| F-04 | 저자 복수 선택 | 드롭다운에서 여러 저자 선택, 태그(칩) 형태로 표시 |
| F-05 | 저자 선택 해제 | 태그의 × 버튼으로 개별 저자 선택 해제 |
| F-06 | 파일 트리 표시 | 선택된 전체 저자의 결과를 통합해 디렉토리 계층 구조로 렌더링 |
| F-07 | 파일 열기 | 트리 항목 클릭 시 에디터에서 파일 열기 |
| F-08 | 빈 결과 처리 | 결과 없음 / 저자 미선택 안내 메시지 |
| F-09 | 오류 처리 | Git 미설치 / 저장소 없음 등 안내 |
| F-10 | 파일 열기 모드 | 파일 클릭 → 일반 열기 / 파일 호버 시 diff 버튼 노출 → diff 열기 |
| F-11 | 기간 기본값 | 패널 최초 진입 시 From = 오늘 기준 -7일, To = 오늘로 초기화 |

### 3.2 추가 기능 (Post-MVP)

| ID | 기능 | 설명 |
|----|------|------|
| F-12 | 커밋 수 뱃지 | 파일별 해당 기간 내 커밋 횟수 표시 |
| F-13 | 저자별 색상 구분 | 복수 선택 시 파일 트리에서 저자별 색상으로 구분 |
| F-14 | 최근 검색 저장 | 마지막 입력값 유지 (VSCode globalState) |

---

## 4. 기술 설계

### 4.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                   VSCode Extension                  │
│                                                     │
│  ┌──────────────────┐      ┌─────────────────────┐  │
│  │  WebviewView     │      │  TreeDataProvider   │  │
│  │  (검색 폼 UI)    │      │  (파일 트리 렌더링)  │  │
│  └────────┬─────────┘      └──────────┬──────────┘  │
│           │ postMessage               │ refresh()   │
│           ▼                           ▼             │
│  ┌─────────────────────────────────────────────────┐ │
│  │             Extension Host (Node.js)            │ │
│  │                                                 │ │
│  │  GitService.search(author, from, to)            │ │
│  │   └─ child_process: git log --name-only ...    │ │
│  │   └─ 결과 파싱 → FileTreeNode[]                 │ │
│  └─────────────────────────────────────────────────┘ │
│                          │                           │
│                          ▼                           │
│            vscode.window.showTextDocument()          │
└─────────────────────────────────────────────────────┘
```

### 4.2 컴포넌트 역할

| 컴포넌트 | 역할 |
|----------|------|
| `WebviewViewProvider` | 사이드바 패널. 검색 폼(저자 검색·다중 선택 태그, 기간, 버튼) 렌더링 |
| `GitService` | git CLI 호출, 결과 파싱, 저자 목록 및 파일 경로 목록 반환 |
| `FileTreeProvider` | `TreeDataProvider<FileTreeNode>` 구현. 파일 트리 렌더링 |
| `FileTreeNode` | 디렉토리/파일 트리 노드 자료구조 |

### 4.3 Git 명령 설계

**저자 목록 조회 (드롭다운용)**
```bash
git shortlog -sne HEAD | awk -F'\t' '{print $2}'
# 출력 예: "Ethan Kim <ethan@company.com>"
# 검색어로 name/email 모두 부분 매칭 필터링
```

**파일 목록 조회 — 복수 저자**

`git log`의 `--author` 옵션은 OR 조건을 지원하지 않으므로, 저자별로 명령을 각각 실행한 뒤 결과를 병합한다.

```bash
# 저자 A
git log --author="ethan" --after="2026-01-01" --before="2026-05-15" \
  --name-only --pretty=format:""

# 저자 B
git log --author="jason" --after="2026-01-01" --before="2026-05-15" \
  --name-only --pretty=format:""

# 결과 병합 후 중복 제거 (코드 레벨에서 Set으로 처리)
```

```typescript
// GitService 시그니처
async search(authors: string[], from: string, to: string): Promise<string[]>

// 내부 동작
const results = await Promise.all(
  authors.map(author => runGitLog(author, from, to))
);
return [...new Set(results.flat())]; // 중복 경로 제거
```

### 4.4 데이터 흐름

```
사용자 검색 클릭
      │
      ▼
WebviewView → postMessage({ type: 'search', authors: string[], from, to })
      │
      ▼
Extension: GitService.search(authors, from, to)
  → 저자별 git log 병렬 실행 (Promise.all)
  → 결과 병합 → Set으로 중복 제거 → string[] (파일 경로 목록)
  → buildTree(paths) → FileTreeNode[]
      │
      ▼
FileTreeProvider.refresh(nodes)
  → VSCode가 TreeView 갱신
      │
      ▼
사용자가 파일 노드 클릭
      │
      ▼
vscode.window.showTextDocument(Uri.file(absolutePath))
```

### 4.5 파일 트리 자료구조

```typescript
interface FileTreeNode {
  label: string;           // 표시명 (파일명 또는 디렉토리명)
  type: 'file' | 'directory';
  absolutePath: string;    // 파일 열기에 사용
  children?: FileTreeNode[];
}
```

경로 목록 `["src/components/Button.tsx", "src/utils/format.ts"]`을 받아 아래처럼 변환한다.

```
src/
  components/
    Button.tsx
  utils/
    format.ts
```

---

## 5. UI 설계

### 5.1 사이드바 패널 레이아웃

```
┌─────────────────────────────┐
│  🔍 Git Author Explorer     │
├─────────────────────────────┤
│  Author                     │
│  ┌─────────────────────┐    │
│  │ 검색어 입력...       │    │
│  └─────────────────────┘    │
│  ┌──────────────────────┐   │
│  │ ✔ Ethan Kim          │   │  ← 드롭다운 (매칭 저자 목록)
│  │   Jason Park         │   │
│  │   Jina Kim           │   │
│  └──────────────────────┘   │
│                             │
│  선택된 저자                 │
│  [Ethan Kim ×] [Jason Park ×]│  ← 선택 태그(칩)
│                             │
│  From            To         │
│  ┌──────────┐ ┌──────────┐  │
│  │2026-05-08│ │2026-05-15│  │  ← 기본값: 최근 7일
│  └──────────┘ └──────────┘  │
│                             │
│  ┌─────────────────────┐    │
│  │       Search        │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  📁 src                     │
│    📁 components            │
│      📄 Button.tsx  [diff]  │  ← 호버 시 diff 버튼 노출
│      📄 Input.tsx           │
│    📁 utils                 │
│      📄 format.ts           │
│  📄 README.md               │
└─────────────────────────────┘
```

- 드롭다운은 검색어 입력 시 즉시 표시, 포커스 벗어나면 닫힘
- 이미 선택된 저자는 드롭다운에 체크(✔) 표시
- 태그의 × 클릭 시 해당 저자만 선택 해제
- 파일 행 호버 시 우측에 diff 버튼 노출, 호버 해제 시 숨김
- 로딩 중에는 스피너 표시

### 5.2 인터랙션 정의

| 동작 | 결과 |
|------|------|
| Author 검색란 입력 | 매칭 저자 드롭다운 표시 |
| 드롭다운 항목 클릭 | 저자 태그 추가 (이미 선택된 경우 무시) |
| 태그의 × 클릭 | 해당 저자 선택 해제 |
| 파일 행 호버 | 행 우측에 diff 버튼 노출 |
| 파일 행 클릭 (diff 버튼 제외 영역) | 에디터에서 파일 일반 열기 (기존 탭 재사용) |
| diff 버튼 클릭 | 에디터에서 현재 HEAD와의 diff 뷰로 열기 |
| 디렉토리 단일 클릭 | 하위 트리 토글 (접기/펼치기) |
| Search 버튼 클릭 | 조회 실행, 트리 갱신 |
| 저자 0명 상태로 Search | "저자를 한 명 이상 선택해주세요." 인라인 안내 |

---

## 6. 개발 계획

### 6.1 마일스톤

#### M1 — 프로젝트 초기화 (1일)
- `yo code`로 확장 프로젝트 스캐폴딩
- TypeScript, ESLint, 빌드 환경 구성
- `package.json` 메타데이터 작성 (contributes, activationEvents)

#### M2 — GitService 구현 (1~2일)
- `child_process`로 `git log` 호출
- stdout 파싱 → 파일 경로 배열 반환
- 예외 처리 (git 미설치, 저장소 없음, 빈 결과)
- 단위 테스트 작성

#### M3 — FileTreeProvider 구현 (1~2일)
- `FileTreeNode` 자료구조 정의
- 경로 배열 → 트리 변환 로직
- `TreeDataProvider` 구현 및 등록
- 파일 클릭 → `showTextDocument` 연결

#### M4 — WebviewView 구현 (2~3일)
- 검색 폼 HTML/CSS 작성
- 저자 검색 인풋 + 드롭다운 + 태그(칩) UI 구현
- 태그 추가/삭제 인터랙션 구현
- `postMessage` 통신 구현 (`authors: string[]` 배열 전달)
- 로딩 상태, 빈 결과, 오류 메시지 처리

#### M5 — 통합 및 QA (1~2일)
- 전체 플로우 E2E 검증
- 다양한 저장소 환경 테스트 (대형 저장소, 모노레포)
- VSCode 최소 버전 호환성 확인

#### M6 — 패키징 및 배포 (1일)
- `vsce package`로 `.vsix` 빌드
- README, 스크린샷 작성
- Marketplace 게시 (선택)

### 6.2 예상 총 개발 기간

| 경험 수준 | 예상 기간 |
|-----------|-----------|
| VSCode 확장 경험 있음 | 약 1주 |
| 처음 개발하는 경우 | 약 2주 |

---

## 7. 기술 스택

| 항목 | 선택 |
|------|------|
| 언어 | TypeScript |
| 런타임 | Node.js (VSCode Extension Host) |
| VSCode API | `WebviewViewProvider`, `TreeDataProvider`, `window.showTextDocument` |
| Git 연동 | `child_process.execSync` / `execFile` |
| 빌드 | esbuild (또는 webpack) |
| 테스트 | Mocha + `@vscode/test-electron` |
| 패키징 | `vsce` |

---

## 8. 미결 결정사항 (Open Questions)

모든 항목이 확정되었습니다.

| # | 질문 | 결정 |
|---|------|------|
| ~~OQ-1~~ | ~~검색 폼 UI 방식~~ | ✅ WebviewView |
| ~~OQ-2~~ | ~~Git 호출 방식~~ | ✅ child_process |
| ~~OQ-3~~ | ~~저자 매칭 방식~~ | ✅ 부분 문자열 + 복수 선택 |
| ~~OQ-4~~ | ~~파일 열기 방식~~ | ✅ 일반 열기 + Diff 열기 모두 지원 (라디오 선택) |
| ~~OQ-5~~ | ~~기간 기본값~~ | ✅ 최근 7일 (From = 오늘 -7일, To = 오늘) |

---

## 9. 결정 이력 (Decision Log)

| 날짜 | 항목 | 결정 | 이유 |
|------|------|------|------|
| 2026-05-15 | 검색 폼 UI 방식 (OQ-1) | WebviewView | 네이티브 API는 달력 UI 미지원, 다중 필드 순차 입력 UX 문제로 WebviewView 채택 |
| 2026-05-15 | Git 호출 방식 (OQ-2) | child_process | vscode.git API 대비 파라미터 자유도가 높고 구현 단순 |
| 2026-05-15 | 저자 매칭·선택 방식 (OQ-3) | 부분 문자열 매칭 + 복수 선택 | 드롭다운에서 매칭 목록 제공 후 태그 방식으로 복수 선택. git log를 저자별 병렬 실행 후 Set으로 결과 병합 |
| 2026-05-15 | 파일 열기 방식 (OQ-4) | 클릭 → 일반 열기 / 호버 diff 버튼 → diff 열기 | 별도 모드 전환 없이 호버 액션으로 자연스럽게 분기. Webview 트리에서 mouseover 이벤트로 버튼 노출, `vscode.diff()` API로 diff 뷰 실행 |
| 2026-05-15 | 기간 기본값 (OQ-5) | 최근 7일 | 일반적인 코드 리뷰·확인 단위가 1주이므로 최근 7일을 기본값으로 설정 |

---

## 10. 참고

- [VSCode Extension API — TreeDataProvider](https://code.visualstudio.com/api/extension-guides/tree-view)
- [VSCode Extension API — WebviewView](https://code.visualstudio.com/api/extension-guides/webview)
- [git-log 공식 문서](https://git-scm.com/docs/git-log)
- [vsce — VSCode Extension Manager](https://github.com/microsoft/vscode-vsce)
