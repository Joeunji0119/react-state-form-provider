# react-state-form-provider

상태(state) 기반의 React form 라이브러리입니다. ref 없음, `register()` 패턴 없음, 외부 스키마 라이브러리 결합 없음.

[![npm](https://img.shields.io/npm/v/react-state-form-provider.svg)](https://www.npmjs.com/package/react-state-form-provider)

> 📖 **문서 & 라이브 데모:** https://react-state-form-provider-docs.vercel.app

```bash
npm install react-state-form-provider
```

## 요구 사항

| | |
|---|---|
| React / React-DOM | `>=18` (peer dependency) |
| Node | `>=18` |

## 왜 만들었나?

리액트의 강점은 UI와 데이터의 일치성입니다. ref로 DOM에서 값을 직접 읽는 라이브러리는 그 강점을 버립니다.

간단한 폼은 굳이 라이브러리를 쓸 필요가 없습니다 — 입력 몇 개는 state로 직접 다루는 편이 오히려 단순합니다. ref 기반 라이브러리(react-hook-form의 기본 방식)라면 더욱 그렇습니다.

리렌더가 걱정이라면 — 필드 몇 개짜리 폼은 입력할 때마다 다시 그려도 문제없습니다. 터지지 않습니다. 리렌더 최적화가 필요한 것은 필드가 수십·수백 개인 큰 폼이며, 그것은 그때 고민하면 됩니다.

그래서 이 라이브러리가 말하려는 것은 "이걸 쓰라"가 아닙니다. 간단한 것은 라이브러리 없이 직접 만들고, ref 대신 state를 쓰라는 것입니다. 이 문서는 그 방법을 코드로 정리한 것입니다.

---

설치 참고 사항, 사용 패턴, 검증 타이밍, 전체 API 레퍼런스는 문서 사이트에 있습니다:

**→ https://react-state-form-provider-docs.vercel.app**
