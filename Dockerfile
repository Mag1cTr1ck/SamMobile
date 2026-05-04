# Cloud Run / Docker image for the booking API (Node server in backend/).
# From repo root: npm run deploy:bookings-api
# Wire the live site to this service: enable Cloud Run API on the GCP project, add a Hosting rewrite
# /api/** → Cloud Run service `bookings-api` (region us-central1) before the "**" → index.html rule,
# set public/bookings-api.json to { "sameOriginApi": true }, rebuild, then firebase deploy --only hosting.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# Cloud Build can occasionally use a stale source snapshot where lock and package drift.
# `npm install --omit=dev` is more tolerant than `npm ci` and unblocks deployment.
RUN npm install --omit=dev
COPY backend/server.mjs backend/sendBookingMail.mjs ./
COPY public /public
RUN mkdir -p /app/data && chown -R node:node /app
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
