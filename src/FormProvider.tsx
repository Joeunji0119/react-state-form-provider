import type {FormApi, IFormProvider} from './form.types';
import {FormContext} from './FormContext';
import {useForm} from './useForm';

const FormProvider = <T extends Record<keyof T, unknown>>(props: IFormProvider<T>) => {
  const {defaultValues, excludeKey, children, onSubmit, isDirty, validateMap} = props;

  const api = useForm<T>({defaultValues, excludeKey, onSubmit, isDirty, validateMap});
  const {handleSubmit, ...renderProps} = api;

  const rendered = typeof children === 'function' ? children(renderProps) : children;

  return (
    <FormContext.Provider value={api as unknown as FormApi<Record<string, unknown>>}>
      <form onSubmit={handleSubmit} noValidate>
        {rendered}
      </form>
    </FormContext.Provider>
  );
};

export default FormProvider;
