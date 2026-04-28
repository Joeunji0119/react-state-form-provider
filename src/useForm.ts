import {useEffect, useState, type FocusEvent, type FormEvent} from 'react';
import type {
  FormApi,
  TErrorState,
  THandleError,
  TSetValue,
  TSetValues,
  TTouchedState,
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

const runValidators = <T,>(
  name: keyof T,
  value: T[keyof T],
  formData: T,
  validateMap: TValidatorMap<T> | undefined
): TValidationResult => {
  const validators = validateMap?.[name] ?? [];
  for (const validator of validators) {
    const result = validator(value, formData);
    if (result?.hasError) return result;
  }
  return formErrorTempl(false, '');
};

export interface UseFormOptions<T extends Record<string, unknown>> {
  defaultValues: T;
  excludeKey?: (keyof T)[];
  validateMap?: TValidatorMap<T>;
  isDirty?: (v: boolean) => void;
  onSubmit: (
    value: Omit<T, keyof T[]>,
    handleError: (payload: THandleError<T>) => void,
    onReset: () => void
  ) => Promise<void>;
}

export const useForm = <T extends Record<keyof T, unknown>>(options: UseFormOptions<T>): FormApi<T> => {
  const {defaultValues, excludeKey = [], onSubmit, isDirty, validateMap} = options;

  const [formData, setFormData] = useState<T>(() => structuredClone(defaultValues));
  const [initValue, setInitValue] = useState<T>(() => structuredClone(defaultValues));
  const [error, setError] = useState<TErrorState<T>>({});
  const [touched, setTouched] = useState<TTouchedState<T>>({});

  useEffect(() => {
    if (!isDirty) return;
    isDirty(!isDeepEqual(initValue, formData));
  }, [formData, initValue, isDirty]);

  const onReset = () => {
    setFormData(initValue);
    setError({});
    setTouched({});
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

  const validateAll = (data: T): TErrorState<T> => {
    const next: TErrorState<T> = {};
    (Object.keys(data) as (keyof T)[]).forEach((name) => {
      next[name] = runValidators(name, data[name], data, validateMap);
    });
    return next;
  };

  const hasAnyError = (errors: TErrorState<T>): boolean =>
    (Object.keys(errors) as (keyof T)[]).some((k) => errors[k]?.hasError);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (isDirty && isDeepEqual(initValue, formData)) {
        isDirty(false);
        return;
      }

      const allErrors = validateAll(formData);
      setError(allErrors);
      const allTouched = (Object.keys(formData) as (keyof T)[]).reduce<TTouchedState<T>>((acc, k) => {
        acc[k] = true;
        return acc;
      }, {});
      setTouched(allTouched);
      if (hasAnyError(allErrors)) return;

      const filtered = Object.fromEntries(
        Object.entries(formData).filter(([k]) => !excludeKey.includes(k as (typeof excludeKey)[number]))
      ) as Omit<T, keyof T[]>;

      await onSubmit(filtered, setErrors, onReset);
      setInitValue(structuredClone(formData));
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = (name: TSetValue<T>['name'], value: TSetValue<T>['value']) => {
    const nextFormData = {...formData, [name]: value};
    const result = runValidators(name, value, nextFormData, validateMap);
    setError((prev) => ({...prev, [name]: result}));
  };

  const onChange = (e: TypeToEventMap[keyof TypeToEventMap]) => {
    const inputValue = e?.target?.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    const targetName = e.target.name as keyof T;

    setFormData((prev) => ({...prev, [targetName]: inputValue}));
    handleValidate(targetName, inputValue as T[keyof T]);
  };

  const onBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const targetName = e.target.name as keyof T;
    setTouched((prev) => ({...prev, [targetName]: true}));
  };

  const setValue = ({name, value}: TSetValue<T>) => {
    setFormData((prev) => ({...prev, [name]: value}));
    handleValidate(name, value);
  };

  const setValues = (values: Partial<TSetValues<T>>) => {
    setFormData((prev) => Object.assign({...prev}, values));
    const keys = Object.keys(values) as (keyof TSetValues<T>)[];
    keys.forEach((key) => {
      if (values[key] === undefined) return;
      handleValidate(key, values[key]);
    });
  };

  return {
    value: formData,
    error,
    touched,
    setValue,
    setValues,
    setErrors,
    onChange,
    onBlur,
    onReset,
    handleSubmit
  };
};
