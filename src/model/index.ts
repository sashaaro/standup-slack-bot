import Question from "./Question";
import SlackWorkspace from "./SlackWorkspace";
import User from "./User";
import AnswerRequest from "./AnswerRequest";
import StandUp from "./StandUp";
import {Channel} from "./Channel";
import Timezone from "./Timezone";
import QuestionOption from "./QuestionOption";
import {Team} from "./Team";
import QuestionSnapshot from "./QuestionSnapshot";
import {TeamSnapshot} from "./TeamSnapshot";
import QuestionOptionSnapshot from "./QuestionOptionSnapshot";
import UserStandup from "./UserStandup";

export default [
  Timezone,

  SlackWorkspace,
  User,
  Channel,

  Team,
  Question,
  QuestionOption,

  StandUp,
  TeamSnapshot,
  QuestionSnapshot,
  QuestionOptionSnapshot,

  UserStandup,
  AnswerRequest,
]
