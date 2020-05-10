import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
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
  @PrimaryGeneratedColumn()
  id: number;

  @Column("interval")
  utc_offset: any|IPostgresInterval;

  @Column()
  name: string;

  get friendlyLabel() {
    return '(GMT ' + (this.utc_offset.hours || '00') + ':' + (Math.abs(this.utc_offset.minutes || 0)).toString().padStart(2, '0') + ') ' + this.name
  }
}

export default Timezone;
