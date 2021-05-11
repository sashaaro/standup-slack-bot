import {Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import {Expose, Transform} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";
import QuestionSnapshot from "./question-snapshot";
import {IsInt, IsNotEmpty} from "class-validator";
import QuestionOption from "./question-option";

@Entity()
export default class QuestionOptionSnapshot {
  @Expose({groups: ["view_standups"]})
  @PrimaryKey()
  id: number;

  @Expose({groups: ["view_standups"]})
  @IsNotEmpty()
  @IsInt()
  @Property({nullable: false})
  index: number;

  @Expose({groups: ["view_standups"]})
  @Transform((params: TransformFnParams) => params.value?.trim()) // TODO not working?
  @Property({nullable: false})
  text: string

  @ManyToOne(type => QuestionSnapshot, {
    //cascade: ["insert"],
    nullable: false,
    onDelete: "CASCADE"
  })
  question: QuestionSnapshot;

  @ManyToOne(type => QuestionOption, {
    nullable: false,
    //eager: true
  })
  originOption: QuestionOption;
}
