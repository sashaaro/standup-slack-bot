import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, BeforeInsert, OneToMany} from "typeorm";
import QuestionOption from "./QuestionOption";
import {Team} from "./Team";
import {ArrayMinSize, IsArray, IsInt, IsNotEmpty, MaxLength, MinLength} from "class-validator";
import {Exclude, Expose, Transform, Type} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";

@Entity()
class Question {
  @Expose()
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Column()
  index: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Column()
  text: string;

  @Exclude()
  @Column({default: true})
  isEnabled: boolean = true;

  // TODO ?! isOptional: boolean = false;

  @Expose()
  @Type(() => QuestionOption)
  @Transform((params: TransformFnParams) => params.value || [])
  @IsArray()
  //@ArrayMinSize(2)
  @OneToMany(type => QuestionOption, o => o.question, {
    eager: true,
    cascade: true
  })
  options: QuestionOption[];

  @Column()
  createdAt: Date;

  @ManyToOne(type => Team, {
    cascade: ["insert"],
    nullable: false
  })
  team: Team;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
    this.index = this.index !== undefined ? this.index : this.team?.questions?.indexOf(this);
  }
}

export default Question;
