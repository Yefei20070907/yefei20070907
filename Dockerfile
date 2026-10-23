FROM tomcat:9.0-jdk11-corretto-al2
COPY lab1.war /usr/local/tomcat/webapps/ROOT.war
EXPOSE 8080
