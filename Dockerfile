FROM node:20.16-alpine

WORKDIR /app

# Copy root manifests
COPY package*.json ./

# Copy workspace manifests
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

# 🔑 Copy backend scripts needed for postinstall
COPY backend/scripts backend/scripts

# Install dependencies (postinstall will now succeed)
RUN npm install --legacy-peer-deps

# Copy remaining source code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
