# react-state-form-provider

A state-based React form library. No refs, no `register()` pattern, no coupling to external schema libraries.

[![npm](https://img.shields.io/npm/v/react-state-form-provider.svg)](https://www.npmjs.com/package/react-state-form-provider)

> 📖 **Full docs & live demo:** https://react-state-form-provider-docs.vercel.app
>
> 한국어 문서는 [README.ko.md](README.ko.md)를 참고하세요.

```bash
npm install react-state-form-provider
```

## Requirements

| | |
|---|---|
| React / React-DOM | `>=18` (peer dependency) |
| Node | `>=18` |

## Why build this?

I built it because I dislike [react-hook-form](https://react-hook-form.com/).

**It's React — so why refs?** Keeping the UI and the data in sync is React's greatest strength. Pulling values straight out of the DOM via refs breaks that sync. I know there are cases where refs are unavoidable for performance — I just didn't like reaching for a ref-based library every time I needed to build **one simple form**.

Other things that bugged me:

- **The `register()` pattern.** Spreading a bundle of magic props onto an input hides what's actually wired up. JSX being explicit isn't a downside — it's the point.
- **Coupling to external schema libraries like zod / yup.** zod itself isn't bad — it's a good tool. What I disliked was react-hook-form building **a dedicated "drop your zod schema here" entry point into its API**, like `resolver: zodResolver(schema)`. Do that and the library gets tied to a schema library, and so does everyone using it. This library doesn't know about zod — validation is just functions. If you want zod, call it yourself inside a validator function.
- **The habit of using Context to dodge prop drilling.** I think child components should be passed values explicitly via props. This library does provide `useFormContext`, but it isn't recommended.

> **Honestly, I think forms are something you're better off implementing yourself rather than depending on a library.** It's a bit odd to say that after building a library. But this library isn't "use this instead of react-hook-form" — it's closer to "a write-up of how I deal with forms." Form logic differs subtly from app to app, so what you can control yourself is ultimately the best option.

---

Installation notes, usage patterns, validation timing, and the full API reference live in the docs:

**→ https://react-state-form-provider-docs.vercel.app**
