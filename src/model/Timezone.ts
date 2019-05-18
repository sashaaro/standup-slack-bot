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

  get friendlyLabel() {
    return '(GMT ' + (this.utc_offset.hours || '00') + ':' + (Math.abs(this.utc_offset.minutes || 0)).toString().padStart(2, '0') + ') ' + this.label
  }
}

export default Timezone;
