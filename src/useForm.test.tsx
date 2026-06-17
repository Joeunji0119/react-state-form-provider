import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, renderHook, screen, waitFor} from '@testing-library/react';
import FormProvider from './FormProvider';
import {useForm} from './useForm';
import {validator, regex, formErrorTempl} from './validator';
import type {TValidatorMap} from './form.types';

type Form = {email: string; password: string};

const emailRegex = /^[\w.-]+@[\w.-]+\.\w+$/;
const validateMap: TValidatorMap<Form> = {
  email: [validator((v: string) => emailRegex.test(v), 'invalid email')]
};

describe('useForm — submit gate', () => {
  it('blocks onSubmit when validators fail', async () => {
    const onSubmit = vi.fn();
    render(
      <FormProvider<Form>
        defaultValues={{email: 'not-email', password: ''}}
        validateMap={validateMap}
        onSubmit={onSubmit}
      >
        {() => <button type="submit">go</button>}
      </FormProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'go'}));
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when validators pass', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormProvider<Form>
        defaultValues={{email: 'a@b.com', password: 'x'}}
        validateMap={validateMap}
        onSubmit={onSubmit}
      >
        {() => <button type="submit">go</button>}
      </FormProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'go'}));
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toEqual({email: 'a@b.com', password: 'x'});
  });
});

describe('useForm — isDirty (boolean, deep equal)', () => {
  it('is true when a nested array changes', async () => {
    type T = {tags: string[]};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {tags: ['a', 'b']}, onSubmit: async () => {}})
    );

    expect(result.current.isDirty).toBe(false);

    await act(async () => {
      result.current.setValue({name: 'tags', value: ['a', 'b', 'c']});
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('is false when an array is re-set to a deep-equal value', async () => {
    type T = {tags: string[]};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {tags: ['a', 'b']}, onSubmit: async () => {}})
    );

    await act(async () => {
      result.current.setValue({name: 'tags', value: ['a', 'b']});
    });

    expect(result.current.isDirty).toBe(false);
  });
});

describe('useForm — dirtyFields', () => {
  type T = {email: string; password: string};
  const defaults = {email: 'a@b.com', password: 'x'};

  it('marks only changed fields and omits unchanged ones', async () => {
    const {result} = renderHook(() => useForm<T>({defaultValues: defaults, onSubmit: async () => {}}));

    expect(result.current.dirtyFields).toEqual({});

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });

    expect(result.current.dirtyFields).toEqual({email: true});
    expect(result.current.dirtyFields.password).toBeUndefined();
  });

  it('clears a field when it is set back to its initial value (deep equal)', async () => {
    const {result} = renderHook(() => useForm<T>({defaultValues: defaults, onSubmit: async () => {}}));

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });
    expect(result.current.dirtyFields).toEqual({email: true});

    await act(async () => {
      result.current.setValue({name: 'email', value: 'a@b.com'});
    });
    expect(result.current.dirtyFields).toEqual({});
  });

  it('resets on onReset', async () => {
    const {result} = renderHook(() => useForm<T>({defaultValues: defaults, onSubmit: async () => {}}));

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });
    expect(result.current.dirtyFields).toEqual({email: true});

    await act(async () => {
      result.current.onReset();
    });
    expect(result.current.dirtyFields).toEqual({});
  });

  // README의 "바뀐 것만 제출(PATCH)" 패턴이 실제로 동작하는지 잠금.
  it('lets a consumer filter the submit payload down to changed keys', async () => {
    const received: Record<string, unknown>[] = [];
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: defaults,
        onSubmit: async (data) => {
          const changed = Object.fromEntries(
            Object.entries(data).filter(([k]) => result.current.dirtyFields[k as keyof T])
          );
          received.push(changed);
        }
      })
    );

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(received).toEqual([{email: 'z@b.com'}]);
  });
});

