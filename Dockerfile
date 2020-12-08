FROM centos:7

COPY ./WebCanvas /src

RUN curl -sL https://rpm.nodesource.com/setup_8.x | bash -
RUN yum install -y nodejs
RUN npm install socket.io@2.3.0
RUN npm install pug
RUN npm install pg

WORKDIR src/WebCanvas
CMD node app