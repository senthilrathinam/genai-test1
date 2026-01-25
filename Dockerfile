FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Install Playwright with Chromium and dependencies
RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
