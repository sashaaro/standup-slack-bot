import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import AnswerRequest from "./AnswerRequest";
import {IStandUp} from "../bot/models";
import {Team} from "./Team";

@Entity()
export default class StandUp implements IStandUp {
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

  isFinished() {
    return this.endAt && this.endAt.getTime() < new Date().getTime()
  }
}
