# Git Author Explorer

VSCode 사이드바에서 Git 저자와 날짜 범위로 변경 파일을 탐색하는 확장 프로그램입니다.

## Development

```bash
pnpm install
pnpm run compile
pnpm run lint
```

VSCode에서 `Run Extension` 디버그 구성을 실행하면 Extension Development Host가 열립니다.

## Scripts

- `pnpm run compile`: TypeScript를 `dist/`로 빌드합니다.
- `pnpm run watch`: TypeScript watch 빌드를 실행합니다.
- `pnpm run lint`: `src/` TypeScript 파일을 검사합니다.
- `pnpm run check`: 컴파일 검증을 실행합니다.

## Project Notes

세부 요구사항과 구현 계획은 `docs/` 아래 문서를 기준으로 관리합니다.
