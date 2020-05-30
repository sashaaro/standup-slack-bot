import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, OneToMany} from "typeorm";
import {IQuestion} from "../bot/models";
import QuestionOption from "./QuestionOption";
import {Team} from "./Team";

@Entity()
class Question implements IQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  index: number;

  @Column()
  text: string;

  @Column({default: true})
  isEnabled: boolean = true;

  @OneToMany(type => QuestionOption, o => o.question, {
    cascade: true,
    eager: true
  })
  options: QuestionOption[];

  @Column()
  createdAt: Date;

  @ManyToOne(type => Team, {
    cascade: ["insert"]
  })
  team: Team;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default Question;
