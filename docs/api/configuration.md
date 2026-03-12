# Vali 설정 가이드

## .valirc.json

프로젝트 루트에 `.valirc.json` 파일을 생성하여 Vali를 설정합니다.

### 전체 스키마

```json
{
  "rules": {
    "VAL001": true,
    "VAL002": false,
    "VAL004": "info",
    "VAL005": ["warning", { "maxLayers": 3 }],
    "CUSTOM001": ["error", {}]
  },
  "include": ["src/**/*.{ts,tsx}"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "customRules": ["./custom-rules/*.ts"]
}
```

### rules

규칙별 활성화/비활성화 및 설정:

| 형식 | 예시 | 설명 |
|------|------|------|
| `boolean` | `"VAL001": true` | 활성화/비활성화 |
| `Severity` | `"VAL004": "info"` | 심각도 변경 |
| `[Severity, Options]` | `"VAL005": ["warning", { "maxLayers": 3 }]` | 심각도 + 옵션 |

### include

검사 대상 파일 글로브 패턴:

```json
{ "include": ["src/**/*.{ts,tsx,js,jsx}"] }
```

기본값: `["**/*.{ts,tsx,js,jsx}"]`

### exclude

제외 대상 글로브 패턴:

```json
{ "exclude": ["node_modules/**", "dist/**"] }
```

기본값: `["node_modules/**", "dist/**", "build/**", ".next/**", "**/*.d.ts", "**/*.min.js"]`

### customRules

커스텀 규칙 파일 경로 글로브:

```json
{ "customRules": ["./custom-rules/*.ts"] }
```

기본값: `[]`

## CLI 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--format <type>` | 출력 형식 (terminal, json, sarif) | terminal |
| `--ci` | CI 모드 (error 시 exit 1) | false |
| `--score` | Slop 점수 표시 | false |
| `--config <path>` | 설정 파일 경로 | .valirc.json |
| `--quiet` | error만 출력 | false |
| `--fix` | 자동 수정 | false |
| `--dry-run` | 수정 미리보기 (--fix 필요) | false |
| `--diff` | Git 변경 파일만 검사 | false |
| `--diff-base <ref>` | diff 기준 ref | HEAD |

## 규칙별 옵션

| 규칙 | 옵션 | 기본값 | 설명 |
|------|------|--------|------|
| VAL004 | `threshold` | 0.4 | 주석 비율 임계값 |
| VAL005 | `maxLayers` | 3 | 최대 추상화 레이어 |
| VAL006 | `minLines` | 5 | 중복 감지 최소 줄 수 |
| VAL006 | `similarity` | 0.9 | 유사도 임계값 |
| VAL008 | `allowAsync` | true | async try-catch 허용 |
| VAL010 | `minSize` | 3 | 최소 타입 크기 (줄) |

## 기본 설정

설정 파일이 없으면 다음 기본값이 적용됩니다:

```json
{
  "rules": {
    "VAL001": true,
    "VAL002": true,
    "VAL003": true,
    "VAL004": ["info", { "threshold": 0.4 }],
    "VAL005": ["warning", { "maxLayers": 3 }],
    "VAL006": ["warning", { "minLines": 5, "similarity": 0.9 }],
    "VAL007": true,
    "VAL008": ["warning", { "allowAsync": true }],
    "VAL009": true,
    "VAL010": ["info", { "minSize": 3 }]
  },
  "include": ["**/*.{ts,tsx,js,jsx}"],
  "exclude": [
    "node_modules/**", "dist/**", "build/**",
    ".next/**", "**/*.d.ts", "**/*.min.js"
  ],
  "customRules": []
}
```
