# react-state-form-provider

A state-based React form library. No refs, no `register()` pattern, no coupling to external schema libraries.

> 📖 **Docs & live demo:** https://formtest-dusky.vercel.app
>
> 한국어 문서는 [README.ko.md](README.ko.md)를 참고하세요.

## Why build this?

I built it because I dislike [react-hook-form](https://react-hook-form.com/).

**It's React — so why refs?** Keeping the UI and the data in sync is React's greatest strength. Pulling values straight out of the DOM via refs breaks that sync. I know there are cases where refs are unavoidable for performance — I just didn't like reaching for a ref-based library every time I needed to build **one simple form**.

Other things that bugged me:

- **The `register()` pattern.** Spreading a bundle of magic props onto an input hides what's actually wired up. JSX being explicit isn't a downside — it's the point.
- **Coupling to external schema libraries like zod / yup.** zod itself isn't bad — it's a good tool. What I disliked was react-hook-form building **a dedicated "drop your zod schema here" entry point into its API**, like `resolver: zodResolver(schema)`. Do that and the library gets tied to a schema library, and so does everyone using it. This library doesn't know about zod — validation is just functions. If you want zod, call it yourself inside a validator function ([example below](#if-you-want-zod)).
- **The habit of using Context to dodge prop drilling.** I think child components should be passed values explicitly via props. This library does provide `useFormContext`, but it isn't recommended ([see below](#2-deep-children--prefer-passing-props)).

> **Honestly, I think forms are something you're better off implementing yourself rather than depending on a library.** It's a bit odd to say that after building a library. But this library isn't "use this instead of react-hook-form" — it's closer to "a write-up of how I deal with forms." Form logic differs subtly from app to app, so what you can control yourself is ultimately the best option.

## Install

```bash
npm install react-state-form-provider
```

`react` and `react-dom` (>=18) are peer dependencies.

## When validation runs and errors show (the default flow)

The recommended composition is **validate early, complain late**:

```text
typing ("a", "a@", "a@b")  → onChange validates each time → error updates, but touched=false → screen stays quiet
field loses focus (blur)    → touched=true → the error now shows if still invalid
fixing it afterward         → onChange keeps the error live (updates / clears)
submit                      → every field forced touched + fully validated → remaining errors surface at once
```

- **Validation = `onChange`** (every change, async included).
- **Display gate = `touched`** — flipped by `onBlur`, forced on all fields at submit.
- So errors render as `touched.x && error.x?.hasError`.

**This is a convention, not a lock.** `value` / `error` / `touched` are primitives you wire yourself — change the gate and the UX changes:

- show errors immediately → drop the gate: `error.x?.hasError`
- show only after submit → gate on your own `submitted` flag instead of `touched`

More on the gate in the **`touched`** section below.

## Usage patterns

There are two recommended patterns — the **render-prop** or the **standalone `useForm` hook**. A Context API (`useFormContext`) is also provided but not recommended ([see below](#2-deep-children--prefer-passing-props)).

> **The wiring key is the `name` attribute.** An input's `name` (`<input name="email">`) is the single key that links `value.email`, `validateMap.email`, `error.email`, and `touched.email`. `onChange` reads `e.target.name` to know which field changed, so the **`name` must match a key of your form type `T`** for updates and validation to run. There's no `register()` to bundle it for you — matching the `name` yourself is this library's wiring contract.

### 1. `<FormProvider>` + render-prop

```tsx
import {FormProvider, regex, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {email: string; password: string};

// The regex dictionary is up to you — the library only provides the `regex` wrapper.
const patterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/
};

// Collecting messages in one place makes editing/translating easy
const messages = {
  email: 'Invalid email format',
  password: '8–16 chars with letters, numbers, and symbols'
};

// Keep this form's initial values and validators side by side — its whole definition in one spot
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

      <button type="submit">Submit</button>
    </>
  )}
</FormProvider>
```

### 2. Deep children — prefer passing props

For child components, rather than pulling form state in via `useFormContext`, **prefer passing the values you received from the render-prop down as props**.

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

Why:
- **Easier to test.** A component that only takes props can be mounted on its own. A component using `useFormContext` has to be wrapped in `<FormProvider>` every time.
- **Types are inferred automatically.** `useFormContext<T>()` forces you to plug in the generic at every call site, and internally the Context is `unknown`, so it's effectively an unsafe cast.
- **Reusable.** `<EmailField />` can be used outside the form too. A context-dependent component is bound to the form.
- **No performance gain.** Because of the render-prop structure, when form state changes the entire children re-render anyway. Avoiding prop drilling with Context buys you nothing in re-render avoidance — **it just hides the data flow**.

#### If you really must use Context (not recommended)

`useFormContext` is left in for the exceptional case where only one or two spots deep in the tree need a form value. But all of the downsides above come with it.

```tsx
<FormProvider<LoginForm> defaultValues={{email: '', password: ''}} onSubmit={handle}>
  <DeepChild />
</FormProvider>;

const DeepChild = () => {
  const {value, onChange, onBlur} = useFormContext<LoginForm>();
  return <input name="email" value={value.email} onChange={onChange} onBlur={onBlur} />;
};
```

### 3. `useForm` standalone — own all the markup yourself

`<FormProvider>` is a thin wrapper: it calls `useForm` and renders `<form onSubmit={handleSubmit} noValidate>` plus a Context Provider for you. **`useForm` is the actual core — all the state, validation, and `handleSubmit` logic lives in the hook.** So `useForm` is not something you reach for "instead of" `FormProvider`; it's the layer underneath it. Call it directly when you don't want the Context Provider and you'd rather own every tag yourself.

`handleSubmit` only ever uses the event for one thing — `e?.preventDefault()` — and the event is **optional**. That gives you two ways to wire submission, and you pick whichever fits your markup.

#### 3a. With your own `<form>` tag

You render the `<form>` (with whatever `className` / `id` / `aria-*` you want) and wire `handleSubmit` to its `onSubmit`. Enter-to-submit and `type="submit"` work exactly like native HTML.

```tsx
import {useForm, regex, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {email: string; password: string};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regex(/^[\w.-]+@[\w.-]+\.\w+$/, 'Invalid email format')]
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

      <button type="submit">Submit</button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </form>
  );
};
```

#### 3b. Without any `<form>` tag

No `<form>` at all. Wire `handleSubmit` straight to a button's `onClick`, or call `handleSubmit()` programmatically with no event. Because the event is optional and only used for `preventDefault()`, both are fully typed — no casts.

```tsx
const SearchPanel = () => {
  const {value, onChange, handleSubmit, error, touched} = useForm<{query: string}>({
    defaultValues: {query: ''},
    validateMap: {query: [validator((v) => v.trim().length > 0, 'Enter a search term')]},
    onSubmit: async (data) => {
      await runSearch(data.query);
    }
  });

  // No <form>. Just a <div> and a button.
  return (
    <div className="search-panel">
      <input name="query" value={value.query} onChange={onChange} />
      {touched.query && error.query?.hasError && <span>{error.query.message}</span>}

      {/* pass the click event… */}
      <button type="button" onClick={handleSubmit}>
        Search
      </button>

      {/* …or call with no event at all */}
      <button type="button" onClick={() => handleSubmit()}>
        Search now
      </button>
    </div>
  );
};
```

> `handleSubmit` still runs the full pipeline either way — `preventDefault()` (if an event is passed) → run every validator (awaiting async ones) → mark all fields touched → call `onSubmit` only if there are no errors. The `<form>` tag is just one possible trigger, not a requirement.

## Validators

A validator is a plain function: `(value, allValues) => {hasError, message} | null | Promise<{hasError, message} | null>`.
On failure it returns `{hasError: true, message}`; on pass it returns `{hasError: false, message: ''}` or `null`.

**The library holds no opinion on validation.** *Policies* like which regex dictionary to use, locale-specific patterns, or "treat an empty string as a pass" are all decided by you in your own code. All the library gives you is three *tools*:

```ts
import {
  validator,        // wraps a predicate into a validator (both sync and async)
  regex,            // one-line regex wrapper — shorthand for validator(v => re.test(v), msg)
  formErrorTempl    // {hasError, message} builder — for composing by hand when the message is dynamic
} from 'react-state-form-provider';
```

> Which regex to use (the pattern dictionary) and policies like "pass on empty string" are not given by the library — you define them in your own project ([see the real example in examples/basic/App.tsx](examples/basic/App.tsx)).

### Basic usage

```ts
import {validator, regex, type TValidatorMap} from 'react-state-form-provider';

// Your own definition: the regex dictionary for your project (which patterns to use is up to you)
const regexPatterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/
};

// Collecting messages in one place makes editing/translating easy
const messages = {
  email: 'Invalid email format',
  password: '8–16 chars with letters, numbers, and symbols',
  maxLength: '16 chars or fewer',
  passwordConfirm: 'Passwords do not match',
  agree: 'You must agree to the terms'
};

type SignUp = {email: string; password: string; passwordConfirm: string; agree: boolean};

const validateMap: TValidatorMap<SignUp> = {
  // Regex validation — one line with the library's regex wrapper
  email: [regex(regexPatterns.email, messages.email)],

  // Regex + an extra function validator at once — put several in the array
  password: [
    regex(regexPatterns.password, messages.password),
    validator((v: string) => v.length <= 16, messages.maxLength)
  ],

  // Functional validation that references another field
  passwordConfirm: [
    validator((v: string, all: SignUp) => v === all.password, messages.passwordConfirm)
  ],

  // Boolean validation (checkbox)
  agree: [validator((v: boolean) => v === true, messages.agree)]
};
```

> **Cross-field validators only re-run for the field being edited.** `onChange` validates the field you just typed in, not the fields that depend on it. So editing `password` does **not** re-check `passwordConfirm` live — that stale state is caught on submit (`handleSubmit` validates every field), but not before. If you need dependent fields to re-validate live, call `setValue` on them from your own handler.

### What makes `validateMap` worth it — one per form

Keep one `validateMap` per form. The payoff from that structure is bigger than it looks.

- **You see everything on a field in one line.** `password: [regex(...), validator(...)]` — one regex check, one length check, done. No digging through the component's JSX to find where validation lives.
- **Messages, regexes, and validator functions live in their own collections, pulled in by key.** Park your copy in `messages` and your patterns in `regexPatterns`, and you can review and translate all of a product's copy in one file and eyeball every regex in one place. `validateMap` just assembles them by key.
- **No duplication.** One email regex is shared across forms — not copy-pasted, but the same `patterns.email` referenced everywhere.
- **One place to change.** Want to change a field's validation? Edit that one key in the form's `validateMap`. The JSX never gets touched.

It's an opinionated shape, but honestly this is the part of the library I most want to push.

### When the message needs to be dynamic — use `formErrorTempl` directly

First, about priority. Validators run in the **order you put them in the array**, and the first error wins — that order *is* the priority. So to express "required first, then max length," you don't stack `if`s inside one function; you just list them in order in the array.

Use `validator(predicate, message)` when the message is a fixed string. Reach for `formErrorTempl` directly only when the **message text itself depends on the value**.

```ts
import {validator, formErrorTempl, type TValidatorMap} from 'react-state-form-provider';

const validateMap: TValidatorMap<{name: string}> = {
  name: [
    // priority = array order; an empty value is caught here first
    validator((v) => v.trim().length > 0, 'Required'),

    // the message embeds the input length, so build it with formErrorTempl
    (v) => (v.length > 100 ? formErrorTempl(true, `${v.length} chars — keep it to 100 or fewer`) : null)
  ]
};
```

### No schema adapter

Coupling to external schema libraries like zod / yup is deliberately not built ([see design philosophy](#why-build-this)). If you really want zod, do it the [way below](#if-you-want-zod).

### If you want zod

The library doesn't provide a zod adapter, but it doesn't stop you from using zod either. Just call it yourself inside a validator function.

```ts
import {z} from 'zod';
import {formErrorTempl, type TValidatorMap} from 'react-state-form-provider';

// A helper in your own code — not something the library provides
const fromZod =
  (schema: z.ZodTypeAny) =>
  (value: unknown) => {
    const r = schema.safeParse(value);
    return r.success ? null : formErrorTempl(true, r.error.issues[0]?.message ?? 'invalid');
  };

type LoginForm = {email: string; password: string};

const validateMap: TValidatorMap<LoginForm> = {
  email: [fromZod(z.string().email('Invalid email format'))],
  password: [fromZod(z.string().min(8, 'At least 8 chars').max(16, '16 chars or fewer'))]
};
```

This `fromZod` helper lives in your code, not in the library. Whether to use zod, and how, is your call. The library just takes functions.

If you share a zod schema with your backend, this pattern is natural — keep the schema definition in a shared module, and on the front end wrap it with `fromZod` to use as a validator. Since the library isn't tied to zod, you can later switch to a different validation approach without touching the library's code.

### Async validators

A validator may return a `Promise`. Use this for cases like server-side duplicate checks.

```ts
const validateMap: TValidatorMap<{email: string}> = {
  email: [
    async (value) => {
      const res = await fetch(`/check-email?value=${encodeURIComponent(value)}`);
      const {ok} = await res.json();
      return ok ? null : formErrorTempl(true, 'Email already registered');
    }
  ]
};
```

- When the user types fast, even if a previous async validation result arrives late, **only the latest result is applied** (per-field generation-token race protection).
- A field's validator array is awaited **sequentially** — each one waits for the previous to resolve, and the first error short-circuits the rest. So put expensive async checks **last**: a cheaper sync check earlier can fail first and skip the network call entirely.
- You can check whether validation is in progress via `isValidating[name]`.
- `handleSubmit` awaits all async validators to finish before deciding the result.

### Debouncing an async validator

Correctness is already handled — generation tokens discard a stale result, so you never *see* a wrong error. Debounce here is purely to **skip wasted network calls** while the user is still typing. There's nothing for the library to do — it's a plain module utility. Since the only way to feed the form is `onChange` / `setValue` (both validate), the debounce belongs **inside the validator** — that's the one place to hook in:

```ts
// your helper — a debounce that returns a promise resolving to the latest result
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
  return ok ? null : formErrorTempl(true, 'Email already registered');
}, 300);

const validateMap: TValidatorMap<{email: string}> = {
  // regex runs first (sync, instant); the server check only fires when it passes
  email: [regex(emailPattern, 'Invalid email'), checkEmail]
};
```

Keep `checkEmail` at **module scope** (as above). It carries a timer, so it needs a stable identity across renders — defining it inline in a component recreates the timer every render and the debounce never accumulates. If it has to live inside a component (e.g. it depends on props), wrap it in `useMemo`/`useRef`.

Two things to know:

- `isValidating.email` is `true` from the first keystroke through ~300ms after the last one — it covers the debounce wait, not just the request. That's usually what you want for a "checking…" spinner.
- A superseded debounced call simply never resolves (it's dropped). Harmless for a form; just don't reuse `debounceAsync` for non-form fire-and-forget work where that matters.

## `touched` — when to show errors

`error` says *whether* a field is invalid; `touched` says *when it's okay to show that*. They're separate on purpose.

An `error` can be present from the very first render — an empty email is already "invalid" before the user types anything. You don't want to flash a red error at a field nobody has touched yet. So `touched` tracks whether the user has visited a field, and you gate the message on both:

```tsx
{touched.email && error.email?.hasError && <small>{error.email.message}</small>}
//  ↑ visited?       ↑ invalid?
```

A field becomes `touched` at two moments:

- **`onBlur`** — when focus leaves the field (the user finished with it). Wire `onBlur={onBlur}` to enable this.
- **`handleSubmit`** — on submit, **every** field is forced touched, so all outstanding errors surface at once even for fields the user never visited.

`onReset` clears it back to `{}` — nothing touched again.

## Reacting after submit — `setErrors` and `onReset`

`onSubmit` receives **three** arguments, not one: `(data, setErrors, onReset)`. Every example above uses only `data`, but the other two are how you react to the *result* of a submit — above all, server-side validation errors.

```tsx
onSubmit: async (data, setErrors, onReset) => {
  const res = await fetch('/signup', {method: 'POST', body: JSON.stringify(data)});

  if (res.status === 409) {
    // put a server error on a specific field — same shape a validator produces
    setErrors({name: 'email', error: true, message: 'That email is already registered'});
    return; // stop here; don't reset
  }

  onReset(); // clear the form after a successful submit
}
```

- **`setErrors({name, error, message})`** writes an error onto one field by key. Submit has already forced every field `touched`, so the message shows right away.
- **`onReset()`** restores the form to its baseline and clears error/touched (the next section explains what "baseline" means).
- **A thrown `onSubmit` is swallowed.** `handleSubmit` wraps the call in `try/catch` and only `console.error`s — it never rejects. If you need a submit-failure UI, `try/catch` *inside* `onSubmit` yourself.

## The form baseline — dirty, reset, and async `defaultValues`

The hook keeps an internal **baseline**: the values it treats as "the initial state." `isDirty` / `dirtyFields` are computed as *current value vs baseline*, and `onReset` restores *to* the baseline. Three events move that baseline:

| When | What happens to the baseline |
|---|---|
| **Mount** | Baseline = a deep clone of `defaultValues`. |
| **Successful submit** | After `onSubmit` resolves without throwing, the submitted values **become the new baseline**. |
| **`defaultValues` content changes** | The form **re-initializes** to the new `defaultValues` — value, baseline, error, and touched all reset. |

Two consequences worth knowing:

**After a successful submit, the form is no longer dirty.** The just-submitted values are the new baseline, so `isDirty` flips back to `false` and `dirtyFields` to `{}`. A Save button gated on `disabled={!isDirty}` re-disables itself after a save — usually exactly what you want. (A submit that throws or is blocked does **not** re-baseline.)

**`onReset` restores to the *current* baseline, not necessarily the original `defaultValues`.** Before any submit they're identical; after a submit, `onReset` returns to the submitted values, not the values the form first mounted with.

### Async initial data just works

Because the form re-initializes when `defaultValues` changes, you can render before your data has loaded and let the form populate itself when the data arrives:

```tsx
const ProfileForm = ({userId}: {userId: string}) => {
  const {data} = useQuery(['profile', userId], fetchProfile); // arrives later

  const {value, onChange, isDirty, handleSubmit} = useForm<Profile>({
    defaultValues: data ?? {name: '', bio: ''}, // empty first, real data once loaded
    onSubmit: async (d) => {
      await saveProfile(d);
    }
  });
  // when `data` arrives, the form re-initializes to it; isDirty stays false until the user edits
  // ...
};
```

> **The check is deep-equal, so inline literals are safe.** `defaultValues={{name: '', bio: ''}}` is a new object every render, but its *contents* don't change, so nothing resets. Only a real content change re-initializes — and when it does, **any unsaved edits are replaced**. If you need to preserve in-progress edits across a data refresh, keep the incoming data in your own state and apply it with `setValues` instead.

## Checkboxes

The form-level `onChange` automatically reads `e.target.checked` when `type="checkbox"`.
Wire it with `checked`, not `value`:

```tsx
<input type="checkbox" name="agree" checked={value.agree} onChange={onChange} />
```

## Other input types — `number`, `select`, `textarea`, `radio`

The form-level `onChange` handles more than text and checkboxes. `number`, `radio`, `select`, and `textarea` all wire the same way — `name` + `value` (or `checked`) + `onChange`. One thing to watch:

**A `number` input still hands you a string.** `e.target.value` is always a string, so the form stores `"42"`, not `42`. If your form type wants a real number, coerce it yourself — for example with a small wrapper around `setValue`:

```tsx
// stored as the string "42"
<input type="number" name="age" value={value.age} onChange={onChange} />

// coerced to a real number
<input
  type="number"
  name="age"
  value={value.age}
  onChange={(e) => setValue({name: 'age', value: e.target.valueAsNumber})}
/>
```

`select` and `textarea` need nothing special:

```tsx
<select name="country" value={value.country} onChange={onChange}>
  <option value="kr">Korea</option>
  <option value="us">United States</option>
</select>

<textarea name="bio" value={value.bio} onChange={onChange} />
```

## Programmatic updates — `setValue` and `setValues`

`setValue` and `setValues` write to the form from code instead of a DOM event — and **both run validation**, exactly like `onChange`. Reach for them to fill the form from an API, clear a dependent field, or wire a custom input that doesn't emit a normal change event.

```tsx
const {value, setValue, setValues} = useForm<Address>({
  defaultValues: {zip: '', city: '', street: ''},
  onSubmit: handle
});

// one field
setValue({name: 'zip', value: '04524'});

// several at once — autofill from a lookup
const onZipLookup = async (zip: string) => {
  const {city, street} = await lookupZip(zip);
  setValues({city, street});
};
```

- `setValue({name, value})` updates and validates a single field.
- `setValues(partial)` updates and validates several at once. A key whose value is `undefined` is left **unvalidated**, so pass concrete values — to clear a field use `''` / `false`, not `undefined`.

## `excludeKey` — leave fields out of the payload

`excludeKey` drops fields from the `onSubmit` payload **without touching validation** — excluded fields are still validated, just not sent. The classic case is a confirm field:

```tsx
type SignUp = {email: string; password: string; passwordConfirm: string};

const {handleSubmit} = useForm<SignUp, 'passwordConfirm'>({
  defaultValues: {email: '', password: '', passwordConfirm: ''},
  excludeKey: ['passwordConfirm'], // validated, but never in the payload
  validateMap,
  onSubmit: async (data) => {
    // data: {email, password} — passwordConfirm is gone, at the type level too
    await fetch('/signup', {method: 'POST', body: JSON.stringify(data)});
  }
});
```

The excluded key is stripped from `data`'s type (`Omit<T, K>`), so `data.passwordConfirm` is a compile error — the payload's shape matches exactly what you send.

## API

### `useForm<T>(options)`

Returns `FormApi<T>`:

- `value: T` — the current form data
- `error: {[K in keyof T]?: TValidationResult}` — per-field error
- `touched: {[K in keyof T]?: boolean}` — per-field touched flag
- `isValidating: {[K in keyof T]?: boolean}` — per-field validation-in-progress flag (async)
- `dirtyFields: {[K in keyof T]?: boolean}` — only the fields that differ from `defaultValues` are present (and `true`); unchanged keys are omitted. Same idea as react-hook-form's `dirtyFields`
- `isDirty: boolean` — whether the form currently differs from `defaultValues` (deep-equal). Same as react-hook-form's `formState.isDirty`
- `setValue({name, value})` / `setValues(partial)` — programmatic updates
- `setErrors({name, error, message})` — manual error setting
- `onChange(e)` — wire to `<input onChange>`. Reads `e.target.name` and `e.target.value`/`e.target.checked`
- `onBlur(e)` — wire to `<input onBlur>`. Marks the field as touched
- `onReset()` — restores the current **baseline** (initially `defaultValues`; the submitted values after a successful submit — see [The form baseline](#the-form-baseline--dirty-reset-and-async-defaultvalues)) and clears error/touched/isValidating
- `handleSubmit(e?)` — runs all validators (awaiting async ones) → calls `onSubmit` on pass. The event is **optional**: pass a `<form>` submit event, a button click event, or nothing at all (it's only used for `e?.preventDefault()`), so it works with or without a `<form>` tag

Options:

- `defaultValues: T` (required)
- `onSubmit: (data, setErrors, onReset) => Promise<void>` (required) — the 2nd/3rd args handle server errors and reset-on-success ([details](#reacting-after-submit--seterrors-and-onreset))
- `validateMap?: TValidatorMap<T>`
- `excludeKey?: (keyof T)[]` — keys to exclude from the submit payload (validation still runs)
- `submitOnlyWhenDirty?: boolean` (default `false`) — when `true`, `handleSubmit` skips `onSubmit` if nothing changed. Default is to always submit
- `onlyDirtyFields?: boolean` (default `false`) — when `true`, the `onSubmit` payload contains only the changed fields, and its `data` argument is typed `Partial<…>`. Validation still runs on every field

### Dirty tracking — `isDirty`, `dirtyFields`, `submitOnlyWhenDirty`, `onlyDirtyFields`

Four separate pieces, deliberately not bundled together:

| API | Kind | Answers |
|---|---|---|
| `isDirty` | returned `boolean` | "did anything change from the initial values?" |
| `dirtyFields` | returned value | "*which* fields changed?" (`{[key]?: true}`) |
| `submitOnlyWhenDirty` | option flag | "skip submit entirely when nothing changed?" |
| `onlyDirtyFields` | option flag | "put only the changed fields in the `onSubmit` payload?" |

**`isDirty` — toggle a Save button.** It's a value you read off the hook (like react-hook-form's `formState.isDirty`), not a callback. No wiring, no memoization headaches.

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
      {/* disabled until something actually changes */}
      <button type="submit" disabled={!isDirty}>
        Save
      </button>
    </form>
  );
};
```

**`submitOnlyWhenDirty` — make submit a no-op when unchanged.** With it `true`, `handleSubmit` returns early and `onSubmit` never runs if the form still equals its initial values.

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
      <button type="submit">Apply</button>
    </form>
  );
};
```

**`onlyDirtyFields` — send only the changed fields (PATCH), automatically.** Turn it on and the `onSubmit` payload holds only the keys that changed. Because unchanged keys are gone, `data` is typed `Partial<…>` (the `true` flips it — that's why there are no explicit generics below: let `data` infer).

```tsx
const AccountForm = ({initial}: {initial: Account}) => {
  const {value, onChange, handleSubmit} = useForm({
    defaultValues: initial,
    onlyDirtyFields: true,
    onSubmit: async (data) => {
      // data: Partial<Account> — only the changed keys
      await fetch('/account', {method: 'PATCH', body: JSON.stringify(data)});
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input name="email" value={value.email} onChange={onChange} />
      <input name="phone" value={value.phone} onChange={onChange} />
      <button type="submit">Update</button>
    </form>
  );
};
```

**Prefer to filter it yourself?** Leave `onlyDirtyFields` off and build the payload by hand from `dirtyFields` — same result, fully explicit, the library trims nothing:

```tsx
onSubmit: async (data) => {
  const changed = Object.fromEntries(
    Object.entries(data).filter(([k]) => dirtyFields[k as keyof Account])
  );
  await fetch('/account', {method: 'PATCH', body: JSON.stringify(changed)});
}
```

### `<FormProvider>`

Takes the same options as `useForm` and accepts either a render-prop function **or** a plain `ReactNode` as children. It wraps the inside in `<form onSubmit={handleSubmit} noValidate>` and provides the Context Provider as well.

### `useFormContext<T>()`

Returns `FormApi<T>`. Throws if called outside `FormProvider`.

## Develop / build / test

```bash
npm run dev        # examples/basic page (localhost:5173)
npm run build      # build the library → dist/
npm test           # vitest run
npm run typecheck  # tsc -b
```

## License

MIT
