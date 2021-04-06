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
import {Exclude} from "class-transformer";
import {StandupRepository} from "../repository/standupRepository";

@Entity({
  customRepository: () => StandupRepository
})
export default class Standup {
  @PrimaryKey()
  id: number;

  // todo rename teamSnapshot ?!
  @ManyToOne(() => TeamSnapshot, {
    //cascade: ['insert'],
    nullable: false
  })
  team: TeamSnapshot

  @Property()
  startAt: Date;

  @Property()
  endAt: Date;

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
