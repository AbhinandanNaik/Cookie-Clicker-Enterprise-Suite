# --- Build Stage ---
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom file first to leverage docker caching
COPY backend/pom.xml ./backend/
RUN mvn -f backend/pom.xml dependency:go-offline -B

# Copy src and build the backend JAR
COPY backend/src ./backend/src
RUN mvn -f backend/pom.xml clean package -DskipTests -B

# --- Run Stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Ensure data directory is writable by any user ID assigned by the host runtime
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy built jar from the build stage
COPY --from=build /app/backend/target/backend-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
