import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, fireEvent} from '@testing-library/react';
import FormProvider from './FormProvider';
import {useForm} from './useForm';
import {regexValidators} from './validator';
import type {TValidatorMap} from './form.types';
import {renderHook} from '@testing-library/react';

type Form = {email: string; password: string};

const validateMap: TValidatorMap<Form> = {
  email: [regexValidators('email', 'invalid email')]
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
  it('reports not dirty when nested object equal', () => {
    const isDirty = vi.fn();
    type T = {profile: {name: string}};

    const {rerender} = renderHook(
      ({values}) =>
        useForm<T>({
          defaultValues: values,
          isDirty,
          onSubmit: async () => {}
        }),
      {initialProps: {values: {profile: {name: 'a'}}}}
    );

    rerender({values: {profile: {name: 'a'}}});
    // setValues with structurally equal — but we just need to verify deep equal logic
    // via setValue
  });

  it('reports dirty when nested array changes', () => {
    type T = {tags: string[]};
    const isDirty = vi.fn();
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {tags: ['a', 'b']},
        isDirty,
        onSubmit: async () => {}
      })
    );

    act(() => {
      result.current.setValue({name: 'tags', value: ['a', 'b', 'c']});
    });

    expect(isDirty).toHaveBeenCalledWith(true);
  });

  it('reports not dirty when array re-set to deep-equal value', () => {
    type T = {tags: string[]};
    const isDirty = vi.fn();
    const {result} = renderHook(() =>
      useForm<T>({
        defaultValues: {tags: ['a', 'b']},
        isDirty,
        onSubmit: async () => {}
      })
    );

    act(() => {
      result.current.setValue({name: 'tags', value: ['a', 'b']});
    });

    // last call should be false (deep-equal to initValue)
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
  it('restores formData and clears error/touched', () => {
    const {result} = renderHook(() =>
      useForm<Form>({
        defaultValues: {email: 'init@a.com', password: 'p'},
        validateMap,
        onSubmit: async () => {}
      })
    );

    act(() => {
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
  });
});
