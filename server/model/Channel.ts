import {Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryColumn} from "typeorm";
import User from "./User";
import Team from "./Team";
import {ITeam} from "../StandUpBotService";

@Entity()
export class Channel implements ITeam {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column({default: false})
  isArchived: boolean;

  @Column({default: false})
  isEnabled: boolean;

  @Column()
  nameNormalized: string;

  @ManyToOne(type => User, null, {
    eager: true
  })
  createdBy: User

  @ManyToOne(type => Team, null, {
    eager: true
  })
  team: Team

  @ManyToMany(type => User, user => user.channels)
  users: Array<User>

  @Column({default: '3'})
  timezone: string
  @Column({default: '11:00'})
  start: string
  @Column({default: 30})
  duration: number
}
