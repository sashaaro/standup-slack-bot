import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property
} from "@mikro-orm/core";
import Question from "./question";
import {IsInt, IsNotEmpty, IsString} from "class-validator";
import {Exclude, Expose, Transform} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";

@Entity()
export default class QuestionOption {
  @Expose()
  @PrimaryKey()
  id: number;

  @ManyToOne(() => Question, {
    // cascade: ["insert"],
  })
  question: Question;

  @Exclude()
  @Property({default: true})
  isEnabled: boolean = true;

  @Expose()
  @Transform((params: TransformFnParams) => params.value?.trim()) // TODO not working?
  @IsNotEmpty()
  @IsString()
  @Property({nullable: false})
  text: string

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Property({nullable: false})
  index: number;

  @Property()
  updatedAt: Date;

  @Property()
  createdAt: Date;

  @BeforeCreate()
  beforeInsert() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
