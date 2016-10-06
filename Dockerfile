FROM node

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Setup the environment
ENV PATH /usr/src/app/bin:$PATH
EXPOSE 5000

# Bundle app source
COPY . /usr/src/app

CMD [ "npm", "start" ]
