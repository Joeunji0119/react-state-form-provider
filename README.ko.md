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

[react-hook-form](https://react-hook-form.com/)이 싫어서 만들었습니다.

**React인데 왜 ref?** UI와 데이터가 일치하는 게 React의 최대 강점입니다. ref로 DOM에서 값을 직접 끌어오면 그 일치를 깹니다. 성능 때문에 ref가 불가피한 경우가 있다는 건 압니다 — 다만 **간단한 폼** 하나 만들겠다고 ref 기반 라이브러리를 끌어오는 게 마음에 들지 않았습니다.

이 외에도 거슬렸던 것들입니다:

- **`register()` 패턴.** input에 마법 prop 묶음을 spread하는 방식은 무엇이 wiring돼 있는지 가립니다. JSX가 명시적인 건 단점이 아니라 의도입니다.
- **zod / yup 같은 외부 schema 라이브러리와의 결합.** zod 자체가 나쁘다는 건 아닙니다 — 좋은 도구입니다. 다만 react-hook-form이 `resolver: zodResolver(schema)` 처럼 **"zod schema 여기 넣으세요"라는 전용 입구를 API에 만들어두는 방식**이 마음에 들지 않았습니다. 그렇게 두면 라이브러리가 schema 라이브러리에 묶이고, 라이브러리를 쓰는 사람도 묶입니다. 이 라이브러리는 zod를 모릅니다 — 검증은 그냥 함수입니다. zod 쓰고 싶으면 validator 함수 안에서 직접 호출하면 됩니다.
- **Context로 prop drilling 우회하는 관행.** 자식 컴포넌트엔 prop으로 명시적으로 넘기는 게 맞다고 봅니다. 이 라이브러리도 `useFormContext`를 제공하지만 권장하지 않습니다.

> **솔직히, form 같은 건 라이브러리에 의존하기보단 직접 구현하는 게 맞다고 생각합니다.** 라이브러리를 만들어 놓고 이런 말 하는 게 이상하긴 합니다. 다만 이 라이브러리는 "react-hook-form 대신 이걸 써라"가 아니라 "내가 폼을 다루는 방식의 정리"에 가깝습니다. form 로직은 앱마다 미묘하게 다르니, 본인이 통제할 수 있는 게 결국 가장 낫습니다.

---

설치 참고 사항, 사용 패턴, 검증 타이밍, 전체 API 레퍼런스는 문서 사이트에 있습니다:

**→ https://react-state-form-provider-docs.vercel.app**
