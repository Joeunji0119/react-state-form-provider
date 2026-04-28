import {FormProvider, regexValidators, type TValidatorMap} from 'react-state-form-provider';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

const validateMap: TValidatorMap<LoginForm> = {
  email: [regexValidators('email', '이메일 형식이 올바르지 않습니다')],
  password: [regexValidators('password', '영문/숫자/특수문자 8~16자')]
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
              <input
                name="email"
                type="email"
                value={value.email}
                onChange={onChange}
                onBlur={onBlur}
              />
              {touched.email && error.email?.hasError && (
                <small style={{color: 'crimson'}}>{error.email.message}</small>
              )}
            </label>

            <label>
              <div>비밀번호</div>
              <input
                name="password"
                type="password"
                value={value.password}
                onChange={onChange}
                onBlur={onBlur}
              />
              {touched.password && error.password?.hasError && (
                <small style={{color: 'crimson'}}>{error.password.message}</small>
              )}
            </label>

            <label>
              <input
                type="checkbox"
                name="remember"
                checked={value.remember}
                onChange={onChange}
              />
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
