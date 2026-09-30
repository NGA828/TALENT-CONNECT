import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      // Resetting local form/modal state when a dialog opens or a fetch key changes is intentional.
      'react-hooks/set-state-in-effect': 'off',
      // useApi keeps the latest query params in a ref so polling never reads stale values.
      'react-hooks/refs': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];
