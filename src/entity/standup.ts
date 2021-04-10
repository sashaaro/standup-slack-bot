import {
  BeforeCreate,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property
} from "@mikro-orm/core";
import {TeamSnapshot} from "./team-snapshot";
import UserStandup from "./user-standup";
import {Exclude, Expose, Transform, Type} from "class-transformer";
import {StandupRepository} from "../repository/standupRepository";
import {User} from "./user";
import {transformCollection} from "../services/utils";

@Entity({
  customRepository: () => StandupRepository
})
export default class Standup {
  @Expose({groups: ["view_standups"]})
  @PrimaryKey()
  id: number;

  // todo rename teamSnapshot ?!
  @Expose({groups: ["view_standups"]})
  @Type(_ => TeamSnapshot)
  @ManyToOne(() => TeamSnapshot, {
    //cascade: ['insert'],
    nullable: false
  })
  team: TeamSnapshot

  @Expose({groups: ["view_standups"]})
  @Property()
  startAt: Date;

  @Expose({groups: ["view_standups"]})
  @Property()
  endAt: Date;

  @Expose({groups: ["view_standups"]})
  @Transform(transformCollection)
  @OneToMany(type => UserStandup, 'standup')
  users = new Collection<UserStandup, Standup>(this);

  @BeforeCreate()
  calculateEndAt() {
    this.endAt = new Date(this.startAt.getTime() + this.team.originTeam.duration * 60 * 1000);
  }

  isFinished() {
    return this.endAt.getTime() < new Date().getTime()
  }
}
