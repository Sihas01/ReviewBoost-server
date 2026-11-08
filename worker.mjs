import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import createApp from './index.js';

const app = createApp(env);
const server = app.listen(3001);

export default httpServerHandler(server);
