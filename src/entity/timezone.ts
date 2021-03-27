import {Expose} from "class-transformer";
import {BaseEntity, Entity, ManyToMany, ManyToOne, PrimaryKey, Property} from "@mikro-orm/core";


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
class Timezone {
  @Expose()
  @PrimaryKey()
  id: number;

  @Property({columnType: "interval"})
  utc_offset: any|IPostgresInterval;

  @Property()
  name: string;
}

export default Timezone;
