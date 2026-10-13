import { build } from './build.mjs';
process.exit(build(process.env.BOOK_BASE ?? '/machine-learning/', 'dist-subpath'));
