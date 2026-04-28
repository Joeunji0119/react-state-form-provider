export {default as FormProvider} from './FormProvider';
export {useForm, type UseFormOptions} from './useForm';
export {FormContext, useFormContext} from './FormContext';

export type {
  FormApi,
  FormRenderProps,
  IFormProvider,
  TErrorState,
  TFormFocusEvent,
  THandleError,
  TOnSubmit,
  TSetValue,
  TSetValues,
  TTouchedState,
  TValidationResult,
  TValidatorMap,
  Validator,
  TypeToEventMap
} from './form.types';

export {
  advanceRegexValidators,
  booleanValidators,
  formErrorTempl,
  functionalArrayValidatorPattern,
  functionalArrayValidators,
  functionalValidatorPattern,
  functionalValidators,
  pickValidate,
  regexPatterns,
  regexValidators
} from './validator';
