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

// initValue와 다른 필드만 true로 담긴다 (RHF의 dirtyFields와 같은 의미).
// 바뀐 게 없는 키는 아예 들어오지 않는다.
export type TDirtyState<T> = {[K in keyof T]?: boolean};

export type TFormFocusEvent = React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

// submit 진입점이 받는 이벤트. <form onSubmit>의 FormEvent가 기본이지만,
// <form> 없이 버튼 onClick(MouseEvent)으로 제출하거나 이벤트 없이 직접
// 호출(handleSubmit())하는 것도 허용한다. 핸들러는 e?.preventDefault()만 쓴다.
export type TFormSubmitEvent =
  | React.FormEvent<HTMLFormElement>
  | React.MouseEvent<HTMLElement>;

export type FormRenderProps<T> = {
  value: T;
  error: {[K in keyof T]?: TValidationResult};
  touched: TTouchedState<T>;
  isValidating: TValidatingState<T>;
  dirtyFields: TDirtyState<T>;
  isDirty: boolean;
  setValue: ({name, value}: TSetValue<T>) => void;
  setValues: (values: Partial<TSetValues<T>>) => void;
  setErrors: ({name, error, message}: THandleError<T>) => void;
  onChange: (e: TypeToEventMap[keyof TypeToEventMap]) => void;
  onBlur: (e: TFormFocusEvent) => void;
  onReset: () => void;
};

export type FormApi<T> = FormRenderProps<T> & {
  handleSubmit: (e?: TFormSubmitEvent) => Promise<void>;
};

export type Validator<V = unknown, A = Record<string, unknown>> = (
  value: V,
  allValues: A
) => TValidationResult | null | Promise<TValidationResult | null>;

export type TValidatorMap<T> = {
  [K in keyof T]?: Validator<T[K], T>[];
};

export interface IFormProvider<T extends Record<string, unknown>, K extends keyof T = never, D extends boolean = false> {
  defaultValues: T;
  excludeKey?: K[];
  children: ((props: FormRenderProps<T>) => React.JSX.Element) | React.ReactNode;
  onSubmit: (
    value: D extends true ? Partial<Omit<T, K>> : Omit<T, K>,
    handleError: FormRenderProps<T>['setErrors'],
    onReset: FormRenderProps<T>['onReset']
  ) => Promise<void>;
  /** true면 변경된(dirty) 폼만 제출. 기본값 false — 변경 없어도 항상 제출. */
  submitOnlyWhenDirty?: boolean;
  /** true면 수정된(dirty) 필드만 onSubmit payload에 담는다. 기본 false. */
  onlyDirtyFields?: D;
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
