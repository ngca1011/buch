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
 * Das Modul besteht aus der Klasse {@linkcode FilmWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Film } from '../entity/film.entity.js';
import { FilmReadService } from './film-read.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mail/mail.service.js';
import { Repository } from 'typeorm';
import { TitelExistsException } from './exceptions.js';
import { getLogger } from '../../logger/logger.js';

/**
 * Die Klasse `FilmWriteService` implementiert den Anwendungskern für das
 * Schreiben von Filmen und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class FilmWriteService {
    readonly #repo: Repository<Film>;

    readonly #readService: FilmReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(FilmWriteService.name);

    constructor(
        @InjectRepository(Film) repo: Repository<Film>,
        readService: FilmReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Film soll angelegt werden.
     * @param film Das neu abzulegende Film
     * @returns Die ID des neu angelegten Filmes
     * @throws TitelExists falls der Titel bereits existiert
     */
    async create(film: Film): Promise<number> {
        this.#logger.debug('create: film=%o', film);
        await this.#validateCreate(film);

        const filmDb = await this.#repo.save(film); // implizite Transaktion
        this.#logger.debug('create: filmDb=%o', filmDb);

        await this.#sendmail(filmDb);

        return filmDb.id!;
    }

    async #validateCreate(film: Film): Promise<undefined> {
        this.#logger.debug('#validateCreate: film=%o', film);

        const { titel } = film;
        try {
            await this.#readService.find({ titel: titel.titel });
        } catch (err) {
            if (err instanceof NotFoundException) {
                return;
            }
        }
        throw new TitelExistsException(titel);
    }

    async #sendmail(film: Film) {
        const subject = `Neuer Film ${film.id}`;
        const { titel } = film.titel;
        const body = `Das Film mit dem Titel <strong>${titel}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }
}
