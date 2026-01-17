# Use Node 20
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies (workspaces handle backend and frontend automatically)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend and backend
RUN cd frontend && npm run build && cd ..
RUN cd backend && npm run build && cd ..

# Expose port
EXPOSE 3001

# Start backend (which serves frontend)
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
