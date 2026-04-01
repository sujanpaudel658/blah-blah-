# Use a stable Node.js LTS version
FROM node:20-slim

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the frontend development server
CMD ["npm", "start"]
