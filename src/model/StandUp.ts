import {BeforeInsert, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import AnswerRequest from "./AnswerRequest";
import {Team} from "./Team";

@Entity()
export default class StandUp {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Team, {
    cascade: true
  })
  team: Team

  @Column()
  startAt: Date;

  @Column()
  endAt: Date;

  @OneToMany(type => AnswerRequest, answer => answer.standUp)
  answers: AnswerRequest[];

  @BeforeInsert()
  calculateEndAt() {
    this.endAt = new Date(this.startAt.getTime() + this.team.duration * 60 * 1000);
  }

  isFinished() {
    return this.endAt.getTime() < new Date().getTime()
  }
}
