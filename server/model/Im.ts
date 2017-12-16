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
    has_pins: boolean
    @Column()
    last_read: string
    @Column()
    is_open: boolean
}

export default Im;