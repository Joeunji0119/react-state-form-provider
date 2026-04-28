import {createContext, useContext} from 'react';
import type {FormApi} from './form.types';

export const FormContext = createContext<FormApi<Record<string, unknown>> | null>(null);

export const useFormContext = <T extends Record<string, unknown>>(): FormApi<T> => {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used inside <FormProvider>.');
  }
  return ctx as unknown as FormApi<T>;
};
