FROM node:18 as builder

WORKDIR /build

COPY package.json .
COPY package-lock.json .
COPY package-lock.json .
RUN npm install

COPY src/ src/


FROM node:18 as runner
WORKDIR /app

COPY --from=builder build/package*.json .
COPY --from=builder build/node_modules node_modules
# COPY --from=builder build/dist /dist

CMD [ "npm", "start" ]
