import {Entity, Column, ManyToOne, PrimaryColumn} from "typeorm";
import Team from "./Team";

@Entity()
class User
{
    @PrimaryColumn()
    id: string;

    @Column({
        length: 500
    })
    name: string;

    @ManyToOne(type => Team, team => team.users)
    team: Team;
}

export default User;