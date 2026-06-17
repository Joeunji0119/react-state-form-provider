import type {FormApi, IFormProvider} from './form.types';
import {FormContext} from './FormContext';
import {useForm} from './useForm';

const FormProvider = <T extends Record<keyof T, unknown>, K extends keyof T = never, D extends boolean = false>(
  props: IFormProvider<T, K, D>
) => {
  const {defaultValues, excludeKey, children, onSubmit, submitOnlyWhenDirty, onlyDirtyFields, validateMap} = props;

  const api = useForm<T, K, D>({defaultValues, excludeKey, onSubmit, submitOnlyWhenDirty, onlyDirtyFields, validateMap});
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
