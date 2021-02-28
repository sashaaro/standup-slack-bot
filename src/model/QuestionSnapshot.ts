import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, OneToMany} from "typeorm";
import QuestionOption from "./QuestionOption";
import {Team} from "./Team";
import {IsArray, IsInt, IsNotEmpty, MaxLength, MinLength} from "class-validator";
import {Expose, Transform, Type} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";
import StandUp from "./StandUp";

@Entity()
class QuestionSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @Column()
  index: number;

  @Expose()
  @Column()
  text: string;

  @Expose()
  // @Type(() => QuestionOptionSnapshot)
  @Transform((params: TransformFnParams) => params.value || [])
  @IsArray()
  //@ArrayMinSize(2)
  @OneToMany(type => QuestionOption, o => o.question, {
    eager: true,
    cascade: true
  })
  options: QuestionOption[];

  @ManyToOne(type => Team, {
    cascade: ["insert"],
    nullable: false
  })
  standup: StandUp;
}

export default QuestionSnapshot;
