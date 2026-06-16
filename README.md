# react-state-form-provider

상태(state) 기반의 React form 라이브러리. ref 없음, `register()` 패턴 없음, 외부 스키마 라이브러리 결합 없음.

## 왜 만들었나?

[react-hook-form](https://react-hook-form.com/)이 싫어서 만들었다.

**React인데 왜 ref?** UI와 데이터가 일치하는 게 React의 최대 강점이다. ref로 DOM에서 값을 직접 끌어오면 그 일치를 깬다. 성능 때문에 ref가 불가피한 경우가 있다는 건 안다 — 다만 **간단한 폼** 하나 만들겠다고 ref 기반 라이브러리를 끌어오는 게 마음에 안 들었다.

이 외에도 거슬렸던 것들:

- **`register()` 패턴.** input에 마법 prop 묶음을 spread하는 방식은 무엇이 wiring돼 있는지 가린다. JSX가 명시적인 건 단점이 아니라 의도다.
- **zod / yup 같은 외부 schema 라이브러리와의 결합.** zod 자체가 나쁘다는 건 아니다 — 좋은 도구다. 다만 react-hook-form이 `resolver: zodResolver(schema)` 처럼 **"zod schema 여기 넣으세요"라는 전용 입구를 API에 만들어두는 방식**이 마음에 안 들었다. 그렇게 두면 라이브러리가 schema 라이브러리에 묶이고, 라이브러리를 쓰는 사람도 묶인다. 이 라이브러리는 zod를 모른다 — 검증은 그냥 함수다. zod 쓰고 싶으면 validator 함수 안에서 직접 호출하면 된다 ([아래 예시](#zod-쓰고-싶다면)).
- **Context로 prop drilling 우회하는 관행.** 자식 컴포넌트엔 prop으로 명시적으로 넘기는 게 맞다고 본다. 이 라이브러리도 `useFormContext`를 제공하지만 권장하지 않는다 ([아래](#2-깊은-자식--prop-전달-권장) 참고).

> **솔직히, form 같은 건 라이브러리에 의존하기보단 직접 구현하는 게 맞다고 생각한다.** 라이브러리를 만들어 놓고 이런 말 하는 게 이상하긴 하다. 다만 이 라이브러리는 "react-hook-form 대신 이걸 써라"가 아니라 "내가 폼을 다루는 방식의 정리"에 가깝다. form 로직은 앱마다 미묘하게 다르니, 본인이 통제할 수 있는 게 결국 가장 낫다.

## 설치

```bash
npm install react-state-form-provider
```

`react`와 `react-dom` (>=18)은 peer dependency입니다.

## 사용 패턴

권장 패턴은 두 가지 — **render-prop** 또는 **`useForm` 단독 훅**. Context (`useFormContext`) API도 제공하지만 권장하지 않는다 ([아래](#2-깊은-자식--prop-전달-권장) 참고).

### 1. `<FormProvider>` + render-prop

```tsx
import {FormProvider, regexValidators, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {email: string; password: string};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regexValidators('email', '이메일 형식이 올바르지 않습니다')],
  password: [regexValidators('password', '영문/숫자/특수문자 8~16자')]
};

<FormProvider<LoginForm>
  defaultValues={{email: '', password: ''}}
  validateMap={validateMap}
  onSubmit={async (data) => {
    await fetch('/login', {method: 'POST', body: JSON.stringify(data)});
  }}
>
  {({value, onChange, onBlur, error, touched}) => (
    <>
      <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />
      {touched.email && error.email?.hasError && <p>{error.email.message}</p>}

      <input
        name="password"
        type="password"
        value={value.password}
        onChange={onChange}
        onBlur={onBlur}
      />
      {touched.password && error.password?.hasError && <p>{error.password.message}</p>}

      <button type="submit">제출</button>
    </>
  )}
</FormProvider>
```

### 2. 깊은 자식 — prop 전달 권장

자식 컴포넌트에는 `useFormContext`로 form state를 끌어오기보다, **render-prop에서 받은 값을 prop으로 직접 넘기는 쪽**을 권장한다.

```tsx
<FormProvider<LoginForm>
  defaultValues={{email: '', password: ''}}
  validateMap={validateMap}
  onSubmit={handle}
>
  {({value, onChange, onBlur, error, touched}) => (
    <Layout>
      <EmailField
        value={value.email}
        onChange={onChange}
        onBlur={onBlur}
        error={touched.email ? error.email : undefined}
      />
      <PasswordField
        value={value.password}
        onChange={onChange}
        onBlur={onBlur}
        error={touched.password ? error.password : undefined}
      />
    </Layout>
  )}
</FormProvider>
```

이유:
- **테스트하기 쉽다.** prop만 받는 컴포넌트는 단독 mount 가능. `useFormContext`를 쓰는 컴포넌트는 매번 `<FormProvider>`로 감싸야 한다.
- **타입이 자동 추론된다.** `useFormContext<T>()`는 호출 측에서 매번 제네릭을 박아야 하고, Context 내부는 `unknown`이라 사실상 unsafe cast이다.
- **재사용 가능하다.** `<EmailField />`는 form 바깥에서도 쓸 수 있다. context 의존 컴포넌트는 form에 종속된다.
- **성능 이득이 없다.** render-prop 구조라 form state가 바뀌면 children 전체가 어차피 리렌더된다. Context로 prop drilling을 피해도 리렌더 회피 효과가 없다 — **단지 데이터 흐름만 가리는 셈**.

#### 굳이 Context를 써야 한다면 (비권장)

깊은 트리에서 한두 군데만 form 값이 필요한 예외적 케이스를 위해 `useFormContext`는 남겨뒀다. 다만 위의 단점들이 모두 따라온다.

```tsx
<FormProvider<LoginForm> defaultValues={{email: '', password: ''}} onSubmit={handle}>
  <DeepChild />
</FormProvider>;

const DeepChild = () => {
  const {value, onChange, onBlur} = useFormContext<LoginForm>();
  return <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />;
};
```

### 3. `useForm` 단독 (`<form>` 태그 없이)

```tsx
const {value, onChange, onBlur, handleSubmit, error, touched, onReset} = useForm({
  defaultValues: {email: '', password: ''},
  validateMap,
  onSubmit: async (data) => {
    /* ... */
  }
});
```

## 검증기 (Validator)

검증기는 일반 함수입니다: `(value, allValues) => {hasError, message} | null | Promise<{hasError, message} | null>`.
실패는 `{hasError: true, message}`를 반환하고, 통과는 `{hasError: false, message: ''}` 또는 `null`을 반환합니다.

**라이브러리는 검증 사상을 가지지 않습니다.** 정규식 사전, 한국형 패턴, "빈 문자열은 통과로 본다" 같은 정책 — 전부 사용자가 자기 코드에서 결정합니다. 라이브러리가 주는 건 두 가지뿐:

```ts
import {
  validator,        // predicate를 검증기로 래핑 (sync/async 둘 다)
  formErrorTempl    // {hasError, message} 빌더 — 메시지가 동적일 때 직접 구성용
} from 'react-state-form-provider';
```

> 정규식 한 줄 래퍼, "빈 문자열 통과" 같은 정책 헬퍼는 라이브러리가 안 줍니다 — 사용자가 자기 프로젝트에 짧게 정의해서 쓰면 됩니다 ([examples/basic/App.tsx](examples/basic/App.tsx)에 실제 예시).

### 기본 사용

```ts
import {validator, type TValidatorMap} from 'react-state-form-provider';

// 1. 사용자 정의: 자기 프로젝트의 정규식 사전
const regexPatterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/
};

// 2. 사용자 정의: 정규식 한 줄 래퍼 (선택)
const regex = (pattern: RegExp, message: string) =>
  validator((v: string) => pattern.test(v), message);

type SignUp = {email: string; password: string; passwordConfirm: string; agree: boolean};

const validateMap: TValidatorMap<SignUp> = {
  // 정규식 검증 — 위에서 정의한 사용자 헬퍼로 한 줄
  email: [regex(regexPatterns.email, '이메일 형식 오류')],

  // 정규식 + 추가 함수 검증을 동시에 — 배열에 여러 개 넣기
  password: [
    regex(regexPatterns.password, '영문/숫자/특수문자 8~16자'),
    validator((v: string) => v.length <= 16, '16자 이하')
  ],

  // 다른 필드 참조하는 함수형 검증
  passwordConfirm: [
    validator((v: string, all: SignUp) => v === all.password, '비밀번호 불일치')
  ],

  // boolean 검증 (체크박스)
  agree: [validator((v: boolean) => v === true, '약관에 동의해야 합니다')]
};
```

### 동적 메시지가 필요한 경우 — `formErrorTempl` 직접 사용

```ts
import {formErrorTempl} from 'react-state-form-provider';

const validateMap = {
  name: [
    (v: string) => {
      if (v.length === 0) return formErrorTempl(true, '필수 입력');
      if (v.length > 100) return formErrorTempl(true, `${v.length}자 — 100자 이하로`);
      return null;
    }
  ]
};
```

### 스키마 어댑터는 없음

zod / yup 같은 외부 schema 라이브러리와의 결합은 의도적으로 안 만듭니다 ([설계 철학](#왜-만들었나) 참고). 정 zod 쓰고 싶으면 [아래](#zod-쓰고-싶다면) 방식으로.

### zod 쓰고 싶다면

라이브러리가 zod 어댑터를 제공하지는 않지만, zod 사용 자체를 막는 건 아닙니다. validator 함수 안에서 직접 호출하면 됩니다.

```ts
import {z} from 'zod';
import {formErrorTempl, type TValidatorMap} from 'react-state-form-provider';

// 사용자 코드의 헬퍼 — 라이브러리가 제공하는 게 아닙니다
const fromZod =
  (schema: z.ZodTypeAny) =>
  (value: unknown) => {
    const r = schema.safeParse(value);
    return r.success ? null : formErrorTempl(true, r.error.issues[0]?.message ?? 'invalid');
  };

type LoginForm = {email: string; password: string};

const validateMap: TValidatorMap<LoginForm> = {
  email: [fromZod(z.string().email('이메일 형식 오류'))],
  password: [fromZod(z.string().min(8, '8자 이상').max(16, '16자 이하'))]
};
```

이 `fromZod` 헬퍼는 사용자 코드에 두는 거지 라이브러리가 제공하지 않습니다. zod를 쓸지 말지, 어떻게 쓸지는 사용자가 결정합니다. 라이브러리는 그냥 함수를 받을 뿐입니다.

zod schema를 백엔드와 공유한다면 이 패턴이 자연스럽습니다 — schema 정의는 공유 모듈에 두고, 프론트에선 그 schema를 `fromZod`로 감싸 validator로 씁니다. 라이브러리가 zod에 묶이지 않으니, 나중에 다른 검증 방식으로 바꿔도 라이브러리 코드는 그대로입니다.

### 비동기 검증기

검증기는 `Promise`를 반환해도 됩니다. 서버 중복 체크 같은 케이스에 사용하세요.

```ts
const validateMap: TValidatorMap<{email: string}> = {
  email: [
    async (value) => {
      const res = await fetch(`/check-email?value=${encodeURIComponent(value)}`);
      const {ok} = await res.json();
      return ok ? null : formErrorTempl(true, '이미 등록된 이메일');
    }
  ]
};
```

- 사용자가 빠르게 타이핑할 때 직전 비동기 검증 결과가 늦게 도착해도 **최신 결과만 반영**됩니다 (필드별 generation 토큰 기반 race 보호).
- 검증이 진행 중인지는 `isValidating[name]`으로 확인할 수 있습니다.
- `handleSubmit`은 모든 비동기 검증기가 끝날 때까지 await한 후 결과를 판단합니다.

## 체크박스

form-level `onChange`는 `type="checkbox"`인 경우 `e.target.checked`를 자동으로 읽습니다.
`value`가 아니라 `checked`로 wiring하세요:

```tsx
<input type="checkbox" name="agree" checked={value.agree} onChange={onChange} />
```

## API

### `useForm<T>(options)`

`FormApi<T>`를 반환:

- `value: T` — 현재 form 데이터
- `error: {[K in keyof T]?: TValidationResult}` — 필드별 에러
- `touched: {[K in keyof T]?: boolean}` — 필드별 touched 플래그
- `isValidating: {[K in keyof T]?: boolean}` — 필드별 검증 진행 중 플래그 (async)
- `setValue({name, value})` / `setValues(partial)` — 프로그래밍 방식 갱신
- `setErrors({name, error, message})` — 수동 에러 세팅
- `onChange(e)` — `<input onChange>`에 wire. `e.target.name`과 `e.target.value`/`e.target.checked`를 읽음
- `onBlur(e)` — `<input onBlur>`에 wire. 해당 필드를 touched 처리
- `onReset()` — `defaultValues`로 복원, error/touched/isValidating 모두 초기화
- `handleSubmit(e)` — 모든 검증기 실행(비동기 포함 await) → 통과 시 `onSubmit` 호출

Options:

- `defaultValues: T` (필수)
- `onSubmit: (data, setErrors, onReset) => Promise<void>` (필수)
- `validateMap?: TValidatorMap<T>`
- `excludeKey?: (keyof T)[]` — submit payload에서 제외할 키 (단, 검증은 진행됨)
- `isDirty?: (v: boolean) => void` — initial과 deep-equal하지 않으면 호출됨

### `<FormProvider>`

`useForm`과 동일한 옵션을 받고, children으로 render-prop 함수 **또는** 일반 `ReactNode`를 허용. 안쪽을 `<form onSubmit={handleSubmit} noValidate>`로 감싸고 Context Provider도 함께 제공합니다.

### `useFormContext<T>()`

`FormApi<T>`를 반환. `FormProvider` 바깥에서 호출하면 throw합니다.

## 개발 / 빌드 / 테스트

```bash
npm run dev        # examples/basic 페이지 (localhost:5173)
npm run build      # 라이브러리 빌드 → dist/
npm test           # vitest run
npm run typecheck  # tsc --noEmit
```

## License

MIT
