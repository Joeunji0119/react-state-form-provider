import type {TValidationResult} from './form.types';

type TArrayValue = Set<unknown> | unknown[];

type FunctionalPattern = typeof functionalValidatorPattern;
type FunctionalAllArg<K extends keyof FunctionalPattern> = Parameters<FunctionalPattern[K]> extends [
  string,
  infer A
]
  ? A
  : Record<string, unknown>;
/** 공용 정규식  */
export const regexPatterns = {
  // 이메일 형식: 문자@도메인.최상위도메인
  // 예: test@example.com
  email: /^[\w.-]+@[\w.-]+\.\w+$/,

  // 영문 대/소문자, 숫자, 특수문자 중 3가지를 모두 포함
  // 예: Abcdef1, Pass123
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/,

  // 휴대폰 번호 통신사 식별번호 (010, 011, 016, 017, 018, 019) + 3자리 | 4자리 + 4자리
  // 예: 01112345678
  phone: /^01(?:0|1|[6-9])(?:\d{3}|\d{4})\d{4}$/,

  // string으로 된 num 7자리 또는 8자리
  orgNo: /^\d{8}$/,
  // 공백 포함 빈 값
  trim: /\S/,
  onlyHangul: /^[가-힣]+$/,
  userName: /^(?! )[A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ ]+(?<! )$/,
  license: /^[0-9]+$/
};

/** 공용 validate 함수식 */
export const functionalValidatorPattern = {
  matchValidEmail: (v: string, all: {validatedEmail: string}) => all.validatedEmail === '' || v === all.validatedEmail,
  matchValidOrgNo: (v: string, all: {validatedOrgNo: string}) => all.validatedOrgNo === '' || v === all.validatedOrgNo,
  passwordConfirm: (v: string, all: {password: string}) => v === all.password,
  passwordUsed: (v: string, all: {currentPassword: string}) => v !== all.currentPassword,
  roomNameLength: (v: string) => v.length <= 15,
  userNameLength: (v: string) => v.length <= 10,
  emailLength: (v: string) => v.length <= 100
};

export const functionalArrayValidatorPattern = {
  hasAtLeastOne: (v: TArrayValue) => {
    if (Array.isArray(v)) {
      return v.length > 0;
    } else {
      return v.size > 0;
    }
  }
};

export const advanceRegexValidators =
  <T extends string>(patternKey: keyof typeof regexPatterns, message: T) =>
  (v: string) => {
    const pattern = regexPatterns[patternKey];

    if (!pattern) throw Error('regexValidators error');
    const isValidate = pattern.test(v);

    return formErrorTempl(!isValidate, message);
  };

export const regexValidators =
  <T extends string>(patternKey: keyof typeof regexPatterns, message: T) =>
  (v: string) => {
    const pattern = regexPatterns[patternKey];

    if (!pattern) throw Error('regexValidators error');
    const isValidate = v === '' || pattern.test(v);

    return formErrorTempl(!isValidate, message);
  };

export const formErrorTempl = (hasError: TValidationResult['hasError'], message: TValidationResult['message']) => {
  return {
    hasError,
    message
  };
};

export const functionalValidators =
  <K extends keyof FunctionalPattern, M extends string>(patternKey: K, message: M) =>
  (v: string, all: FunctionalAllArg<K>): TValidationResult => {
    const fn = functionalValidatorPattern[patternKey] as (v: string, all: FunctionalAllArg<K>) => boolean;
    const isValidate = v === '' || fn(v, all);
    return formErrorTempl(!isValidate, message);
  };
export const functionalArrayValidators =
  <T extends string>(patternKey: keyof typeof functionalArrayValidatorPattern, message: T) =>
  (v: TArrayValue) => {
    const isValidate = functionalArrayValidatorPattern[patternKey](v);
    return formErrorTempl(!isValidate, message);
  };

export const booleanValidators =
  <T extends string>(message: T) =>
  (v: boolean) => {
    return formErrorTempl(v, message);
  };

export const pickValidate = <
  T extends Record<string, ReturnType<typeof regexValidators | typeof functionalValidators>[]>
>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> => {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Partial<T>);
};
