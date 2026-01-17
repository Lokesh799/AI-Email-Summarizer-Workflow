# Use Node 20 (required by pdf-parse)
FROM node:20.16-alpine

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

# Install all workspace deps
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

# Expose backend port
EXPOSE 3001

# Start backend
CMD ["node", "dist/index.js"]
