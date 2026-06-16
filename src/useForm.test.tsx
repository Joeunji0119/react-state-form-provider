import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, renderHook, screen, waitFor} from '@testing-library/react';
import FormProvider from './FormProvider';
import {useForm} from './useForm';
import {validator, formErrorTempl} from './validator';
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

describe('useForm — dirty (deep equal)', () => {
  it('reports dirty when nested array changes', async () => {
    type T = {tags: string[]};
    const isDirty = vi.fn();
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {tags: ['a', 'b']},
        isDirty,
        onSubmit: async () => {}
      })
    );

    await act(async () => {
      result.current.setValue({name: 'tags', value: ['a', 'b', 'c']});
    });

    expect(isDirty).toHaveBeenCalledWith(true);
  });

  it('reports not dirty when array re-set to deep-equal value', async () => {
    type T = {tags: string[]};
    const isDirty = vi.fn();
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {tags: ['a', 'b']},
        isDirty,
        onSubmit: async () => {}
      })
    );

    await act(async () => {
      result.current.setValue({name: 'tags', value: ['a', 'b']});
    });

    const lastCall = isDirty.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(false);
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
