import {useEffect, useMemo, useRef, useState, type FocusEvent} from 'react';
import type {
  FormApi,
  TDirtyState,
  TErrorState,
  TFormSubmitEvent,
  THandleError,
  TSetValue,
  TSetValues,
  TTouchedState,
  TValidatingState,
  TValidationResult,
  TValidatorMap,
  TypeToEventMap
} from './form.types';
import {formErrorTempl} from './validator';

const isDeepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => isDeepEqual(v, b[i]));
  }
  if (Array.isArray(b)) return false;

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) =>
    isDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
};

const runValidators = async <T,>(
  name: keyof T,
  value: T[keyof T],
  formData: T,
  validateMap: TValidatorMap<T> | undefined
): Promise<TValidationResult> => {
  const validators = validateMap?.[name] ?? [];
  for (const validator of validators) {
    const result = await validator(value, formData);
    if (result?.hasError) return result;
  }
  return formErrorTempl(false, '');
};

export interface UseFormOptions<T extends Record<string, unknown>, K extends keyof T = never, D extends boolean = false> {
  defaultValues: T;
  excludeKey?: K[];
  validateMap?: TValidatorMap<T>;
  /** true면 변경된(dirty) 폼만 제출. 기본값 false — 변경 없어도 항상 제출. */
  submitOnlyWhenDirty?: boolean;
  /** true면 수정된(dirty) 필드만 onSubmit payload에 담는다. 기본 false. */
  onlyDirtyFields?: D;
  onSubmit: (
    value: D extends true ? Partial<Omit<T, K>> : Omit<T, K>,
    handleError: (payload: THandleError<T>) => void,
    onReset: () => void
  ) => Promise<void>;
}

