import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {ITimezone} from "../bot/models";
import {Expose} from "class-transformer";

export interface IPostgresInterval {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;

  toPostgres(): string;

  toISO(): string;
  toISOString(): string;
}

@Entity()
class Timezone implements ITimezone{
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Column("interval")
  utc_offset: any|IPostgresInterval;

  @Column()
  name: string;
}

export default Timezone;
