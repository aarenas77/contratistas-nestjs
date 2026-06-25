# Stack tecnologico

## Java 21

Java 21 se adopta como version base por ser una version LTS moderna. Permite usar records, mejoras de rendimiento y un lenguaje mas expresivo sin sacrificar estabilidad empresarial.

## Spring Boot 3.x

Spring Boot 3.x es el marco principal del backend. Provee autoconfiguracion, integracion con Spring Security, Spring Data JPA, validacion, pruebas y empaquetado ejecutable.

## Spring Data JPA

Spring Data JPA sera usado como abstraccion de persistencia relacional. Los repositorios se agregaran en fases posteriores dentro de los adaptadores de infraestructura de cada modulo.

## PostgreSQL

PostgreSQL es la base de datos relacional seleccionada por su robustez, soporte transaccional, tipos de datos maduros y adopcion amplia en sistemas institucionales.

## Flyway

Flyway gobernara la evolucion del esquema de base de datos mediante migraciones versionadas. En esta fase se deja configurado el directorio de migraciones, sin crear scripts SQL.

## Spring Security

Spring Security sera la base de autenticacion y autorizacion. En esta fase se configura el modo stateless y un encoder de contrasenas, dejando la implementacion especifica para fases posteriores.

## JWT

JWT sera el mecanismo para tokens de acceso. La configuracion base define propiedades como issuer, secreto y tiempos de expiracion. La emision y validacion se implementaran posteriormente.

## Lombok

Lombok se usara para reducir codigo repetitivo en clases de infraestructura y aplicacion cuando aporte claridad. En dominio se debe usar con moderacion para no ocultar reglas importantes.

## MapStruct

MapStruct se usara para mapeos entre modelos, entidades y DTOs cuando existan adaptadores REST o persistencia. Se deja una configuracion central para mantener consistencia.

## Docker

Docker permite empaquetar el backend de forma independiente dentro del monorepo. El compose local incluye PostgreSQL y el servicio backend.

## JUnit 5 y Mockito

JUnit 5 y Mockito seran usados para pruebas unitarias e integracion en fases posteriores. En esta fase se agregan dependencias, pero no se crean pruebas.

