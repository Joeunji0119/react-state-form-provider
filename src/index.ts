export {default as FormProvider} from './FormProvider';
export {useForm, type UseFormOptions} from './useForm';
export {FormContext, useFormContext} from './FormContext';

export type {
  FormApi,
  FormRenderProps,
  IFormProvider,
  TDirtyState,
  TErrorState,
  TFormFocusEvent,
  THandleError,
  TOnSubmit,
  TSetValue,
  TSetValues,
  TTouchedState,
  TValidatingState,
  TValidationResult,
  TValidatorMap,
  Validator,
  TypeToEventMap
} from './form.types';

export {formErrorTempl, validator, regex} from './validator';