describe('useForm — submitOnlyWhenDirty gate', () => {
  type T = {email: string; password: string};
  const defaults = {email: 'a@b.com', password: 'x'};

  it('submits an unchanged form when submitOnlyWhenDirty is not set (default)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() => useForm<T>({defaultValues: defaults, onSubmit}));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('blocks an unchanged form when submitOnlyWhenDirty is true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: defaults, submitOnlyWhenDirty: true, onSubmit})
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a changed form when submitOnlyWhenDirty is true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: defaults, submitOnlyWhenDirty: true, onSubmit})
    );

    await act(async () => {
      result.current.setValue({name: 'password', value: 'changed'});
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('useForm — onlyDirtyFields payload', () => {
  type T = {email: string; password: string};
  const defaults = {email: 'a@b.com', password: 'x'};

  it('submits only the changed fields when onlyDirtyFields is true', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T, never, true>({defaultValues: defaults, onlyDirtyFields: true, onSubmit})
    );

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit.mock.calls[0][0]).toEqual({email: 'z@b.com'});
  });

  it('submits the full form when onlyDirtyFields is omitted (default)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() => useForm<T>({defaultValues: defaults, onSubmit}));

    await act(async () => {
      result.current.setValue({name: 'email', value: 'z@b.com'});
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit.mock.calls[0][0]).toEqual({email: 'z@b.com', password: 'x'});
  });
});

describe('useForm — onBlur touched tracking', () => {
  it('marks field touched on blur event', () => {
    const {result} = renderHook(() =>
      useForm<Form>({
        defaultValues: {email: '', password: ''},
        onSubmit: async () => {}
      })
    );

    expect(result.current.touched.email).toBeUndefined();

    const fakeEvent = {target: {name: 'email'}} as unknown as React.FocusEvent<HTMLInputElement>;
    act(() => {
      result.current.onBlur(fakeEvent);
    });

    expect(result.current.touched.email).toBe(true);
    expect(result.current.touched.password).toBeUndefined();
  });
});

describe('useForm — onReset', () => {
  it('restores formData and clears error/touched/isValidating', async () => {
    const {result} = renderHook(() =>
      useForm<Form>({
        defaultValues: {email: 'init@a.com', password: 'p'},
        validateMap,
        onSubmit: async () => {}
      })
    );

    await act(async () => {
      result.current.setValue({name: 'email', value: 'bad'});
    });
    expect(result.current.value.email).toBe('bad');
    expect(result.current.error.email?.hasError).toBe(true);

    const blurEvt = {target: {name: 'email'}} as unknown as React.FocusEvent<HTMLInputElement>;
    act(() => {
      result.current.onBlur(blurEvt);
    });
    expect(result.current.touched.email).toBe(true);

    act(() => {
      result.current.onReset();
    });

    expect(result.current.value.email).toBe('init@a.com');
    expect(result.current.error.email).toBeUndefined();
    expect(result.current.touched.email).toBeUndefined();
    expect(result.current.isValidating.email).toBeUndefined();
  });
});

