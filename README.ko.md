# Git Author Explorer

[English](README.md)

Git Author Explorer는 VS Code 사이드바에서 Git 저자와 날짜 범위를 기준으로 변경 파일을 탐색하는 확장 프로그램입니다. 여러 저자를 선택해 기간 내 변경된 파일을 한 번에 확인하고, 선택한 파일과 관련된 의존 파일도 함께 추적할 수 있도록 돕습니다.

## 주요 기능

- Git 저자 이름 또는 이메일 기준 검색
- 여러 저자 선택 및 선택 해제
- From/To 날짜 범위로 변경 파일 필터링
- 변경 파일을 디렉터리 트리 형태로 표시
- 파일 클릭 시 VS Code 에디터에서 열기
- 선택 파일과 관련된 의존 파일 탐색
- Git 저장소 없음, Git 미설치, 빈 검색 결과에 대한 안내
- 영어/한국어 로컬라이징 지원

## 요구 사항

- VS Code 1.90.0 이상
- Git CLI
- Node.js 20 이상 권장
- pnpm 10.19.0 이상 권장

이 확장은 Git 저장소가 열린 VS Code 워크스페이스에서 동작합니다.

## 시작하기

```bash
pnpm install
pnpm run compile
```

VS Code에서 이 저장소를 연 뒤 `Run Extension` 디버그 구성을 실행하면 Extension Development Host에서 확장을 확인할 수 있습니다.

## 개발 명령어

```bash
pnpm run compile
pnpm run watch
pnpm run lint
pnpm run check
pnpm run package:vsix
```

- `compile`: TypeScript를 `dist/`로 빌드합니다.
- `watch`: TypeScript watch 빌드를 실행합니다.
- `lint`: `src/` TypeScript 파일을 검사합니다.
- `check`: 컴파일 검증을 실행합니다.
- `package:vsix`: 수동 Marketplace 업로드용 `.vsix` 패키지를 생성합니다.

## 프로젝트 구조

```text
src/
  extension.ts            확장 진입점과 VS Code 명령 등록
  gitService.ts           Git CLI 실행 및 결과 파싱
  searchViewProvider.ts   사이드바 검색 Webview
  fileTreeProvider.ts     변경 파일 Tree View
  dependencyService.ts    관련 의존 파일 탐색
l10n/                     런타임 로컬라이징 번들
docs/                     요구사항, 설계, 릴리스 계획 문서
resources/                확장 아이콘 등 정적 리소스
```

## 기여하기

이슈, 버그 리포트, 기능 제안, 문서 개선 모두 환영합니다.

1. 저장소를 포크합니다.
2. 변경 내용을 별도 브랜치에서 작업합니다.
3. `pnpm run check`를 실행해 빌드가 통과하는지 확인합니다.
4. 변경 의도와 테스트 결과를 포함해 Pull Request를 생성합니다.

버그를 제보할 때는 사용 중인 VS Code 버전, 운영체제, 재현 절차, 기대 동작과 실제 동작을 함께 적어주세요.

## 문서

세부 요구사항과 구현 계획은 `docs/` 아래에서 관리합니다.

- `docs/design/requirements.md`
- `docs/design/architecture.md`
- `docs/release/qa-release-plan.md`
- `docs/release/publishing-checklist.md`

## 릴리스 상태

현재 버전은 `0.1.0`이며 초기 개발 단계입니다. Marketplace에 새 버전을 배포할 때마다 `package.json`의 버전을 올리고, `pnpm run package:vsix`로 생성한 `.vsix` 파일을 Marketplace publisher 관리 페이지에서 업로드하세요.

## 라이선스

이 프로젝트는 MIT 라이선스로 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.
