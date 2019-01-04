import {Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn} from "typeorm";
import User from "./User";
import Team from "./Team";

@Entity()
export class Channel {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column()
  nameNormalized: string

  @ManyToOne(type => User, null, {
    eager: true
  })
  createdBy: User

  @ManyToOne(type => Team, null, {
    eager: true
  })
  team: Team

  @ManyToMany(type => User, null, {cascade: true})
  @JoinTable()
  users: Array<User>
}
