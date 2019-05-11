import {Column, Entity, PrimaryColumn} from "typeorm";
import {ITimezone} from "../bot/models";

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
  @PrimaryColumn()
  id: number;

  @Column("interval")
  utc_offset: any|IPostgresInterval;

  @Column()
  label: string;
}

export default Timezone;
