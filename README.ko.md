# Git Author Explorer

[English](README.md)

## 소개

Git Author Explorer는 VS Code 사이드바에서 Git 저자와 날짜 범위를 기준으로 변경 파일을 탐색하는 확장 프로그램입니다. 여러 저자를 선택해 기간 내 변경된 파일을 한 번에 확인하고, 선택한 파일과 관련된 의존 파일도 함께 추적할 수 있도록 돕습니다.

주요 기능:

- Git 저자 이름 또는 이메일 기준 검색
- 저자와 날짜 범위 기준 변경 파일 필터링
- 사이드바 트리 뷰에서 변경 파일과 관련 의존 파일 탐색
- 선택한 파일을 VS Code 에디터에서 바로 열기
- 영어/한국어 로컬라이징 지원

## 개발 환경

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

자주 사용하는 명령어:

```bash
pnpm run compile
pnpm run watch
pnpm run lint
pnpm run check
pnpm run package:vsix
```

## 기여하기

이슈, 버그 리포트, 기능 제안, 문서 개선 모두 환영합니다.

1. 저장소를 포크합니다.
2. 변경 내용을 별도 브랜치에서 작업합니다.
3. `pnpm run check`를 실행해 빌드가 통과하는지 확인합니다.
4. 변경 의도와 테스트 결과를 포함해 Pull Request를 생성합니다.

버그를 제보할 때는 사용 중인 VS Code 버전, 운영체제, 재현 절차, 기대 동작과 실제 동작을 함께 적어주세요.

## 라이선스

이 프로젝트는 무료로 사용할 수 있지만, 동일하거나 실질적으로 유사한 소프트웨어를 재배포하는 것은 허용되지 않습니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.
