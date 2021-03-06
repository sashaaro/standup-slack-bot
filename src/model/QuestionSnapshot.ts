import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany} from "typeorm";
import QuestionOption from "./QuestionOption";
import Question from "./Question";
import StandUp from "./StandUp";

@Entity()
class QuestionSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  index: number;

  @Column()
  text: string;

  @OneToMany(type => QuestionOption, o => o.question, {
    eager: true,
    cascade: true
  })
  options: QuestionOption[];

  @ManyToOne(type => Question)
  originQuestion: Question;

  @ManyToOne(type => StandUp, q => q.questions)
  standUp: StandUp;

  @Column()
  createdAt: Date;
}

export default QuestionSnapshot;
