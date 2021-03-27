import {Expose, Transform, TransformFnParams} from "class-transformer";
import {ArrayMinSize, IsArray, IsNotEmpty, MaxLength, MinLength, ValidateNested} from "class-validator";
import {em} from "../services/providers";
import {User} from "../entity";

export class QuestionOptionDTO {
  id: number;
  text: string
  index: number;
}

export class QuestionDTO {
  id: number;
  index: number;
  text: string;
  options: QuestionOptionDTO[];
}

export class TeamDTO {
  id: number;

  @Expose()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(16)
  name: string;

  workspaceId: number

  @Expose()
  @Transform((params: TransformFnParams) => params.value.map(v => em().getReference(User, params.value.id)))
  // @Min(1)
  @IsNotEmpty()
  userIds = []

  duration: number

  start: string

  days: number[] = [0, 1, 2, 3, 4];

  @Expose()
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested()
  questions: QuestionDTO[];

  timezoneId: number

  @Expose()
  @IsNotEmpty()
  reportChannelId: string
}