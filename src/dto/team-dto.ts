import {Expose, Transform, TransformFnParams, Type} from "class-transformer";
import {ArrayMinSize, IsArray, IsNotEmpty, MaxLength, Min, MinLength, ValidateNested} from "class-validator";
import {em} from "../services/providers";
import {User} from "../entity";

export class QuestionOptionDTO {
  @Expose()
  id: number;
  @Expose()
  text: string;
  @Expose()
  index: number;
}

export class QuestionDTO {
  @Expose()
  id: number;
  @Expose()
  index: number;
  @Expose()
  text: string;
  @Expose()
  @Type(_ => QuestionOptionDTO)
  options: QuestionOptionDTO[];
}

export class TeamDTO {
  @Expose()
  id: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(16)
  name: string;

  @Expose()
  // TODO @Min(1)
  @IsNotEmpty()
  userIds = []

  @Expose()
  duration: number

  @Expose()
  start: string

  @Expose() // TODO validate
  @IsArray()
  @ArrayMinSize(1)
  days: number[];

  @Expose()
  @Type(_ => QuestionDTO)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  questions: QuestionDTO[];

  @Expose()
  timezoneId: number

  @Expose()
  @IsNotEmpty()
  reportChannelId: string
}