import {BeforeInsert, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import AnswerRequest from "./AnswerRequest";
import {TeamSnapshot} from "./TeamSnapshot";

@Entity()
export default class StandUp {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => TeamSnapshot, {
    cascade: ['insert'],
    nullable: false
  })
  team: TeamSnapshot

  @Column()
  startAt: Date;

  @Column()
  endAt: Date;

  @OneToMany(type => AnswerRequest, answer => answer.standUp)
  answers: AnswerRequest[];

  @BeforeInsert()
  calculateEndAt() {
    this.endAt = new Date(this.startAt.getTime() + this.team.originTeam.duration * 60 * 1000);
  }

  isFinished() {
    return this.endAt.getTime() < new Date().getTime()
  }
}
