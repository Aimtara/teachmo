FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install --production

# Copy all application code
COPY . .

# Expose the port configured in the environment or default
ENV PORT=4000
EXPOSE $PORT

CMD ["npm", "start"]