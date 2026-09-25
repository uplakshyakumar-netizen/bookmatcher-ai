# Use a lightweight Node.js environment
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files FIRST to install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Now copy all the rest of your app's code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port Render uses
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
