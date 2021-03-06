import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn, BeforeUpdate} from "typeorm";
import Question from "./Question";
import {IsInt, IsNotEmpty, IsString} from "class-validator";
import {Exclude, Expose, Transform} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";

@Entity()
export default class QuestionOption {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Question, q => q.options, {
    cascade: ["insert"],
  })
  question: Question;

  @Exclude()
  @Column({default: true})
  isEnabled: boolean = true;

  @Expose()
  @Transform((params: TransformFnParams) => params.value?.trim()) // TODO not working?
  @IsNotEmpty()
  @IsString()
  @Column({nullable: false})
  text: string

  //@Expose()
  //@IsNotEmpty()
  //@IsInt()
  //@Column()
  // index: number;

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
