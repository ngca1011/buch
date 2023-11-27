-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- https://dev.mysql.com/doc/refman/8.1/en/create-table.html
-- https://dev.mysql.com/doc/refman/8.1/en/data-types.html
-- https://dev.mysql.com/doc/refman/8.1/en/integer-types.html
-- BOOLEAN = TINYINT(1) mit TRUE, true, FALSE, false
-- https://dev.mysql.com/doc/refman/8.1/en/boolean-literals.html
-- https://dev.mysql.com/doc/refman/8.1/en/date-and-time-types.html
-- TIMESTAMP nur zwischen '1970-01-01 00:00:01' und '2038-01-19 03:14:07'
-- https://dev.mysql.com/doc/refman/8.1/en/date-and-time-types.html
-- https://dev.mysql.com/doc/refman/8.1/en/create-table-check-constraints.html
-- https://dev.mysql.com/blog-archive/mysql-8-0-16-introducing-check-constraint
-- UNIQUE: impliziter Index als B+ Baum

CREATE TABLE IF NOT EXISTS film (
    id            INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    version       INT NOT NULL DEFAULT 0,
    rating        INT NOT NULL CHECK (rating >= 0 AND rating <= 5),
    filmstart     DATE,
    dauer         INT CHECK (dauer >= 0),
    sprache       varchar(40) NOT NULL,
    direktor      varchar(40) NOT NULL,
    genres        VARCHAR(64),
    erzeugt       DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    aktualisiert  DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
) TABLESPACE filmspace ROW_FORMAT=COMPACT;
ALTER TABLE film AUTO_INCREMENT=1000;

CREATE TABLE IF NOT EXISTS titel (
    id          INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    titel       VARCHAR(40) NOT NULL,
    originaltitel  VARCHAR(40),
    serienname  VARCHAR(40),
    film_id     CHAR(36) UNIQUE NOT NULL references film(id)
) TABLESPACE filmspace ROW_FORMAT=COMPACT;
ALTER TABLE titel AUTO_INCREMENT=1000;

CREATE TABLE IF NOT EXISTS schauspieler (
    id              INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    vorname         VARCHAR(40) NOT NULL,
    nachname        VARCHAR(40) NOT NULL,
    geschlecht      VARCHAR(20),
    email           VARCHAR(40),
    telefonnummer   VARCHAR(40),
    film_id         CHAR(36) NOT NULL references film(id),

    INDEX schauspieler_film_id_idx(film_id)
) TABLESPACE filmspace ROW_FORMAT=COMPACT;
ALTER TABLE schauspieler AUTO_INCREMENT=1000;