describe('useForm — async validators', () => {
  // 약간의 지연을 두는 검증기 헬퍼
  const delayed = (ms: number, pass: boolean) => () =>
    new Promise<ReturnType<typeof formErrorTempl>>((resolve) =>
      setTimeout(() => resolve(formErrorTempl(!pass, pass ? '' : 'async fail')), ms)
    );

  it('sets error after async validator resolves', async () => {
    type T = {name: string};
    const map: TValidatorMap<T> = {name: [delayed(20, false)]};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {name: 'x'}, validateMap: map, onSubmit: async () => {}})
    );

    await act(async () => {
      result.current.setValue({name: 'name', value: 'y'});
    });

    await waitFor(() => {
      expect(result.current.error.name?.hasError).toBe(true);
      expect(result.current.error.name?.message).toBe('async fail');
    });
  });

  it('isValidating goes true during, false after async validator', async () => {
    type T = {name: string};
    const map: TValidatorMap<T> = {name: [delayed(30, true)]};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {name: 'x'}, validateMap: map, onSubmit: async () => {}})
    );

    act(() => {
      result.current.setValue({name: 'name', value: 'y'});
    });

    // immediately after setValue, isValidating should be true
    await waitFor(() => {
      expect(result.current.isValidating.name).toBe(true);
    });

    // after the validator resolves, false
    await waitFor(() => {
      expect(result.current.isValidating.name).toBe(false);
    });
  });

  it('race: only latest async validator result applies', async () => {
    type T = {name: string};
    // slow validator that returns error if value !== 'good'
    const slow = (ms: number) => (v: string) =>
      new Promise<ReturnType<typeof formErrorTempl>>((resolve) =>
        setTimeout(() => resolve(formErrorTempl(v !== 'good', v !== 'good' ? `bad: ${v}` : '')), ms)
      );

    const map: TValidatorMap<T> = {name: [slow(50)]};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {name: 'x'}, validateMap: map, onSubmit: async () => {}})
    );

    // fire two rapid updates: first one will resolve LATER but for 'bad', second resolves quickly for 'good'
    // (both slow(50) but second's gen is higher → only second's result applies)
    await act(async () => {
      result.current.setValue({name: 'name', value: 'bad-value'});
      result.current.setValue({name: 'name', value: 'good'});
    });

    await waitFor(() => {
      expect(result.current.value.name).toBe('good');
      expect(result.current.error.name?.hasError).toBe(false);
    });
  });

  it('submit awaits async validators and blocks on error', async () => {
    type T = {name: string};
    const map: TValidatorMap<T> = {name: [delayed(20, false)]};
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <FormProvider<T> defaultValues={{name: 'x'}} validateMap={map} onSubmit={onSubmit}>
        {({error}) => (
          <>
            <button type="submit">go</button>
            <span data-testid="msg">{error.name?.message ?? ''}</span>
          </>
        )}
      </FormProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'go'}));
    });

    // wait for validators to finish and error to be applied
    await waitFor(() => {
      expect(screen.getByTestId('msg').textContent).toBe('async fail');
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submit awaits async validators and passes when all clear', async () => {
    type T = {name: string};
    const map: TValidatorMap<T> = {name: [delayed(20, true)]};
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <FormProvider<T> defaultValues={{name: 'x'}} validateMap={map} onSubmit={onSubmit}>
        {() => <button type="submit">go</button>}
      </FormProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'go'}));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
  });
});

describe('useForm — excludeKey', () => {
  it('strips excluded keys from the object passed to onSubmit', async () => {
    type T = {email: string; password: string; _internal: string};
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T, '_internal'>({
        defaultValues: {email: 'a@b.com', password: 'pw', _internal: 'secret'},
        excludeKey: ['_internal'],
        onSubmit
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toEqual({email: 'a@b.com', password: 'pw'});
    expect('_internal' in submitted).toBe(false);
    // 타입 레벨에서도 _internal이 빠졌는지 — 컴파일되면 통과
    onSubmit.mockImplementation(async (data: Omit<T, '_internal'>) => {
      // @ts-expect-error _internal은 Omit으로 제거되어 접근 불가
      void data._internal;
    });
  });
});

describe('useForm — setValues', () => {
  it('updates multiple fields at once', async () => {
    type T = {a: string; b: string};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {a: '', b: ''}, onSubmit: async () => {}})
    );

    await act(async () => {
      result.current.setValues({a: '1', b: '2'});
    });

    expect(result.current.value).toEqual({a: '1', b: '2'});
  });

  it('runs validators for each changed field', async () => {
    type T = {a: string; b: string};
    const map: TValidatorMap<T> = {
      a: [validator((v: string) => v.length > 0, 'a required')],
      b: [validator((v: string) => v.length > 0, 'b required')]
    };
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {a: 'x', b: 'y'}, validateMap: map, onSubmit: async () => {}})
    );

    await act(async () => {
      result.current.setValues({a: '', b: ''});
    });

    await waitFor(() => {
      expect(result.current.error.a?.hasError).toBe(true);
      expect(result.current.error.b?.hasError).toBe(true);
    });
  });
});

describe('useForm — onSubmit callbacks', () => {
  it('handleError sets a server-side field error', async () => {
    type T = {email: string};
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {email: 'a@b.com'},
        onSubmit: async (_data, handleError) => {
          handleError({name: 'email', error: true, message: 'already taken'});
        }
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error.email?.hasError).toBe(true);
    expect(result.current.error.email?.message).toBe('already taken');
  });

  it('onReset callback restores values after submit', async () => {
    type T = {name: string};
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {name: 'init'},
        onSubmit: async (_data, _handleError, onReset) => {
          onReset();
        }
      })
    );

    await act(async () => {
      result.current.setValue({name: 'name', value: 'changed'});
    });
    expect(result.current.value.name).toBe('changed');

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.value.name).toBe('init');
  });
});

