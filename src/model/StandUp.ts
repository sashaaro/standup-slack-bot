import {BeforeInsert, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {TeamSnapshot} from "./TeamSnapshot";
import UserStandup from "./UserStandup";

@Entity()
export default class StandUp {
  @PrimaryGeneratedColumn()
  id: number;

  // todo rename teamSnapshot ?!
  @ManyToOne(type => TeamSnapshot, {
    cascade: ['insert'],
    nullable: false
  })
  team: TeamSnapshot

  @Column()
  startAt: Date;

  @Column()
  endAt: Date;

  @OneToMany(type => UserStandup, us => us.standUp)
  users: UserStandup[];

  @BeforeInsert()
  calculateEndAt() {
    this.endAt = new Date(this.startAt.getTime() + this.team.originTeam.duration * 60 * 1000);
  }

  isFinished() {
    return this.endAt.getTime() < new Date().getTime()
  }
}
