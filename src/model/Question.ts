import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, OneToMany} from "typeorm";
import {IQuestion} from "../bot/models";
import QuestionOption from "./QuestionOption";
import {Team} from "./Team";
import {IsArray, IsNotEmpty, MaxLength, MinLength} from "class-validator";
import {Expose, Transform, Type} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";

@Entity()
class Question implements IQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  index: number;

  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Column()
  text: string;

  @Column({default: true})
  isEnabled: boolean = true;

  @Expose()
  @Type(() => QuestionOption)
  @Transform((params: TransformFnParams) => params.value || [])
  @IsArray()
  @OneToMany(type => QuestionOption, o => o.question, {
    cascade: ["insert", "update"],
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
    this.index = this.index !== undefined ? this.index : this.team?.questions?.indexOf(this);
  }
}

export default Question;
