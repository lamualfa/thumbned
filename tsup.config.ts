import { defineConfig } from 'tsup'

export default defineConfig({
  format: 'esm',
  splitting: false,
  entry: ['src/cli.ts'],
  clean: true,
  minify: true,
})
