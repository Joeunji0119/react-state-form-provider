import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import {resolve} from 'node:path';

const PKG_NAME = 'react-state-form-provider';

export default defineConfig(({command}) => {
  if (command === 'build') {
    return {
      plugins: [
        react(),
        dts({
          include: ['src'],
          exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test-setup.ts'],
          outDir: 'dist',
          entryRoot: 'src',
          insertTypesEntry: true,
          tsconfigPath: './tsconfig.build.json'
        })
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime']
        }
      }
    };
  }

  return {
    plugins: [react()],
    root: resolve(__dirname, 'examples/basic'),
    resolve: {
      alias: {
        [PKG_NAME]: resolve(__dirname, 'src')
      }
    }
  };
});
