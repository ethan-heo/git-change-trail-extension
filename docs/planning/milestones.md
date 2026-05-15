# 마일스톤 개발 계획서

## M1. 프로젝트 초기화

예상 기간: 1일

- `yo code` 또는 기존 템플릿 기반 VSCode 확장 프로젝트 생성
- TypeScript 빌드 설정
- ESLint 설정
- `package.json` 메타데이터 작성
- `contributes.views`, `contributes.commands`, `activationEvents` 설정

완료 기준:

- 확장이 VSCode Extension Development Host에서 실행된다.
- 사이드바에 Git Author Explorer 영역이 표시된다.

## M2. GitService 구현

예상 기간: 1~2일

- Git 실행 유틸 작성
- 저자 목록 조회 구현
- 변경 파일 목록 조회 구현
- 복수 저자 병렬 조회 및 결과 병합
- 오류 메시지 정규화
- 단위 테스트 작성

완료 기준:

- 실제 Git 저장소에서 저자 목록과 파일 목록을 가져온다.
- 저장소 없음/빈 결과/명령 실패를 구분한다.

## M3. FileTreeProvider 구현

예상 기간: 1~2일

- `FileTreeNode` 정의
- 경로 배열을 트리로 변환하는 `buildTree` 구현
- `TreeDataProvider` 등록
- 파일 클릭 시 에디터 열기 command 연결

완료 기준:

- 검색 결과 파일들이 디렉토리 구조로 표시된다.
- 파일 클릭 시 해당 파일이 열린다.

## M4. WebviewView 구현

예상 기간: 2~3일

- 검색 폼 HTML/CSS 작성
- 저자 검색 드롭다운 구현
- 선택 태그 추가/삭제 구현
- From/To 날짜 입력 구현
- Extension Host와 메시지 통신 연결
- 로딩/빈 결과/오류 상태 표시

완료 기준:

- 사용자가 UI만으로 저자와 기간을 선택해 검색할 수 있다.
- 검색 결과가 트리뷰에 반영된다.

## M5. 통합 및 QA

예상 기간: 1~2일

- 전체 플로우 E2E 검증
- 대형 저장소, 모노레포, 빈 저장소 테스트
- 날짜 경계값 테스트
- VSCode 최소 버전 호환성 확인

완료 기준:

- 주요 시나리오와 예외 시나리오가 모두 동작한다.
- 패널 오류가 사용자에게 이해 가능한 메시지로 표시된다.

## M6. 패키징 및 배포

예상 기간: 1일

- `vsce package`로 `.vsix` 빌드
- README 작성
- 스크린샷 준비
- Marketplace 게시 여부 결정

완료 기준:

- 로컬 `.vsix` 설치 테스트를 통과한다.
- 배포용 메타데이터가 준비된다.

