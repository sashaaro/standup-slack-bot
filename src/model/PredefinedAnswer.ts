import {Entity, Column, ManyToOne, BeforeInsert, PrimaryGeneratedColumn, BeforeUpdate} from "typeorm";
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
  beforeInsert() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}

export default PredefinedAnswer;