export const useForm = <T extends Record<keyof T, unknown>, K extends keyof T = never, D extends boolean = false>(
  options: UseFormOptions<T, K, D>
): FormApi<T> => {
  const {defaultValues, excludeKey = [], onSubmit, submitOnlyWhenDirty, onlyDirtyFields, validateMap} = options;

  const [formData, setFormData] = useState<T>(() => structuredClone(defaultValues));
  const [initValue, setInitValue] = useState<T>(() => structuredClone(defaultValues));
  const [error, setError] = useState<TErrorState<T>>({});
  const [touched, setTouched] = useState<TTouchedState<T>>({});
  const [isValidating, setIsValidating] = useState<TValidatingState<T>>({});

  // 필드별 generation 토큰 — async validator race protection
  const generations = useRef<Record<string, number>>({});
  const bumpGen = (name: keyof T): number => {
    const k = name as string;
    const g = (generations.current[k] ?? 0) + 1;
    generations.current[k] = g;
    return g;
  };
  const isLatest = (name: keyof T, g: number): boolean => generations.current[name as string] === g;

  // defaultValues가 (내용 기준으로) 바뀌면 폼을 그 값으로 재초기화한다.
  // 비동기로 도착하는 초기값(API 응답)을 폼에 싣기 위한 동작.
  // deep-equal로 비교하므로 인라인 리터럴({...})은 매 렌더 새 객체여도 리셋되지 않는다.
  const prevDefaults = useRef<T>(defaultValues);
  useEffect(() => {
    if (isDeepEqual(prevDefaults.current, defaultValues)) return;
    prevDefaults.current = defaultValues;

    const next = structuredClone(defaultValues);
    setFormData(next);
    setInitValue(next);
    setError({});
    setTouched({});
    setIsValidating({});
    // in-flight validator는 모두 stale 처리
    Object.keys(generations.current).forEach((k) => {
      generations.current[k] = (generations.current[k] ?? 0) + 1;
    });
  }, [defaultValues]);

  // initValue 대비 바뀐 필드만 true. 사용자가 payload를 직접 추려 쓸 때 사용.
  const dirtyFields = useMemo<TDirtyState<T>>(() => {
    const next: TDirtyState<T> = {};
    (Object.keys(formData) as (keyof T)[]).forEach((k) => {
      if (!isDeepEqual(formData[k], initValue[k])) next[k] = true;
    });
    return next;
  }, [formData, initValue]);

  // 하나라도 바뀌었으면 dirty. dirtyFields와 같은 비교를 단일 소스로 공유.
  const isDirty = Object.keys(dirtyFields).length > 0;

  const onReset = () => {
    setFormData(initValue);
    setError({});
    setTouched({});
    setIsValidating({});
    // bump all gens so any in-flight validators become stale
    Object.keys(generations.current).forEach((k) => {
      generations.current[k] = (generations.current[k] ?? 0) + 1;
    });
  };

  const setErrors = ({name, error: hasError, message = ''}: THandleError<T>) => {
    setError((prev) => ({
      ...prev,
      [name]: {
        hasError,
        message
      }
    }));
  };

  // 단일 필드 비동기 검증 — race-safe하게 error/isValidating 갱신
  const handleValidate = async (name: keyof T, value: T[keyof T], formData: T) => {
    const myGen = bumpGen(name);
    setIsValidating((prev) => ({...prev, [name]: true}));
    try {
      const result = await runValidators(name, value, formData, validateMap);
      if (isLatest(name, myGen)) {
        setError((prev) => ({...prev, [name]: result}));
      }
    } catch (err) {
      console.error('validator error', err);
    } finally {
      if (isLatest(name, myGen)) {
        setIsValidating((prev) => ({...prev, [name]: false}));
      }
    }
  };

  // 전체 필드 일괄 검증 — submit 시점. 결과 반환 + setError/setIsValidating 직접 갱신.
  const validateAll = async (data: T): Promise<TErrorState<T>> => {
    const names = Object.keys(data) as (keyof T)[];
    const myGens = new Map<keyof T, number>();
    names.forEach((n) => myGens.set(n, bumpGen(n)));

    setIsValidating((prev) => {
      const next = {...prev};
      names.forEach((n) => {
        next[n] = true;
      });
      return next;
    });

    const next: TErrorState<T> = {};
    try {
      const results = await Promise.all(
        names.map(async (n) => [n, await runValidators(n, data[n], data, validateMap)] as const)
      );
      results.forEach(([n, r]) => {
        next[n] = r;
      });
    } finally {
      setIsValidating((prev) => {
        const acc = {...prev};
        names.forEach((n) => {
          if (isLatest(n, myGens.get(n)!)) {
            acc[n] = false;
          }
        });
        return acc;
      });
    }
    return next;
  };

  const hasAnyError = (errors: TErrorState<T>): boolean =>
    (Object.keys(errors) as (keyof T)[]).some((k) => errors[k]?.hasError);

  const handleSubmit = async (e?: TFormSubmitEvent) => {
    e?.preventDefault();
    try {
      if (submitOnlyWhenDirty && !isDirty) {
        return;
      }

      const allErrors = await validateAll(formData);
      setError(allErrors);
      const allTouched = (Object.keys(formData) as (keyof T)[]).reduce<TTouchedState<T>>((acc, k) => {
        acc[k] = true;
        return acc;
      }, {});
      setTouched(allTouched);
      if (hasAnyError(allErrors)) return;

      const filtered = Object.fromEntries(
        Object.entries(formData).filter(
          ([k]) => !excludeKey.includes(k as K) && (!onlyDirtyFields || dirtyFields[k as keyof T])
        )
      ) as Omit<T, K>;

      await onSubmit(filtered, setErrors, onReset);
      setInitValue(structuredClone(formData));
    } catch (err) {
      console.error(err);
    }
  };

  const onChange = (e: TypeToEventMap[keyof TypeToEventMap]) => {
    const inputValue = e?.target?.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    const targetName = e.target.name as keyof T;

    setFormData((prev) => ({...prev, [targetName]: inputValue}));
    void handleValidate(targetName, inputValue as T[keyof T], {...formData, [targetName]: inputValue});
  };

  const onBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const targetName = e.target.name as keyof T;
    setTouched((prev) => ({...prev, [targetName]: true}));
  };

  const setValue = ({name, value}: TSetValue<T>) => {
    setFormData((prev) => ({...prev, [name]: value}));
    void handleValidate(name, value, {...formData, [name]: value});
  };

  const setValues = (values: Partial<TSetValues<T>>) => {
    setFormData((prev) => Object.assign({...prev}, values));
    const keys = Object.keys(values) as (keyof TSetValues<T>)[];
    const nextFormData = {...formData, ...values} as T;
    keys.forEach((key) => {
      if (values[key] === undefined) return;
      void handleValidate(key, values[key] as T[keyof T], nextFormData);
    });
  };

  return {
    value: formData,
    error,
    touched,
    isValidating,
    dirtyFields,
    isDirty,
    setValue,
    setValues,
    setErrors,
    onChange,
    onBlur,
    onReset,
    handleSubmit
  };
};
