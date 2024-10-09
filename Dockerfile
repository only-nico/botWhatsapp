# Use the official Node.js image as the base image for building the application
FROM node:21-alpine3.18 as builder

# Enable Corepack and prepare for PNPM installation
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install build dependencies for Sharp
RUN apk add --no-cache vips vips-dev build-base gcc g++ make

# Copy package.json and pnpm-lock.yaml files to the working directory
COPY package*.json pnpm-lock.yaml ./ 

# Install git for potential dependencies
RUN apk add --no-cache git

# Install PM2 globally using PNPM
RUN pnpm install pm2 -g

# Copy the application source code into the container
COPY . . 

# Install dependencies using PNPM
RUN pnpm install

# Create a new stage for deployment
FROM builder as deploy

# Set the working directory inside the deployment stage
WORKDIR /usr/src/app

# Copy necessary files for deployment
COPY --from=builder /usr/src/app/app.js ./app.js
COPY --from=builder /usr/src/app/package.json /usr/src/app/pnpm-lock.yaml ./

# Install production dependencies using frozen lock file
RUN pnpm install --frozen-lockfile --production

# Define the command to start the application using PM2 runtime
CMD ["pm2-runtime", "start", "app.js", "--cron", "0 */12 * * *"]
