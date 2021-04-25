import {Expose, Transform, Type} from "class-transformer";
import {BaseEntity, Entity, ManyToMany, ManyToOne, PrimaryKey, Property} from "@mikro-orm/core";


class PostgresInterval {
  years?: number;
  months?: number;
  days?: number;
  @Expose({groups: ['edit', 'all']})
  hours?: number;
  @Expose({groups: ['edit']})
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

@Entity()
class Timezone {
  @Expose()
  @PrimaryKey()
  id: number;

  @Expose({groups: ['edit']})
  @Type(_ => PostgresInterval)
  @Property({columnType: "interval"})
  utc_offset: PostgresInterval|any;

  @Property()
  name: string; // valid pg timezone name
}

export default Timezone;
