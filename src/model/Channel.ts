import {Column, Entity, ManyToMany, ManyToOne, PrimaryColumn} from "typeorm";
import User from "./User";
import SlackWorkspace from "./SlackWorkspace";

@Entity()
export class Channel {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column({default: false})
  isArchived: boolean;

  @Column({default: false})
  isEnabled: boolean;

  // TODO isPrivate: boolean;

  @Column()
  nameNormalized: string;

  @ManyToOne(type => User, null, {
    eager: true
  })
  createdBy: User

  @ManyToOne(type => SlackWorkspace, null, {
    eager: true,
    nullable: false
  })
  workspace: SlackWorkspace

  @ManyToMany(type => User, user => user.channels, {
    cascade: ["insert", "update"]
  })
  users: Array<User>
}
