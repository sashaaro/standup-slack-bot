import {Entity, Column, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Expose, Transform} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";
import QuestionSnapshot from "./QuestionSnapshot";
import {IsInt, IsNotEmpty} from "class-validator";

@Entity()
export default class QuestionOptionSnapshot {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Column({nullable: false})
  index: number;

  @Expose()
  @Transform((params: TransformFnParams) => params.value?.trim()) // TODO not working?
  @Column({nullable: false})
  text: string

  @ManyToOne(type => QuestionSnapshot, q => q.options, {
    cascade: ["insert"],
    nullable: false,
    onDelete: "CASCADE"
  })
  question: QuestionSnapshot;
}
