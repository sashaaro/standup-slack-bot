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

  @OneToMany(type => QuestionOptionSnapshot, o => o.question, {
    eager: true,
    cascade: ["insert"],
  })
  options: QuestionOptionSnapshot[];

  @ManyToOne(type => Question, {nullable: false, eager: true})
  originQuestion: Question;

  @ManyToOne(type => TeamSnapshot, t => t.questions, {
    nullable: false,
    onDelete: "CASCADE"
  })
  team: TeamSnapshot;
}

export default QuestionSnapshot;
