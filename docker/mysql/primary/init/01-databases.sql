-- Create database(s).
CREATE DATABASE IF NOT EXISTS `klayr`;

-- Grant rights to `klayr` user.
GRANT ALL PRIVILEGES ON *.* TO 'klayr'@'%';

-- Create user for replica and grant replication privilege.
CREATE USER 'replica'@'%' IDENTIFIED WITH caching_sha2_password BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';
FLUSH PRIVILEGES;
