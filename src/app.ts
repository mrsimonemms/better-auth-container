/*
 * Copyright 2025 Simon Emms <simon@simonemms.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fastify from 'fastify';

import { auth } from './auth';
import { config } from './config';

const server = fastify({
  logger: {
    level: config.log.level,
  },
});

server.route({
  method: ['GET', 'POST'],
  url: '/v1/auth/*',
  handler: async (request, reply): Promise<void> => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });

      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      // Process authentication request
      const response = await auth.handler(req);

      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      reply.send(response.body ? await response.text() : null);
    } catch (err) {
      server.log.error({ err }, 'Authentication error');
      reply.status(500).send({
        error: 'Internal authentication error',
        code: 'AUTH_FAILURE',
      });
    }
  },
});

async function bootstrap() {
  await server.listen({ port: config.server.port });
}

bootstrap().catch((err) => {
  server.log.fatal(err, 'Error starting server');
});
