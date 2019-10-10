FROM node:10

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./ .

EXPOSE 8080

ENV NODE_ENV=production
ENV SQL_HOST=db
ENV SQL_USER=root
ENV SQL_PASSWORD=root
ENV SQL_DATABASE=clubhouse
ENV SQL_PORT=3306

CMD ["node","server.js"]
