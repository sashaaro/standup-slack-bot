import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn, BeforeUpdate} from "typeorm";
import Question from "./Question";
import {IQuestionOption} from "../bot/models";
import {IsNotEmpty, IsString} from "class-validator";
import {Expose} from "class-transformer";

@Entity()
export default class QuestionOption implements IQuestionOption {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Question, q => q.options, {
    cascade: ["insert"],
  })
  question: Question;

  @Expose()
  @IsNotEmpty()
  @IsString()
  @Column({nullable: false})
  text: string

  @Column()
  updatedAt: Date;

  @Column()
  createdAt: Date;

  @BeforeInsert()
  beforeInsert() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
