export type TypeToEventMap = {
  text: React.ChangeEvent<HTMLInputElement>;
  password: React.ChangeEvent<HTMLInputElement>;
  checkbox: React.ChangeEvent<HTMLInputElement>;
  radio: React.ChangeEvent<HTMLInputElement>;
  email: React.ChangeEvent<HTMLInputElement>;
  number: React.ChangeEvent<HTMLInputElement>;
  textarea: React.ChangeEvent<HTMLTextAreaElement>;
  select: React.ChangeEvent<HTMLSelectElement>;
};

export type THandleError<T> = {name: keyof T; error: boolean; message?: string};
export type TSetValue<T> = {name: keyof T; value: T[keyof T]};
export type TSetValues<T> = Record<keyof T, T[keyof T]>;

export type TTouchedState<T> = {[K in keyof T]?: boolean};
export type TValidatingState<T> = {[K in keyof T]?: boolean};

export type TFormFocusEvent = React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

export type FormRenderProps<T> = {
  value: T;
  error: {[K in keyof T]?: TValidationResult};
  touched: TTouchedState<T>;
  isValidating: TValidatingState<T>;
  setValue: ({name, value}: TSetValue<T>) => void;
  setValues: (values: Partial<TSetValues<T>>) => void;
  setErrors: ({name, error, message}: THandleError<T>) => void;
  onChange: (e: TypeToEventMap[keyof TypeToEventMap]) => void;
  onBlur: (e: TFormFocusEvent) => void;
  onReset: () => void;
};

export type FormApi<T> = FormRenderProps<T> & {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export type Validator<V = unknown, A = Record<string, unknown>> = (
  value: V,
  allValues: A
) => TValidationResult | null | Promise<TValidationResult | null>;

export type TValidatorMap<T> = {
  [K in keyof T]?: Validator<T[K], T>[];
};

export interface IFormProvider<T extends Record<string, unknown>> {
  defaultValues: T;
  excludeKey?: (keyof T)[];
  children: ((props: FormRenderProps<T>) => React.JSX.Element) | React.ReactNode;
  onSubmit: (
    value: Omit<T, keyof T[]>,
    handleError: FormRenderProps<T>['setErrors'],
    onReset: FormRenderProps<T>['onReset']
  ) => Promise<void>;
  isDirty?: (v: boolean) => void;
  validateMap?: TValidatorMap<T>;
}

export type TValidationResult = {
  hasError: boolean;
  message: string;
};

export type TErrorState<T> = {
  [K in keyof T]?: TValidationResult;
};

export type TOnSubmit<T, U extends keyof T = never> = (
  data: Omit<T, U>,
  handleError: FormRenderProps<T>['setErrors'],
  onReset: FormRenderProps<T>['onReset']
) => Promise<void>;
