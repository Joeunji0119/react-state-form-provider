import {FormProvider, validator, type TValidatorMap} from 'react-state-form-provider';

// ============================================================
// 라이브러리는 검증 사상을 가지지 않습니다. 정규식 사전, "빈 값을
// 통과로 볼지" 같은 정책은 전부 사용자(이 파일)에서 정의합니다.
//
// 라이브러리가 제공하는 것:
//   - validator(predicate, msg)      : 임의 predicate를 검증기로 (sync/async)
//   - regex(re, msg)         : pattern.test() 래퍼
//   - formErrorTempl(hasError, msg)  : 동적 메시지용 에러 빌더
// ============================================================

// 1. 자주 쓰는 정규식 사전 — 이 프로젝트의 규칙
const regexPatterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=?~-])[A-Za-z0-9!@#$%^&*()_+=?~-]{8,16}$/,
  phone: /^01(?:0|1|[6-9])(?:\d{3}|\d{4})\d{4}$/,
  orgNo: /^\d{8}$/,
  onlyHangul: /^[가-힣]+$/
};

// 2. 자주 쓰는 함수형 검증 — 다른 필드 참조나 길이 제한
const functionalPatterns = {
  matchPassword: (v: string, all: {password: string}) => v === all.password,
  notSameAsCurrent: (v: string, all: {currentPassword: string}) => v !== all.currentPassword,
  maxLength: (max: number) => (v: string) => v.length <= max
};

// 3. 사용자 헬퍼 — 정규식을 검증기로 한 줄 래핑
const regex = (pattern: RegExp, message: string) => validator((v: string) => pattern.test(v), message);


type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regex(regexPatterns.email, '이메일 형식이 올바르지 않습니다')],
  password: [
    regex(regexPatterns.password, '영문/숫자/특수문자 8~16자'),
    validator(functionalPatterns.maxLength(16), '16자 이하')
  ]
};

export const App = () => {
  return (
    <main style={{maxWidth: 420, margin: '40px auto', fontFamily: 'sans-serif'}}>
      <h1>react-state-form-provider</h1>
      <p>register 없는 React-y form. value + onChange + onBlur 직접 wiring.</p>

      <FormProvider<LoginForm>
        defaultValues={{email: '', password: '', remember: false}}
        validateMap={validateMap}
        onSubmit={async (data) => {
          alert(`submit:\n${JSON.stringify(data, null, 2)}`);
        }}
      >
        {({value, onChange, onBlur, error, touched, onReset}) => (
          <div style={{display: 'grid', gap: 12}}>
            <label>
              <div>이메일</div>
              <input name="email" type="email" value={value.email} onChange={onChange} onBlur={onBlur} />
              {touched.email && error.email?.hasError && (
                <small style={{color: 'crimson'}}>{error.email.message}</small>
              )}
            </label>

            <label>
              <div>비밀번호</div>
              <input name="password" type="password" value={value.password} onChange={onChange} onBlur={onBlur} />
              {touched.password && error.password?.hasError && (
                <small style={{color: 'crimson'}}>{error.password.message}</small>
              )}
            </label>

            <label>
              <input type="checkbox" name="remember" checked={value.remember} onChange={onChange} />
              <span> 로그인 상태 유지</span>
            </label>

            <div style={{display: 'flex', gap: 8}}>
              <button type="submit">제출</button>
              <button type="button" onClick={onReset}>
                리셋
              </button>
            </div>
          </div>
        )}
      </FormProvider>
    </main>
  );
};
