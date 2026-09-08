# syntax=docker/dockerfile:1
# Publish image for the demo build (see preview.toml: the Rails app cannot run on the platform, so
# the published target is demo/ — the real dashboard against an in-browser dataset). demo/dist is
# committed; demo/server.mjs is a zero-dependency static server with SPA fallback that honours $PORT.
FROM node:20.19.4-slim
WORKDIR /app
COPY package.json ./
COPY demo ./demo
USER node
EXPOSE 8080
CMD ["node", "demo/server.mjs"]
