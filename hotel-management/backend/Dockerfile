# Use a stable Node.js LTS version
FROM node:20-slim AS base

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application with hot reloading
CMD ["npm", "run", "dev"]
