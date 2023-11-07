/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Klasse {@linkcode FilmReadService}.
 * @packageDocumentation
 */

import { Film } from './../entity/film.entity.js';
// eslint-disable-next-line sort-imports
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder } from './query-builder.js';
import RE2 from 're2'; // eslint-disable-line @typescript-eslint/naming-convention
import { getLogger } from '../../logger/logger.js';

/**
 * Typdefinition für `findById`
 */
export interface FindByIdParams {
    /** ID des gesuchten Films */
    readonly id: number;
    /** Sollen die Schauspielers mitgeladen werden? */
    readonly mitSchauspielers?: boolean;
}
export interface Suchkriterien {
    readonly rating?: number;
    readonly filmstart?: string;
    readonly dauer?: string;
    readonly sprache?: string;
    readonly direktor?: string;
    readonly action?: string;
    readonly horror?: string;
    readonly romance?: string;
    readonly titel?: string;
}

/**
 * Die Klasse `FilmReadService` implementiert das Lesen für Filme und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class FilmReadService {
    static readonly ID_PATTERN = new RE2('^[1-9][\\d]*$');

    readonly #filmProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(FilmReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const filmDummy = new Film();
        this.#filmProps = Object.getOwnPropertyNames(filmDummy);
        this.#queryBuilder = queryBuilder;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Film asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Filmes
     * @returns Das gefundene Film vom Typ [Film](film_entity_film_entity.Film.html)
     *          in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Film mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id, mitSchauspielers = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const film = await this.#queryBuilder
            .buildId({ id, mitSchauspielers })
            .getOne();
        if (film === null) {
            throw new NotFoundException(`Es gibt kein Film mit der ID ${id}.`);
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: film=%s, titel=%o',
                film.toString(),
                film.titel,
            );
            if (mitSchauspielers) {
                this.#logger.debug(
                    'findById: schauspielers=%o',
                    film.schauspielers,
                );
            }
        }
        return film;
    }

    /**
     * Filme asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Filmen.
     * @throws NotFoundException falls keine Filme gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }
        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const filme = await this.#queryBuilder.build(suchkriterien).getMany();
        this.#logger.debug('find: filme=%o', filme);
        if (filme.length === 0) {
            throw new NotFoundException(
                `Keine Filme gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }

        return filme;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Film oder "genre"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#filmProps.includes(key) &&
                key !== 'action' &&
                key !== 'horror' &&
                key !== 'romance'
            ) {
                this.#logger.debug(
                    '#find: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
