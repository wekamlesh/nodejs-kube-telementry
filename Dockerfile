# ----------------- STAGE 1: The "Builder" Stage -----------------
# We use a full Node image with all the build tools (npm, etc.)
# and we name it "builder" using "AS builder"
FROM node:18-alpine AS builder

# Set the working directory inside this temporary container
WORKDIR /usr/src/app

# Copy ONLY the package.json and package-lock.json
# This is a cache optimization. Docker will only re-run 'npm install'
# if these files change.
COPY package*.json ./

# Run the install command. This creates the 'node_modules' folder
# which is the ONLY thing we want from this stage.
RUN npm install

# At the end of this stage, this temporary container has our code,
# npm, and a fully populated node_modules folder.


# ----------------- STAGE 2: The "Final" Stage -----------------
# We start FROM SCRATCH with a fresh, clean base image.
# This image does NOT have any of the build tools or layers from the 'builder' stage.
FROM node:18-alpine

# Set the working directory in our final image
WORKDIR /usr/src/app

# Set up a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# The MAGIC command:
# Copy ONLY the 'node_modules' folder from the 'builder' stage
# into our new, clean image.
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Now copy our application source code
COPY app.js .

# Expose the port the app runs on
EXPOSE 3000

# The command to run when the container starts
CMD [ "node", "app.js" ]