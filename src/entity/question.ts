import {BeforeCreate, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import QuestionOption from "./question-option";
import {Team} from "./team";
import {ArrayMinSize, IsArray, IsInt, IsNotEmpty, MaxLength, MinLength} from "class-validator";
import {Exclude, Expose, Transform, Type} from "class-transformer";
import {TransformFnParams} from "class-transformer/types/interfaces";

@Entity()
class Question {
  @Expose()
  @PrimaryKey()
  id: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  @Property()
  index: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Property()
  text: string;

  @Exclude()
  @Property({default: true})
  isEnabled: boolean = true;

  // TODO ?! isOptional: boolean = false;

  @Expose()
  @Type(() => QuestionOption)
  @Transform((params: TransformFnParams) => params.value || [])
  @IsArray()
  //@ArrayMinSize(2)
  @OneToMany(() => QuestionOption, o => o.question, {
    //eager: true,
    //cascade: true
  })
  options: QuestionOption[];

  @Property()
  createdAt: Date;

  @ManyToOne(() => Team, {
    //cascade: ["insert"],
    nullable: false,
  })
  team: Team;

  @BeforeCreate()
  setupCreatedAt() {
    this.createdAt = new Date();
    this.index = this.index !== undefined ? this.index : this.team?.questions?.toArray().indexOf(this);
  }
}

export default Question;
