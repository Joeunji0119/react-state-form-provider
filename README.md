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

React's strength is that the UI and the data stay in sync. A library that reads values straight from the DOM through refs throws that strength away.

For a simple form you don't really need a library — handling a few inputs directly with state is often the simpler choice, especially compared to a ref-based library (react-hook-form's default approach).

Worried about re-renders? A form with a handful of fields is perfectly fine re-rendering on every keystroke. It won't fall over. Re-render optimization is something you need for large forms with dozens or hundreds of fields — and you can worry about it when you actually get there.

So this library isn't saying "use this." It's saying: build the simple things yourself, without a library, and reach for state instead of refs. This documentation is a write-up, in code, of how to do that.

---

Installation notes, usage patterns, validation timing, and the full API reference live in the docs:

**→ https://react-state-form-provider-docs.vercel.app**
