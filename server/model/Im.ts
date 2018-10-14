import {Entity, Column, PrimaryColumn, ManyToOne} from "typeorm";
import User from "./User";
//import {Im as SlackIm} from "../slack/model/rtm/RTMAuthenticatedResponse";

@Entity()
class Im
{
    @PrimaryColumn()
    id: string
    @Column()
    created: number
    @Column()
    is_im: boolean
    @Column()
    is_org_shared: boolean
    @ManyToOne(type => User, user => user.ims)
    user: User
    @Column()
    is_user_deleted: boolean
    @Column()
    priority: number
}

export default Im;