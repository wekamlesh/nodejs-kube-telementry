# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Create the final, smaller image
FROM node:18-alpine
WORKDIR /usr/src/app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY app.js .
COPY tracer.js .  # <-- ADD THIS LINE

EXPOSE 3000
CMD [ "node", "app.js" ]