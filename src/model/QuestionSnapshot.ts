import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany} from "typeorm";
import QuestionOption from "./QuestionOption";
import Question from "./Question";
import {TeamSnapshot} from "./TeamSnapshot";
import QuestionOptionSnapshot from "./QuestionOptionSnapshot";

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
  options: QuestionOptionSnapshot[]; // TODO Snapshot

  @ManyToOne(type => Question, {nullable: false})
  originQuestion: Question;

  @ManyToOne(type => TeamSnapshot, t => t.questions, {nullable: false})
  team: TeamSnapshot;
}

export default QuestionSnapshot;
