# react-state-form-provider

State-based React form library. No refs, no `register()` pattern, no schema-lib coupling.

## Why does this exist?

This library was built specifically because of three things its author dislikes about [react-hook-form](https://react-hook-form.com/):

1. **Ref-based state.** RHF reaches into the DOM via refs; values flow outside of React state. Not idiomatic React.
2. **The `register()` pattern.** Spreading a magic prop bag onto inputs hides what's actually wired. Verbose JSX is a feature, not a bug.
3. **Coupling with schema libraries** (zod, yup, …). Validation should be plain functions you inject, not a separate dependency.

If you agree with all three points, this library might be for you. If you don't, RHF or [Formik](https://formik.org/) are excellent and you should probably use them.

## Install

```bash
npm install react-state-form-provider
```

`react` and `react-dom` (>=18) are peer dependencies.

## Three usage patterns

### 1. `<FormProvider>` with render-prop

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
      <input
        name="email"
        value={value.email}
        onChange={onChange}
        onBlur={onBlur}
      />
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

### 2. `<FormProvider>` with deep children + `useFormContext`

```tsx
<FormProvider<LoginForm>
  defaultValues={{email: '', password: ''}}
  validateMap={validateMap}
  onSubmit={handle}
>
  <DeepChild />
</FormProvider>;

const DeepChild = () => {
  const {value, onChange, onBlur, error, touched} = useFormContext<LoginForm>();
  return (
    <input
      name="email"
      value={value.email}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
};
```

> The generic on `useFormContext<T>()` must be specified manually — `Context` is type-erased.

### 3. `useForm` standalone (no `<form>` tag)

```tsx
const {value, onChange, onBlur, handleSubmit, error, touched, onReset} = useForm({
  defaultValues: {email: '', password: ''},
  validateMap,
  onSubmit: async (data) => {/* ... */}
});

return (
  <div>
    <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />
    <button type="button" onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}>
      직접 호출
    </button>
  </div>
);
```

## Validators

Validators are plain functions: `(value, allValues) => {hasError, message} | null`.
Return `{hasError: true, message}` to fail; return `{hasError: false, message: ''}` (or `null`) to pass.

The library ships factory helpers for common cases:

```ts
import {
  regexValidators,         // regexPatterns의 키 사용
  advanceRegexValidators,  // 빈 문자열도 검증
  functionalValidators,    // matchValidEmail, passwordConfirm 등
  functionalArrayValidators,
  booleanValidators,
  regexPatterns,           // 공용 정규식 객체
  formErrorTempl           // {hasError, message} 빌더
} from 'react-state-form-provider';

const validateMap: TValidatorMap<{email: string}> = {
  email: [
    regexValidators('email', '이메일 형식 오류'),
    (value, all) => value.length > 100 ? formErrorTempl(true, '너무 김') : null
  ]
};
```

You can write your own validators inline. There is no schema adapter and there will not be one.

## Checkbox

Form-level `onChange` reads `e.target.checked` for `type="checkbox"` automatically.
Wire `checked` (not `value`):

```tsx
<input type="checkbox" name="agree" checked={value.agree} onChange={onChange} />
```

## API

### `useForm<T>(options)`

Returns `FormApi<T>` with:
- `value: T` — current form data
- `error: {[K in keyof T]?: TValidationResult}` — per-field errors
- `touched: {[K in keyof T]?: boolean}` — per-field touched flag
- `setValue({name, value})` / `setValues(partial)` — programmatic updates
- `setErrors({name, error, message})` — manual error set
- `onChange(e)` — wire to `<input onChange>`. Reads `e.target.name` and `e.target.value`/`e.target.checked`
- `onBlur(e)` — wire to `<input onBlur>`. Marks the field touched
- `onReset()` — restores `defaultValues`, clears error/touched
- `handleSubmit(e)` — runs validators → calls `onSubmit` if all pass

Options:
- `defaultValues: T` (required)
- `onSubmit: (data, setErrors, onReset) => Promise<void>` (required)
- `validateMap?: TValidatorMap<T>`
- `excludeKey?: (keyof T)[]` — keys excluded from submit payload (still validated)
- `isDirty?: (v: boolean) => void` — called when form deep-equality vs initial changes

### `<FormProvider>`

Same options as `useForm`, plus accepts either a render-prop function or plain `ReactNode` children. Wraps everything in a `<form onSubmit={handleSubmit} noValidate>` plus a Context Provider.

### `useFormContext<T>()`

Returns the same `FormApi<T>` shape. Throws if called outside a `FormProvider`.

## Develop / Build / Test

```bash
npm run dev        # examples/basic 페이지 (localhost:5173)
npm run build      # 라이브러리 빌드 → dist/
npm test           # vitest run
npm run typecheck  # tsc --noEmit
```

## License

MIT
