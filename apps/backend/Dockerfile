# Use the official Bun image
FROM oven/bun:alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bun x prisma generate

# Copy the rest of the application source code
COPY . .

# Expose port
EXPOSE 3001

# Start backend server
CMD ["bun", "run", "index.ts"]
