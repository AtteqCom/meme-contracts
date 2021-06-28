FROM node:10.16.0

RUN mkdir -p /marblegame/build

WORKDIR /marblegame
COPY ./package.json /marblegame
RUN npm install

COPY ./src /marblegame
