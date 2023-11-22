/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { type Film } from '../entity/film.entity.js';
import { FilmDTO } from '../rest/filmDTO.entity.js';
import { FilmWriteService } from '../service/film-write.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { JwtAuthGraphQlGuard } from '../../security/auth/jwt/jwt-auth-graphql.guard.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
import { RolesGraphQlGuard } from '../../security/auth/roles/roles-graphql.guard.js';
import { type Schauspieler } from '../entity/schauspieler.entity.js';
import { type Titel } from '../entity/titel.entity.js';
import { getLogger } from '../../logger/logger.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export interface CreatePayload {
    readonly id: number;
}
@Resolver()
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(JwtAuthGraphQlGuard, RolesGraphQlGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class FilmMutationResolver {
    readonly #service: FilmWriteService;

    readonly #logger = getLogger(FilmMutationResolver.name);

    constructor(service: FilmWriteService) {
        this.#service = service;
    }

    @Mutation()
    @RolesAllowed('admin', 'fachabteilung')
    async create(@Args('input') filmDTO: FilmDTO) {
        this.#logger.debug('create: filmDTO=%o', filmDTO);

        const film = this.#filmDtoToFilm(filmDTO);
        const id = await this.#service.create(film);
        this.#logger.debug('createFilm: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    #filmDtoToFilm(filmDTO: FilmDTO): Film {
        const titelDTO = filmDTO.titel;
        const titel: Titel = {
            id: undefined,
            titel: titelDTO.titel,
            originaltitel: titelDTO.originaltitel,
            serienname: titelDTO.serienname,
            film: undefined,
        };
        const schauspielers = filmDTO.schauspielers.map((schauspielerDTO) => {
            const schauspieler: Schauspieler = {
                id: undefined,
                vorname: schauspielerDTO.vorname,
                nachname: schauspielerDTO.nachname,
                geschlecht: schauspielerDTO.geschlecht,
                email: schauspielerDTO.email,
                telefonnummer: schauspielerDTO.telefonnummer,
                film: undefined,
            };
            return schauspieler;
        });
        const film: Film = {
            id: undefined,
            version: undefined,
            rating: filmDTO.rating,
            filmstart: filmDTO.filmstart,
            dauer: filmDTO.dauer,
            sprache: filmDTO.sprache,
            direktor: filmDTO.direktor,
            genres: filmDTO.genres,
            titel,
            schauspielers,
            erzeugt: undefined,
            aktualisiert: undefined,
        };

        // Rueckwaertsverweis
        film.titel.film = film;
        return film;
    }
}
