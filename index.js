/** DshCat Host half: authenticated data API, database adapters, and AI copilot. */

import { DshCatApi } from './lib/api.js';

export const inject = ['connection', 'credentials'];

export async function apply(ctx) {
  const api = new DshCatApi(ctx);
  await api.init();
  ctx.effect(() => () => api.dispose(), 'dshcat: close database connections');
  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/dshcat',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => api.handle(request)
  }), 'dshcat: data API');
}
