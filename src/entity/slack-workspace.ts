import {Collection, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property} from "@mikro-orm/core";
import {User} from "./user";
import {SlackTeam} from "../slack/model/SlackTeam";
import {Expose} from "class-transformer";
import {Team} from "./team";

@Entity()
class SlackWorkspace {
  @PrimaryKey()
  id: string;

  @Property() // TODO delete
  name: string;

  // TODO nullable: false?! TODO delete?!
  @Property()
  domain: string;

  @OneToMany(() => User, user => user.workspace)
  users = new Collection<User>(this);

  //@OneToMany(type => Team, team => team.workspace)
  //team: Team[]

  //@OneToMany(type => Channel, ch => ch.workspace)
  //channels: Channel[]

  @Property({type: "jsonb", nullable: true}) // TODO nullable false
  slackData: SlackTeam

  // https://api.slack.com/authentication/token-types#granular_bot
  @Property({nullable: false})
  accessToken: string;
}

export default SlackWorkspace;
