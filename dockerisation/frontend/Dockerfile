# Use an official lightweight Node image
FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY ../client/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY ../client ./

# Expose port
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
