# syntax=docker/dockerfile:1

FROM node:18-alpine AS build
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm install

WORKDIR /app/chd-qbank
COPY chd-qbank/package*.json ./
RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/chd-qbank
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /usr/src/app

COPY --from=build /app/chd-qbank/dist ./dist
RUN npm install -g serve

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
