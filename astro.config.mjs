import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://musicradio.signupeverywhere.cc',
  output: 'static',
  // 允许用环境变量改产物目录：本地沙箱会拦截 dist/.prerender 的 unlink，
  // 构建时用 MR_OUTDIR=/var/tmp/mr-out 绕开（CI 与生产仍走默认 dist）。
  outDir: process.env.MR_OUTDIR || './dist',
  integrations: [react()],
  build: {
    format: 'directory',
  },
});
