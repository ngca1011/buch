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
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Film } from '../entity/film.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Schauspieler } from '../entity/schauspieler.entity.js';
import { type Suchkriterien } from './film-read.service.js';
import { Titel } from '../entity/titel.entity.js';
import { getLogger } from '../../logger/logger.js';
import { typeOrmModuleOptions } from '../../config/db.js';

/** Typdefinitionen für die Suche mit der Film-ID. */
export interface BuildIdParams {
    /** ID des gesuchten Films. */
    readonly id: number;
    /** Sollen die Schauspielers mitgeladen werden? */
    readonly mitSchauspielers?: boolean;
}
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Filme und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #filmAlias = `${Film.name
        .charAt(0)
        .toLowerCase()}${Film.name.slice(1)}`;

    readonly #titelAlias = `${Titel.name
        .charAt(0)
        .toLowerCase()}${Titel.name.slice(1)}`;

    readonly #schauspielerAlias = `${Schauspieler.name
        .charAt(0)
        .toLowerCase()}${Schauspieler.name.slice(1)}`;

    readonly #repo: Repository<Film>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Film) repo: Repository<Film>) {
        this.#repo = repo;
    }

    /**
     * Ein Film mit der ID suchen.
     * @param id ID des gesuchten Filmes
     * @returns QueryBuilder
     */
    buildId({ id, mitSchauspielers = false }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(this.#filmAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#filmAlias}.titel`,
            this.#titelAlias,
        );
        if (mitSchauspielers) {
            queryBuilder.leftJoinAndSelect(
                `${this.#filmAlias}.schauspielers`,
                this.#schauspielerAlias,
            );
        }
        queryBuilder.where(`${this.#filmAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Filme asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // z.B. { titel: 'a', rating: 5, action: true }
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function
    build({ titel, action, horror, romance, ...props }: Suchkriterien) {
        this.#logger.debug(
            'build: titel=%s, action=%s, horror=%s, romance=%s, props=%o',
            titel,
            action,
            horror,
            romance,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#filmAlias);
        queryBuilder.innerJoinAndSelect(`${this.#filmAlias}.titel`, 'titel');

        // z.B. { titel: 'a', rating: 5, action: true }
        // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
        // type-coverage:ignore-next-line
        // const { titel, action, horror, romance, ...props } = suchkriterien;

        let useWhere = true;

        // Titel in der Query: Teilstring des Titels und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (titel !== undefined && typeof titel === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#titelAlias}.titel ${ilike} :titel`,
                { titel: `%${titel}%` },
            );
            useWhere = false;
        }

        if (action === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(`${this.#filmAlias}.genre like '%ACTION%'`)
                : queryBuilder.andWhere(
                      `${this.#filmAlias}.genre like '%ACTION%'`,
                  );
            useWhere = false;
        }

        if (horror === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(`${this.#filmAlias}.genre like '%HORROR%'`)
                : queryBuilder.andWhere(
                      `${this.#filmAlias}.genre like '%HORROR%'`,
                  );
            useWhere = false;
        }

        if (romance === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#filmAlias}.genre like '%ROMANCE%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#filmAlias}.genre like '%ROMANCE%'`,
                  );
            useWhere = false;
        }
        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#filmAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#filmAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
