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

import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type GraphQLRequest } from '@apollo/server';
import { type GraphQLResponseBody } from './film-query.resolver.test.js';
import { HttpStatus } from '@nestjs/common';
import { loginGraphQL } from '../login.js';

// eslint-disable-next-line jest/no-export
export type GraphQLQuery = Pick<GraphQLRequest, 'query'>;

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Mutations', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Neues Film', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            rating: 1,
                            filmstart: "2022-01-31",
                            dauer: 180,
                            sprache: "Englisch",
                            direktor: "Tom Alder",
                            genres: ["ROMANCE", "HORROR"],
                            titel: {
                                titel: "The Ring 3",
                                originaltitel: "Der Ring",
                                serienname: "The Ring",
                            },
                            schauspielers: [
                                {
                                    vorname: "Rose",
                                    nachname: "Millian",
                                    geschlecht: "weiblich",
                                    email: "rose21312@gmail.com",
                                    telefonnummer: "01382381231",
                                },
                                {
                                    vorname: "Bob",
                                    nachname: "Millian",
                                    geschlecht: "männlich",
                                    email: "bobhollywood@gmail.com",
                                    telefonnummer: "0123129321",
                                }
                            ]
                        }
                    ) {
                        id
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();
        expect(create.id).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Film mit ungueltigen Werten neu anlegen', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            rating: -123,
                            filmstart: "wqewqdsa",
                            dauer: -123,
                            sprache: "Englisch",
                            direktor: "Tom Alder",
                            titel: {
                                titel: "!!!!!",
                                originaltitel: "12312312",
                                serienname: "123213123",
                            },
                            schauspielers: [
                                {
                                    vorname: "Rose",
                                    nachname: "Meata",
                                    geschlecht: "weiblich",
                                    email: "sadasas@gmail.com",
                                    telefonnummer: "01382381222",
                                }
                            ]
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^rating /u),
            expect.stringMatching(/^filmstart /u),
            expect.stringMatching(/^dauer /u),
            expect.stringMatching(/^titel.titel /u),
        ];

        // when
        const response: AxiosResponse<GraphQLResponseBody> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.create).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });
});
