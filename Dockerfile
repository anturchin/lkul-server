FROM node:10.15.1-jessie 

WORKDIR /opt

ENV NODE_ENV production

COPY "package*.json" "/opt/"
RUN npm install

COPY "." "/opt/src"
WORKDIR /opt/src
VOLUME /opt/src/public
EXPOSE 8888