import {Expose, Type} from "class-transformer";
import {ArrayMinSize, IsArray, IsNotEmpty, Max, MaxLength, Min, MinLength, ValidateNested} from "class-validator";
import {weekDayBits} from "../entity/team";

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
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  userIds = []

  @Expose()
  duration: number

  @Expose()
  start: string

  @Min(1)
  @Max(2 ** 7 - 1)
  @Expose()
  scheduleBitmask: number;

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