describe('useForm — onChange checkbox', () => {
  it('uses checked (boolean) for checkbox inputs', async () => {
    type T = {agree: boolean};
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {agree: false}, onSubmit: async () => {}})
    );

    const evt = {
      target: {name: 'agree', type: 'checkbox', checked: true}
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    await act(async () => {
      result.current.onChange(evt);
    });

    expect(result.current.value.agree).toBe(true);
  });
});

describe('useForm — submitOnlyWhenDirty', () => {
  it('submits a pristine form by default', async () => {
    type T = {name: string};
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {name: 'x'}, onSubmit})
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('blocks a pristine submit but allows it after a change', async () => {
    type T = {name: string};
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const {result} = renderHook(() =>
      useForm<T>({defaultValues: {name: 'x'}, submitOnlyWhenDirty: true, onSubmit})
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      result.current.setValue({name: 'name', value: 'y'});
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('useForm — reactive defaultValues', () => {
  type T = {email: string; password: string};

  it('re-initializes the form when defaultValues content changes (async initial data)', async () => {
    const {result, rerender} = renderHook(
      ({defaults}: {defaults: T}) => useForm<T>({defaultValues: defaults, onSubmit: async () => {}}),
      {initialProps: {defaults: {email: '', password: ''}}}
    );

    expect(result.current.value).toEqual({email: '', password: ''});

    // 비동기로 도착한 초기값으로 prop 교체
    await act(async () => {
      rerender({defaults: {email: 'loaded@a.com', password: 'pw'}});
    });

    expect(result.current.value).toEqual({email: 'loaded@a.com', password: 'pw'});
    // 새 값이 기준선이 되므로 dirty 아님
    expect(result.current.isDirty).toBe(false);
    expect(result.current.dirtyFields).toEqual({});
  });

  it('does not reset on a new-but-deep-equal defaultValues object (inline literal safe)', async () => {
    const {result, rerender} = renderHook(
      ({defaults}: {defaults: T}) => useForm<T>({defaultValues: defaults, onSubmit: async () => {}}),
      {initialProps: {defaults: {email: 'a@b.com', password: 'x'}}}
    );

    await act(async () => {
      result.current.setValue({name: 'email', value: 'edited@b.com'});
    });
    expect(result.current.value.email).toBe('edited@b.com');

    // 내용은 같지만 새 객체 (매 렌더 인라인 리터럴 상황)
    await act(async () => {
      rerender({defaults: {email: 'a@b.com', password: 'x'}});
    });

    // 사용자가 편집한 값이 유지돼야 한다
    expect(result.current.value.email).toBe('edited@b.com');
  });

  it('clears error/touched on re-initialization', async () => {
    const {result, rerender} = renderHook(
      ({defaults}: {defaults: T}) =>
        useForm<T>({defaultValues: defaults, validateMap, onSubmit: async () => {}}),
      {initialProps: {defaults: {email: 'bad', password: ''}}}
    );

    await act(async () => {
      result.current.setValue({name: 'email', value: 'still-bad'});
    });
    const blurEvt = {target: {name: 'email'}} as unknown as React.FocusEvent<HTMLInputElement>;
    act(() => {
      result.current.onBlur(blurEvt);
    });
    expect(result.current.error.email?.hasError).toBe(true);
    expect(result.current.touched.email).toBe(true);

    await act(async () => {
      rerender({defaults: {email: 'fresh@a.com', password: 'pw'}});
    });

    expect(result.current.value.email).toBe('fresh@a.com');
    expect(result.current.error.email).toBeUndefined();
    expect(result.current.touched.email).toBeUndefined();
  });
});

describe('validator — regex helper', () => {
  it('passes matching values and fails non-matching', async () => {
    const v = regex(/^\d+$/, 'digits only');
    expect(await v('123', {})).toEqual(formErrorTempl(false, ''));
    expect(await v('12a', {})).toEqual(formErrorTempl(true, 'digits only'));
  });
});
