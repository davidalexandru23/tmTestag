FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies for prisma)
RUN npm ci

RUN apk add --no-cache openssl ca-certificates

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Clean up devDependencies to reduce image size
RUN npm prune --production

EXPOSE 4000

# Push schema to DB and start the server
CMD npx prisma db push && npm start
