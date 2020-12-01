FROM centos:7


RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
# Install Node.js 
RUN yum install -y nodejs
RUN npm install socket.io@2.3.0
RUN npm install pug
#RUN npm install @simonwep/pickr

#COPY ./WebCanvas /src
#WORKDIR src/
#CMD node app.js
