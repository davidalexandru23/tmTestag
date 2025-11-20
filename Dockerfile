FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

RUN apk add --no-cache openssl ca-certificates

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
