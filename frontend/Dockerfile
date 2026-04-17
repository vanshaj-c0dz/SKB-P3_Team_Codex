FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# npm ci gives deterministic installs when lockfile is present.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
