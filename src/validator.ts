import type {TValidationResult} from './form.types';

export const formErrorTempl = (
  hasError: TValidationResult['hasError'],
  message: TValidationResult['message']
): TValidationResult => ({hasError, message});

/**
 * 임의의 predicate를 받아 검증기로 래핑. sync/async 둘 다 지원.
 * predicate가 true → 통과, false → message를 담은 에러.
 */
export const validator =
  <V, A>(predicate: (v: V, all: A) => boolean | Promise<boolean>, message: string) =>
  async (v: V, all: A): Promise<TValidationResult> => {
    const ok = await predicate(v, all);
    return ok ? formErrorTempl(false, '') : formErrorTempl(true, message);
  };
