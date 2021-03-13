import {Entity, Column, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Expose, Transform} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";
import QuestionSnapshot from "./QuestionSnapshot";

@Entity()
export default class QuestionOptionSnapshot {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => QuestionSnapshot, q => q.options, {
    cascade: ["insert"],
    nullable: false
  })
  question: QuestionSnapshot;

  @Expose()
  @Transform((params: TransformFnParams) => params.value?.trim()) // TODO not working?
  @Column({nullable: false})
  text: string
}
