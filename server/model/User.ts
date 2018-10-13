import {Entity, Column, ManyToOne, PrimaryColumn, OneToMany} from "typeorm";
import Team from "./Team";
import Im from "./Im";
import {SlackUserProfile} from "../slack/model/SlackUser";
import Question from "./Question";

class Profile implements SlackUserProfile
{
    first_name: string;
    last_name: string;
    avatar_hash: string;
    real_name: string;
    display_name: string;
    real_name_normalized: string;
    display_name_normalized: string;
    email: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
    fields: null;
    team: string;

}

@Entity()
class User
{
    @PrimaryColumn()
    id: string;

    @Column({
        length: 500
    })
    name: string;

    @ManyToOne(type => Team, team => team.users, {
        eager: true
    })
    team: Team;

    @OneToMany(type => Im, im => im.user, {
        cascade: true,
        eager: true
    })
    ims: Im[];

    @Column('json', {default: new Profile()})
    profile: Profile;

    questions: Question[];

    constructor()
    {
        this.profile = new Profile()
    }
}


export default User;