import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const app = require('../server/index.cjs');

export default function(req, res) {
  // If Vercel already parsed the body, tell body-parser to skip it
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    req._body = true;
  }
  return app(req, res);
}
