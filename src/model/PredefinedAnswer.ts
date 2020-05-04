import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn} from "typeorm";
import Question from "./Question";

@Entity()
class PredefinedAnswer {
  @PrimaryGeneratedColumn()
  id: string

  @ManyToOne(type => Question)
  question: Question

  @Column({nullable: false})
  text: string

  @Column()
  updatedAt: Date;

  @Column()
  createdAt: Date;

  @BeforeInsert()
  setupCreatedAt() {
    this.createdAt = new Date();
  }
}

export default PredefinedAnswer;
