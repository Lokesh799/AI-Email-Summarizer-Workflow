FROM node:20.16-alpine

WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

# Install once (workspace-aware)
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
