# Use an official lightweight Node image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the React dev server port
EXPOSE 5173

# Default command
CMD ["npm", "run", "dev", "--", "--host"]
