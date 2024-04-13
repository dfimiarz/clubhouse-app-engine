FROM node:21-alpine

USER node

WORKDIR /home/node/app

COPY --chown=node . .

RUN yarn install --production && yarn cache clean

CMD ["yarn", "start"]

EXPOSE 8080
