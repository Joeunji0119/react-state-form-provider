# react-state-form-provider

상태(state) 기반의 React form 라이브러리입니다. ref 없음, `register()` 패턴 없음, 외부 스키마 라이브러리 결합 없음.

## 왜 만들었나?

[react-hook-form](https://react-hook-form.com/)이 싫어서 만들었습니다.

**React인데 왜 ref?** UI와 데이터가 일치하는 게 React의 최대 강점입니다. ref로 DOM에서 값을 직접 끌어오면 그 일치를 깹니다. 성능 때문에 ref가 불가피한 경우가 있다는 건 압니다 — 다만 **간단한 폼** 하나 만들겠다고 ref 기반 라이브러리를 끌어오는 게 마음에 들지 않았습니다.

이 외에도 거슬렸던 것들입니다:

- **`register()` 패턴.** input에 마법 prop 묶음을 spread하는 방식은 무엇이 wiring돼 있는지 가립니다. JSX가 명시적인 건 단점이 아니라 의도입니다.
- **zod / yup 같은 외부 schema 라이브러리와의 결합.** zod 자체가 나쁘다는 건 아닙니다 — 좋은 도구입니다. 다만 react-hook-form이 `resolver: zodResolver(schema)` 처럼 **"zod schema 여기 넣으세요"라는 전용 입구를 API에 만들어두는 방식**이 마음에 들지 않았습니다. 그렇게 두면 라이브러리가 schema 라이브러리에 묶이고, 라이브러리를 쓰는 사람도 묶입니다. 이 라이브러리는 zod를 모릅니다 — 검증은 그냥 함수입니다. zod 쓰고 싶으면 validator 함수 안에서 직접 호출하면 됩니다 ([아래 예시](#zod-쓰고-싶다면)).
- **Context로 prop drilling 우회하는 관행.** 자식 컴포넌트엔 prop으로 명시적으로 넘기는 게 맞다고 봅니다. 이 라이브러리도 `useFormContext`를 제공하지만 권장하지 않습니다 ([아래](#2-깊은-자식--prop-전달-권장) 참고).

> **솔직히, form 같은 건 라이브러리에 의존하기보단 직접 구현하는 게 맞다고 생각합니다.** 라이브러리를 만들어 놓고 이런 말 하는 게 이상하긴 합니다. 다만 이 라이브러리는 "react-hook-form 대신 이걸 써라"가 아니라 "내가 폼을 다루는 방식의 정리"에 가깝습니다. form 로직은 앱마다 미묘하게 다르니, 본인이 통제할 수 있는 게 결국 가장 낫습니다.

## 설치

```bash
npm install react-state-form-provider
```

`react`와 `react-dom` (>=18)은 peer dependency입니다.

## 검증과 에러 표시 타이밍 (기본 흐름)

권장 조합은 **일찍 검증하고, 늦게 알리기**입니다:

```text
입력 중 ("a", "a@", "a@b")  → onChange가 매번 검증 → error는 갱신되지만 touched=false → 화면은 조용
필드에서 포커스 빠짐(blur)    → touched=true → 그제서야 틀렸으면 에러 노출
이후 수정하는 동안            → onChange로 에러가 실시간 갱신·사라짐
제출(submit)                 → 전 필드 강제 touched + 전체 검증 → 남은 에러 일괄 노출
```

- **검증 = `onChange`** (변경마다, async 포함)
- **표시 게이트 = `touched`** — `onBlur`가 켜고, 제출이 전 필드를 강제로 켭니다
- 그래서 에러는 `touched.x && error.x?.hasError`로 묶어 띄웁니다

**이건 컨벤션이지 강제가 아닙니다.** `value` / `error` / `touched`는 사용자가 직접 wiring하는 primitive라, 게이트만 바꾸면 UX가 바뀝니다:

- 에러 즉시 표시 → 게이트 제거: `error.x?.hasError`
- 제출 후에만 표시 → `touched` 대신 본인의 `submitted` 플래그로 게이트

게이트 자세한 내용은 아래 **`touched`** 섹션 참고.

## 사용 패턴

권장 패턴은 두 가지입니다 — **render-prop** 또는 **`useForm` 단독 훅**. Context (`useFormContext`) API도 제공하지만 권장하지 않습니다 ([아래](#2-깊은-자식--prop-전달-권장) 참고).

> **연결고리는 `name` 속성입니다.** `<input name="email">`의 `name`이 `value.email`, `validateMap.email`, `error.email`, `touched.email`을 전부 잇는 키입니다. `onChange`는 `e.target.name`을 읽어 어느 필드인지 판단하므로, **`name`이 폼 타입 `T`의 키와 일치해야** 값 갱신과 검증이 돕니다. `register()`로 묶어주는 게 없는 대신, `name`을 직접 맞추는 것이 이 라이브러리의 wiring 계약입니다.

### 1. `<FormProvider>` + render-prop

```tsx
import {FormProvider, regex, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {email: string; password: string};

// 정규식 사전은 사용자 몫 — 라이브러리는 `regex` 래퍼만 제공합니다.
const patterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/
};

// 메시지도 한곳에 모아두면 수정/번역이 쉽습니다
const messages = {
  email: '이메일 형식이 올바르지 않습니다',
  password: '영문/숫자/특수문자 8~16자'
};

// 이 폼의 초기값과 검증기를 나란히 — 폼 하나의 정의를 한곳에 모아둡니다
const defaultValues: LoginForm = {email: '', password: ''};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regex(patterns.email, messages.email)],
  password: [regex(patterns.password, messages.password)]
};

<FormProvider<LoginForm>
  defaultValues={defaultValues}
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

자식 컴포넌트에는 `useFormContext`로 form state를 끌어오기보다, **render-prop에서 받은 값을 prop으로 직접 넘기는 쪽**을 권장합니다.

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

이유입니다:
- **테스트하기 쉽습니다.** prop만 받는 컴포넌트는 단독 mount 가능합니다. `useFormContext`를 쓰는 컴포넌트는 매번 `<FormProvider>`로 감싸야 합니다.
- **타입이 자동 추론됩니다.** `useFormContext<T>()`는 호출 측에서 매번 제네릭을 박아야 하고, Context 내부는 `unknown`이라 사실상 unsafe cast입니다.
- **재사용 가능합니다.** `<EmailField />`는 form 바깥에서도 쓸 수 있습니다. context 의존 컴포넌트는 form에 종속됩니다.
- **성능 이득이 없습니다.** render-prop 구조라 form state가 바뀌면 children 전체가 어차피 리렌더됩니다. Context로 prop drilling을 피해도 리렌더 회피 효과가 없습니다 — **단지 데이터 흐름만 가리는 셈입니다**.

#### 굳이 Context를 써야 한다면 (비권장)

깊은 트리에서 한두 군데만 form 값이 필요한 예외적 케이스를 위해 `useFormContext`는 남겨뒀습니다. 다만 위의 단점들이 모두 따라옵니다.

```tsx
<FormProvider<LoginForm> defaultValues={{email: '', password: ''}} onSubmit={handle}>
  <DeepChild />
</FormProvider>;

const DeepChild = () => {
  const {value, onChange, onBlur} = useFormContext<LoginForm>();
  return <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />;
};
```

### 3. `useForm` 단독 — 마크업은 내가 짠다

`<FormProvider>`는 얇은 래퍼입니다. `useForm`을 호출하고 `<form onSubmit={handleSubmit} noValidate>`와 Context Provider를 대신 렌더해줄 뿐입니다. 상태·검증·`handleSubmit` 같은 알맹이는 전부 `useForm` 안에 있습니다. 그러니 `useForm`은 `FormProvider` 대신 쓰는 게 아니라, 그 아래에 깔린 층입니다. Context도 필요 없고 마크업도 내 맘대로 짜고 싶으면 `useForm`을 직접 부르면 됩니다.

`handleSubmit`이 이벤트를 쓰는 건 `e?.preventDefault()` 딱 한 줄, 그나마도 **이벤트는 안 넘겨도 됩니다.** 그래서 제출을 거는 방법이 두 갈래로 나뉘는데, 마크업에 맞는 쪽을 쓰면 됩니다.

#### 3a. `<form>` 태그를 직접 쓸 때

`<form>`을 직접 그리고(원하는 `className`·`id`·`aria-*` 다 달아서) `handleSubmit`을 `onSubmit`에 꽂습니다. Enter 제출이나 `type="submit"`은 평범한 HTML 그대로 동작합니다.

```tsx
import {useForm, regex, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {email: string; password: string};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regex(/^[\w.-]+@[\w.-]+\.\w+$/, '이메일 형식이 올바르지 않습니다')]
};

const LoginPage = () => {
  const {value, onChange, onBlur, handleSubmit, error, touched, onReset} = useForm<LoginForm>({
    defaultValues: {email: '', password: ''},
    validateMap,
    onSubmit: async (data) => {
      await fetch('/login', {method: 'POST', body: JSON.stringify(data)});
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="login-form">
      <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />
      {touched.email && error.email?.hasError && <p>{error.email.message}</p>}

      <button type="submit">제출</button>
      <button type="button" onClick={onReset}>
        리셋
      </button>
    </form>
  );
};
```

#### 3b. `<form>` 없이 쓸 때

`<form>`이 아예 없습니다. `handleSubmit`을 버튼 `onClick`에 바로 걸거나, 이벤트 없이 `handleSubmit()`으로 호출하면 끝입니다. 이벤트가 선택이라 `preventDefault()` 말곤 안 쓰니, 둘 다 타입도 깔끔하게 맞습니다 — 캐스팅 없음.

```tsx
const SearchPanel = () => {
  const {value, onChange, handleSubmit, error, touched} = useForm<{query: string}>({
    defaultValues: {query: ''},
    validateMap: {query: [validator((v) => v.trim().length > 0, '검색어를 입력하세요')]},
    onSubmit: async (data) => {
      await runSearch(data.query);
    }
  });

  // <form> 없음. <div>랑 버튼만.
  return (
    <div className="search-panel">
      <input name="query" value={value.query} onChange={onChange} />
      {touched.query && error.query?.hasError && <span>{error.query.message}</span>}

      {/* 클릭 이벤트 그대로 넘겨도 되고… */}
      <button type="button" onClick={handleSubmit}>
        검색
      </button>

      {/* …이벤트 없이 불러도 됩니다 */}
      <button type="button" onClick={() => handleSubmit()}>
        지금 검색
      </button>
    </div>
  );
};
```

> 어느 쪽이든 `handleSubmit`이 도는 순서는 똑같습니다 — `preventDefault()`(이벤트가 있으면) → 검증기 전부 실행(비동기면 await) → 전 필드 touched 처리 → 에러 없을 때만 `onSubmit`. `<form>` 태그는 제출을 거는 여러 방법 중 하나일 뿐, 꼭 있어야 하는 건 아닙니다.

## 검증기 (Validator)

검증기는 일반 함수입니다: `(value, allValues) => {hasError, message} | null | Promise<{hasError, message} | null>`.
실패는 `{hasError: true, message}`를 반환하고, 통과는 `{hasError: false, message: ''}` 또는 `null`을 반환합니다.

**라이브러리는 검증 사상을 가지지 않습니다.** 정규식 사전, 한국형 패턴, "빈 문자열은 통과로 본다" 같은 *정책*은 전부 사용자가 자기 코드에서 결정합니다. 라이브러리가 주는 건 *도구* 세 가지뿐입니다:

```ts
import {
  validator,        // predicate를 검증기로 래핑 (sync/async 둘 다)
  regex,            // 정규식 한 줄 래퍼 — validator(v => re.test(v), msg)의 단축형
  formErrorTempl    // {hasError, message} 빌더 — 메시지가 동적일 때 직접 구성용
} from 'react-state-form-provider';
```

> 어떤 정규식을 쓸지(패턴 사전), "빈 문자열 통과" 같은 정책은 라이브러리가 주지 않습니다 — 사용자가 자기 프로젝트에 정의해서 쓰면 됩니다 ([examples/basic/App.tsx](examples/basic/App.tsx)에 실제 예시).

### 기본 사용

```ts
import {validator, regex, type TValidatorMap} from 'react-state-form-provider';

// 사용자 정의: 자기 프로젝트의 정규식 사전 (어떤 패턴을 쓸지는 사용자 몫)
const regexPatterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/
};

// 메시지도 한곳에 모아두면 수정/번역이 쉽습니다
const messages = {
  email: '이메일 형식 오류',
  password: '영문/숫자/특수문자 8~16자',
  maxLength: '16자 이하',
  passwordConfirm: '비밀번호 불일치',
  agree: '약관에 동의해야 합니다'
};

type SignUp = {email: string; password: string; passwordConfirm: string; agree: boolean};

const validateMap: TValidatorMap<SignUp> = {
  // 정규식 검증 — 라이브러리의 regex 래퍼로 한 줄
  email: [regex(regexPatterns.email, messages.email)],

  // 정규식 + 추가 함수 검증을 동시에 — 배열에 여러 개 넣기
  password: [
    regex(regexPatterns.password, messages.password),
    validator((v: string) => v.length <= 16, messages.maxLength)
  ],

  // 다른 필드 참조하는 함수형 검증
  passwordConfirm: [
    validator((v: string, all: SignUp) => v === all.password, messages.passwordConfirm)
  ],

  // boolean 검증 (체크박스)
  agree: [validator((v: boolean) => v === true, messages.agree)]
};
```

> **교차 필드 검증은 "지금 편집 중인 필드"만 다시 돕니다.** `onChange`는 방금 입력한 필드만 검증하지, 그 필드에 의존하는 다른 필드는 검증하지 않습니다. 그래서 `password`를 고쳐도 `passwordConfirm`은 **실시간 재검증되지 않습니다** — 이 상태는 제출 시(`handleSubmit`이 전 필드 검증) 잡히지만 그 전엔 안 잡힙니다. 의존 필드를 실시간으로 다시 검증하려면 본인 핸들러에서 그 필드에 `setValue`를 호출하세요.

### `validateMap`의 진짜 강점 — 폼마다 하나씩

폼 하나당 `validateMap` 하나. 이 구조가 주는 게 생각보다 큽니다.

- **한 필드에 뭐가 걸려 있는지 한 줄로 보입니다.** `password: [regex(...), validator(...)]` — 이 필드엔 정규식 검사 하나, 길이 검사 하나가 걸려 있구나, 끝. 검증 로직 찾겠다고 컴포넌트 JSX를 뒤질 일이 없습니다.
- **문구·정규식·검증 함수는 따로 모아두고 키로 가져다 씁니다.** 메시지는 `messages`에, 정규식은 `regexPatterns`에 한곳에 모아두면 — 프로덕트 전체 문구를 한 파일에서 점검하고 번역하고, 정규식도 한자리에서 확인합니다. `validateMap`은 그걸 키에 맞춰 조립만 하고요.
- **중복이 없습니다.** 이메일 정규식 하나를 여러 폼이 같이 씁니다. 복붙이 아니라 같은 `patterns.email`을 참조하는 거니까.
- **바뀌는 지점이 한 곳입니다.** 어떤 필드의 검증을 바꾸고 싶으면 그 폼 `validateMap`의 해당 키 한 줄만 고치면 됩니다. JSX는 손도 안 댑니다.

의견이 들어간 구조이긴 한데, 사실 이게 이 라이브러리에서 제일 밀고 싶은 부분입니다.

### 동적 메시지가 필요할 때 — `formErrorTempl` 직접 사용

먼저 우선순위 얘기부터. 검증기는 배열에 넣은 **순서대로** 돌고, 처음 걸린 에러가 이깁니다 — 그 순서가 곧 우선순위입니다. 그러니 "필수 입력 먼저, 그 다음 길이 제한" 같은 우선순위를 주려고 한 함수 안에 `if`를 쌓을 필요가 없습니다. 그냥 배열에 순서대로 넣으면 됩니다.

`validator(predicate, message)`는 메시지가 고정 문자열일 때 쓰고, **메시지에 값을 끼워 넣어야 할 때만** `formErrorTempl`을 직접 씁니다.

```ts
import {validator, formErrorTempl, type TValidatorMap} from 'react-state-form-provider';

const validateMap: TValidatorMap<{name: string}> = {
  name: [
    // 우선순위 = 배열 순서. 빈 값이면 여기서 먼저 걸립니다
    validator((v) => v.trim().length > 0, '필수 입력'),

    // 메시지에 입력 길이를 넣어야 하니 formErrorTempl을 직접
    (v) => (v.length > 100 ? formErrorTempl(true, `${v.length}자 — 100자 이하로`) : null)
  ]
};
```

### 스키마 어댑터는 없음

zod / yup 같은 외부 schema 라이브러리와의 결합은 의도적으로 만들지 않습니다 ([설계 철학](#왜-만들었나) 참고). 정 zod 쓰고 싶으면 [아래](#zod-쓰고-싶다면) 방식으로 하면 됩니다.

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
- 한 필드의 validator 배열은 **순차로 await**합니다 — 앞 validator가 끝나야 다음이 실행되고, 첫 에러에서 나머지는 건너뜁니다. 그래서 비싼 async 검사는 **맨 뒤**에 두세요: 앞의 싼 동기 검사가 먼저 걸러주면 네트워크 호출 자체를 건너뜁니다.
- 검증이 진행 중인지는 `isValidating[name]`으로 확인할 수 있습니다.
- `handleSubmit`은 모든 비동기 검증기가 끝날 때까지 await한 후 결과를 판단합니다.

### 비동기 검증기 debounce

정확성은 이미 해결돼 있습니다 — generation 토큰이 stale 결과를 버리니 **틀린 에러가 화면에 보일 일은 없습니다.** 여기서 debounce는 순전히 입력 중 **불필요한 네트워크 호출을 줄이는** 용도입니다. 라이브러리가 할 일은 없고 — 그냥 모듈 유틸일 뿐입니다. 폼에 값을 넣는 길이 `onChange` / `setValue`(둘 다 검증)뿐이라, debounce는 **validator 안**에 둡니다 — 끼어들 수 있는 유일한 자리입니다:

```ts
// 사용자 헬퍼 — 최신 결과로 resolve되는 promise를 반환하는 debounce
function debounceAsync<A extends unknown[], R>(fn: (...args: A) => Promise<R>, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) =>
    new Promise<R>((resolve, reject) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args).then(resolve, reject), ms);
    });
}

const checkEmail = debounceAsync(async (value: string) => {
  const res = await fetch(`/check-email?value=${encodeURIComponent(value)}`);
  const {ok} = await res.json();
  return ok ? null : formErrorTempl(true, '이미 등록된 이메일');
}, 300);

const validateMap: TValidatorMap<{email: string}> = {
  // regex 먼저(동기, 즉시) — 통과할 때만 서버 체크가 돕니다
  email: [regex(emailPattern, '이메일 형식 오류'), checkEmail]
};
```

`checkEmail`은 위처럼 **모듈 스코프**에 두세요. 타이머를 들고 있어서 렌더 사이에 identity가 안정적이어야 합니다 — 컴포넌트 안에 인라인으로 정의하면 매 렌더마다 타이머가 새로 만들어져 debounce가 누적되지 않습니다. 꼭 컴포넌트 안에 둬야 하면(props 의존 등) `useMemo`/`useRef`로 감싸세요.

알아둘 점 두 가지:

- `isValidating.email`은 첫 키 입력부터 마지막 입력 ~300ms 후까지 `true`입니다 — 요청 시간만이 아니라 debounce 대기까지 포함합니다. "확인 중…" 스피너엔 보통 이게 맞습니다.
- 밀려난 debounce 호출은 그냥 resolve되지 않고 버려집니다. 폼에선 무해하지만, 그게 문제 되는 폼 외 fire-and-forget 용도엔 이 `debounceAsync`를 재사용하지 마세요.

## `touched` — 에러를 언제 보여줄지

`error`는 필드가 *유효한가*를, `touched`는 *그걸 언제 보여줘도 되는가*를 답합니다. 일부러 분리해 둔 둘입니다.

`error`는 첫 렌더부터 채워질 수 있습니다 — 빈 이메일은 사용자가 입력하기도 전에 이미 "형식 오류"죠. 아직 아무도 안 건드린 필드에 빨간 에러를 띄우면 거슬립니다. 그래서 `touched`가 "사용자가 이 필드를 거쳤나"를 추적하고, 메시지는 둘을 AND로 묶어 띄웁니다:

```tsx
{touched.email && error.email?.hasError && <small>{error.email.message}</small>}
//  ↑ 거쳤나?         ↑ 에러 있나?
```

`touched`가 `true`가 되는 시점은 둘입니다:

- **`onBlur`** — 포커스가 필드에서 빠질 때(사용자가 그 필드를 끝냈을 때). `onBlur={onBlur}`를 wire 해야 동작합니다.
- **`handleSubmit`** — 제출 시 **모든** 필드를 강제로 touched 처리. 사용자가 안 건드린 필드의 에러까지 한 번에 드러납니다.

`onReset` 시 다시 `{}`로 초기화 — 아무것도 안 건드린 상태로 복귀합니다.

## 제출 이후 다루기 — `setErrors`와 `onReset`

`onSubmit`은 인자를 하나가 아니라 **셋** 받습니다: `(data, setErrors, onReset)`. 위 예제들은 `data`만 썼지만, 나머지 둘은 제출의 *결과*에 반응하는 길입니다 — 무엇보다 서버 측 검증 에러요.

```tsx
onSubmit: async (data, setErrors, onReset) => {
  const res = await fetch('/signup', {method: 'POST', body: JSON.stringify(data)});

  if (res.status === 409) {
    // 특정 필드에 서버 에러를 얹는다 — validator가 만드는 것과 같은 형태
    setErrors({name: 'email', error: true, message: '이미 등록된 이메일입니다'});
    return; // 여기서 멈춤. reset 안 함
  }

  onReset(); // 제출 성공 후 폼 초기화
}
```

- **`setErrors({name, error, message})`** — 키로 특정 필드에 에러를 씁니다. 제출이 이미 전 필드를 `touched`로 만들었으니 메시지는 바로 보입니다.
- **`onReset()`** — 폼을 기준값(baseline)으로 되돌리고 error/touched를 초기화합니다(“기준값”의 의미는 다음 섹션 참고).
- **`onSubmit`이 throw하면 삼켜집니다.** `handleSubmit`이 `try/catch`로 감싸 `console.error`만 찍고, reject하지 않습니다. 제출 실패 UI가 필요하면 `onSubmit` *안에서* 직접 `try/catch` 하세요.

## 폼 기준값(baseline) — dirty, reset, 비동기 `defaultValues`

훅은 내부에 **기준값(baseline)**, 즉 “초기 상태로 취급하는 값”을 들고 있습니다. `isDirty` / `dirtyFields`는 *현재 값 vs 기준값*으로 계산되고, `onReset`은 *기준값으로* 되돌립니다. 이 기준값을 움직이는 사건이 셋입니다:

| 시점 | 기준값에 일어나는 일 |
|---|---|
| **마운트** | 기준값 = `defaultValues`의 deep clone. |
| **제출 성공** | `onSubmit`이 throw 없이 끝나면, 제출된 값이 **새 기준값**이 됩니다. |
| **`defaultValues` 내용 변경** | 폼이 새 `defaultValues`로 **재초기화**됩니다 — value·기준값·error·touched 모두 리셋. |

알아둘 결과 두 가지:

**제출 성공 후엔 폼이 더 이상 dirty가 아닙니다.** 방금 제출한 값이 새 기준값이라, `isDirty`는 다시 `false`, `dirtyFields`는 `{}`로 돌아갑니다. `disabled={!isDirty}`로 묶은 저장 버튼은 저장 후 다시 비활성화됩니다 — 보통 의도한 대로죠. (throw하거나 막힌 제출은 재기준화하지 **않습니다**.)

**`onReset`은 *현재* 기준값으로 되돌리지, 꼭 처음 `defaultValues`로 가는 게 아닙니다.** 제출 전엔 둘이 같지만, 한 번 제출하고 나면 `onReset`은 처음 마운트한 값이 아니라 제출된 값으로 돌아갑니다.

### 비동기 초기값이 그냥 됩니다

`defaultValues`가 바뀌면 폼이 재초기화되므로, 데이터가 로드되기 전에 먼저 렌더하고 데이터가 도착하면 폼이 알아서 채워지게 둘 수 있습니다:

```tsx
const ProfileForm = ({userId}: {userId: string}) => {
  const {data} = useQuery(['profile', userId], fetchProfile); // 나중에 도착

  const {value, onChange, isDirty, handleSubmit} = useForm<Profile>({
    defaultValues: data ?? {name: '', bio: ''}, // 처음엔 빈 값, 로드되면 실제 데이터
    onSubmit: async (d) => {
      await saveProfile(d);
    }
  });
  // `data`가 도착하면 폼이 그 값으로 재초기화된다. 사용자가 편집하기 전까지 isDirty는 false 유지
  // ...
};
```

> **비교는 deep-equal이라 인라인 리터럴은 안전합니다.** `defaultValues={{name: '', bio: ''}}`는 매 렌더 새 객체지만 *내용*은 안 바뀌므로 아무것도 리셋되지 않습니다. 실제 내용이 바뀔 때만 재초기화되고 — 그때 **저장 안 한 편집은 덮어쓰입니다**. 데이터 갱신 중에도 진행 중인 편집을 지키고 싶다면, 들어온 데이터를 본인 상태에 들고 있다가 `setValues`로 반영하세요.

## 체크박스

form-level `onChange`는 `type="checkbox"`인 경우 `e.target.checked`를 자동으로 읽습니다.
`value`가 아니라 `checked`로 wiring하세요:

```tsx
<input type="checkbox" name="agree" checked={value.agree} onChange={onChange} />
```

## 그 외 input 타입 — `number`, `select`, `textarea`, `radio`

form-level `onChange`는 텍스트·체크박스만 다루는 게 아닙니다. `number`, `radio`, `select`, `textarea`도 똑같이 `name` + `value`(또는 `checked`) + `onChange`로 연결됩니다. 한 가지 주의:

**`number` input도 값은 문자열로 들어옵니다.** `e.target.value`는 항상 문자열이라 폼엔 `42`가 아니라 `"42"`가 저장됩니다. 폼 타입이 진짜 숫자를 원하면 직접 형변환하세요 — 예를 들어 `setValue`를 살짝 감싸서:

```tsx
// 문자열 "42"로 저장됨
<input type="number" name="age" value={value.age} onChange={onChange} />

// 진짜 number로 변환
<input
  type="number"
  name="age"
  value={value.age}
  onChange={(e) => setValue({name: 'age', value: e.target.valueAsNumber})}
/>
```

`select`·`textarea`는 특별할 게 없습니다:

```tsx
<select name="country" value={value.country} onChange={onChange}>
  <option value="kr">한국</option>
  <option value="us">미국</option>
</select>

<textarea name="bio" value={value.bio} onChange={onChange} />
```

## 프로그래밍 방식 갱신 — `setValue`와 `setValues`

`setValue`와 `setValues`는 DOM 이벤트가 아니라 코드에서 폼에 값을 씁니다 — 그리고 **둘 다 `onChange`처럼 검증을 돌립니다.** API 응답으로 폼 채우기, 의존 필드 비우기, 일반 change 이벤트를 안 내는 커스텀 input 연결 등에 쓰세요.

```tsx
const {value, setValue, setValues} = useForm<Address>({
  defaultValues: {zip: '', city: '', street: ''},
  onSubmit: handle
});

// 한 필드
setValue({name: 'zip', value: '04524'});

// 여러 개 한 번에 — 조회 결과로 자동 채우기
const onZipLookup = async (zip: string) => {
  const {city, street} = await lookupZip(zip);
  setValues({city, street});
};
```

- `setValue({name, value})` — 단일 필드를 갱신·검증합니다.
- `setValues(partial)` — 여러 필드를 한 번에 갱신·검증합니다. 값이 `undefined`인 키는 **검증을 건너뜁니다** — 그러니 구체적인 값을 넘기세요. 필드를 비우려면 `undefined`가 아니라 `''` / `false`를 쓰세요.

## `excludeKey` — payload에서 필드 빼기

`excludeKey`는 **검증은 그대로 둔 채** `onSubmit` payload에서만 필드를 뺍니다 — 제외된 필드도 검증은 되고, 전송만 안 됩니다. 대표적인 케이스는 확인용 필드입니다:

```tsx
type SignUp = {email: string; password: string; passwordConfirm: string};

const {handleSubmit} = useForm<SignUp, 'passwordConfirm'>({
  defaultValues: {email: '', password: '', passwordConfirm: ''},
  excludeKey: ['passwordConfirm'], // 검증은 되지만 payload엔 안 들어감
  validateMap,
  onSubmit: async (data) => {
    // data: {email, password} — passwordConfirm은 타입 레벨에서도 빠짐
    await fetch('/signup', {method: 'POST', body: JSON.stringify(data)});
  }
});
```

제외된 키는 `data`의 타입에서도 제거되므로(`Omit<T, K>`), `data.passwordConfirm` 접근은 컴파일 에러입니다 — payload 모양이 실제 전송하는 것과 정확히 일치합니다.

## API

### `useForm<T>(options)`

`FormApi<T>`를 반환합니다:

- `value: T` — 현재 form 데이터
- `error: {[K in keyof T]?: TValidationResult}` — 필드별 에러
- `touched: {[K in keyof T]?: boolean}` — 필드별 touched 플래그
- `isValidating: {[K in keyof T]?: boolean}` — 필드별 검증 진행 중 플래그 (async)
- `dirtyFields: {[K in keyof T]?: boolean}` — `defaultValues`와 **달라진 필드만** 담깁니다 (값 `true`). 안 바뀐 키는 아예 없음. react-hook-form의 `dirtyFields`와 같은 개념
- `isDirty: boolean` — 폼이 지금 `defaultValues`와 다른지(deep-equal). react-hook-form의 `formState.isDirty`와 동일
- `setValue({name, value})` / `setValues(partial)` — 프로그래밍 방식 갱신
- `setErrors({name, error, message})` — 수동 에러 세팅
- `onChange(e)` — `<input onChange>`에 wire. `e.target.name`과 `e.target.value`/`e.target.checked`를 읽음
- `onBlur(e)` — `<input onBlur>`에 wire. 해당 필드를 touched 처리
- `onReset()` — 현재 **기준값(baseline)**으로 복원(처음엔 `defaultValues`, 제출 성공 후엔 제출된 값 — [폼 기준값](#폼-기준값baseline--dirty-reset-비동기-defaultvalues) 참고), error/touched/isValidating 모두 초기화
- `handleSubmit(e?)` — 검증기 전부 실행(비동기면 await) → 통과 시 `onSubmit` 호출. 이벤트는 **선택** — `<form>` submit 이벤트, 버튼 클릭 이벤트, 아예 안 넘겨도 됨 (`e?.preventDefault()`에만 쓰임). `<form>` 유무와 무관하게 동작

Options:

- `defaultValues: T` (필수)
- `onSubmit: (data, setErrors, onReset) => Promise<void>` (필수) — 2·3번째 인자는 서버 에러 처리와 성공 후 reset에 쓰입니다 ([상세](#제출-이후-다루기--seterrors와-onreset))
- `validateMap?: TValidatorMap<T>`
- `excludeKey?: (keyof T)[]` — submit payload에서 제외할 키 (단, 검증은 진행됨)
- `submitOnlyWhenDirty?: boolean` (기본 `false`) — `true`면 변경이 없을 때 `handleSubmit`이 `onSubmit`을 건너뜁니다. 기본은 변경 없어도 항상 제출
- `onlyDirtyFields?: boolean` (기본 `false`) — `true`면 `onSubmit` payload에 바뀐 필드만 담기고, `data` 인자 타입도 `Partial<…>`이 됩니다. 검증은 모든 필드에 그대로 진행

### dirty 추적 — `isDirty`, `dirtyFields`, `submitOnlyWhenDirty`, `onlyDirtyFields`

넷은 일부러 안 묶어둔 별개입니다:

| API | 종류 | 답하는 질문 |
|---|---|---|
| `isDirty` | 반환 `boolean` | "initial에서 뭐라도 바뀌었나?" |
| `dirtyFields` | 반환값 | "*어떤* 필드가 바뀌었나?" (`{[key]?: true}`) |
| `submitOnlyWhenDirty` | 옵션 플래그 | "변경 없으면 제출 자체를 건너뛸까?" |
| `onlyDirtyFields` | 옵션 플래그 | "`onSubmit` payload에 바뀐 필드만 담을까?" |

**`isDirty` — 저장 버튼 토글.** 콜백이 아니라 훅에서 **꺼내 읽는 값**입니다(react-hook-form의 `formState.isDirty`처럼). wiring도, 메모이즈 고민도 없습니다.

```tsx
const ProfileForm = ({initial}: {initial: Profile}) => {
  const {value, onChange, isDirty, handleSubmit} = useForm<Profile>({
    defaultValues: initial,
    onSubmit: async (data) => {
      await fetch('/profile', {method: 'PUT', body: JSON.stringify(data)});
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input name="name" value={value.name} onChange={onChange} />
      <textarea name="bio" value={value.bio} onChange={onChange} />
      {/* 뭐라도 바뀌기 전엔 비활성 */}
      <button type="submit" disabled={!isDirty}>
        저장
      </button>
    </form>
  );
};
```

**`submitOnlyWhenDirty` — 변경 없으면 제출 무효화.** `true`면 폼이 여전히 initial과 같을 때 `handleSubmit`이 조기 반환하고 `onSubmit`은 아예 안 돕니다.

```tsx
const SettingsForm = ({initial}: {initial: Settings}) => {
  const {value, onChange, handleSubmit} = useForm<Settings>({
    defaultValues: initial,
    submitOnlyWhenDirty: true,
    onSubmit: async (data) => {
      await saveSettings(data);
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input name="theme" value={value.theme} onChange={onChange} />
      <button type="submit">적용</button>
    </form>
  );
};
```

**`onlyDirtyFields` — 바뀐 것만 자동으로 제출(PATCH).** 켜면 `onSubmit` payload에 바뀐 키만 담깁니다. 안 바뀐 키는 빠지므로 `data` 타입이 `Partial<…>`이 됩니다(`true`가 타입을 뒤집음 — 그래서 아래는 제네릭을 명시하지 않고 `data`가 추론되게 둡니다).

```tsx
const AccountForm = ({initial}: {initial: Account}) => {
  const {value, onChange, handleSubmit} = useForm({
    defaultValues: initial,
    onlyDirtyFields: true,
    onSubmit: async (data) => {
      // data: Partial<Account> — 바뀐 키만
      await fetch('/account', {method: 'PATCH', body: JSON.stringify(data)});
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input name="email" value={value.email} onChange={onChange} />
      <input name="phone" value={value.phone} onChange={onChange} />
      <button type="submit">수정</button>
    </form>
  );
};
```

**직접 추려 쓰고 싶다면?** `onlyDirtyFields`를 끄고 `dirtyFields`로 payload를 손수 만드세요 — 결과는 같고 완전히 명시적이며, 라이브러리는 아무것도 깎지 않습니다:

```tsx
onSubmit: async (data) => {
  const changed = Object.fromEntries(
    Object.entries(data).filter(([k]) => dirtyFields[k as keyof Account])
  );
  await fetch('/account', {method: 'PATCH', body: JSON.stringify(changed)});
}
```

### `<FormProvider>`

`useForm`과 동일한 옵션을 받고, children으로 render-prop 함수 **또는** 일반 `ReactNode`를 허용합니다. 안쪽을 `<form onSubmit={handleSubmit} noValidate>`로 감싸고 Context Provider도 함께 제공합니다.

### `useFormContext<T>()`

`FormApi<T>`를 반환합니다. `FormProvider` 바깥에서 호출하면 throw합니다.

## 개발 / 빌드 / 테스트

```bash
npm run dev        # examples/basic 페이지 (localhost:5173)
npm run build      # 라이브러리 빌드 → dist/
npm test           # vitest run
npm run typecheck  # tsc -b
```

## License

MIT
