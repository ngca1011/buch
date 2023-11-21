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

/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilmDTO, FilmDtoOhneRef } from './filmDTO.entity.js';
import { Request, Response } from 'express';
import { type Schauspieler } from '../entity/schauspieler.entity.js';
import { type Film } from '../entity/film.entity.js';
import { FilmWriteService } from '../service/film-write.service.js';
import { JwtAuthGuard } from '../../security/auth/jwt/jwt-auth.guard.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
import { RolesGuard } from '../../security/auth/roles/roles.guard.js';
import { type Titel } from '../entity/titel.entity.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von Filmen.
 */
@Controller(paths.rest)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Film REST-API')
@ApiBearerAuth()
export class FilmWriteController {
    readonly #service: FilmWriteService;

    readonly #logger = getLogger(FilmWriteController.name);

    constructor(service: FilmWriteService) {
        this.#service = service;
    }

    /**
     * Ein neuer Film wird asynchron angelegt. Der neu anzulegende Film ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit der neu angelegte Film abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Titel bereits
     * existieren.
     *
     * @param film JSON-Daten für einen Film im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @RolesAllowed('admin', 'fachabteilung')
    @ApiOperation({ summary: 'Ein neuer Film anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Filmdaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() filmDTO: FilmDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: filmDTO=%o', filmDTO);

        const film = this.#filmDtoToFilm(filmDTO);
        const result = await this.#service.create(film);

        const location = `${getBaseUri(req)}/${result}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandener Film wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Filmes
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf der zu
     * aktualisierende Film als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Titel existieren.
     *
     * @param film Filmdaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @RolesAllowed('admin', 'fachabteilung')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Ein vorhandener Film aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Filmdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() filmDTO: FilmDtoOhneRef,
        @Param('id') id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, buchDTO=%o, version=%s',
            id,
            filmDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const film = this.#filmDtoOhneRefToFilm(filmDTO);
        const neueVersion = await this.#service.update({ id, film, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Film wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @RolesAllowed('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Film mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Der Film wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
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
        const schauspielers = filmDTO.schauspielers?.map((schauspielerDTO) => {
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
        const film = {
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

        // Rueckwaertsverweise
        film.titel.film = film;
        film.schauspielers?.forEach((schauspieler : Schauspieler) => {
            schauspieler.film = film;
        });
        return film;
    }

    #filmDtoOhneRefToFilm(filmDTO: FilmDtoOhneRef): Film {
        return {
            id: undefined,
            version: undefined,
            rating: filmDTO.rating,
            filmstart: filmDTO.filmstart,
            dauer: filmDTO.dauer,
            sprache: filmDTO.sprache,
            direktor: filmDTO.direktor,
            genres: filmDTO.genres,
            titel: undefined,
            schauspielers: undefined,
            erzeugt: undefined,
            aktualisiert: undefined,
        };
    }
}
