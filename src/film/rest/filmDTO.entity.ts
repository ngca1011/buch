/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */
/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Florian Goebel, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import {
    ArrayUnique,
    IsArray,
    IsISO8601,
    IsInt,
    IsOptional,
    IsPositive,
    Max,
    Min,
    ValidateNested,
    MaxLength,
} from 'class-validator';
import { SchauspielerDTO } from './schauspielerDTO.entity.js';
import { ApiProperty } from '@nestjs/swagger';
import { TitelDTO } from './titelDTO.entity.js';
import { Type } from 'class-transformer';

export const MAX_RATING = 5;

/**
 * Entity-Klasse für Filmen ohne TypeORM und ohne Referenzen.
 */
export class FilmDtoOhneRef {
    // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html

    @IsInt()
    @Min(0)
    @Max(MAX_RATING)
    @ApiProperty({ example: 5, type: Number })
    readonly rating: number | undefined;

    @IsISO8601({ strict: true })
    @IsOptional()
    @ApiProperty({ example: '2021-01-31' })
    readonly filmstart: Date | string | undefined;

    @IsPositive()
    @ApiProperty({ example: 180, type: Number })
    // statt number ggf. Decimal aus decimal.js analog zu BigDecimal von Java
    readonly dauer!: number | undefined;

    @MaxLength(40)
    @IsOptional()
    @ApiProperty({ example: 'Englisch', type: String })
    readonly sprache: string | undefined;

    @MaxLength(40)
    @IsOptional()
    @ApiProperty({ example: 'James Cameron', type: String })
    readonly direktor: string | undefined;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: 'Horror', type: String })
    readonly genres: string[] | undefined;

}

/**
 * Entity-Klasse für Filmen ohne TypeORM.
 */
export class FilmDTO extends FilmDtoOhneRef {
    @ValidateNested()
    @Type(() => TitelDTO)
    @ApiProperty({ type: TitelDTO })
    readonly titel!: TitelDTO; //NOSONAR

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() : typeof SchauspielerDTO => SchauspielerDTO)
    @ApiProperty({ type: [SchauspielerDTO] })
    readonly schauspielers: SchauspielerDTO[] | undefined;

    // SchauspielerDTO
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
