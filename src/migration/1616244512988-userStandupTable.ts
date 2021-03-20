import {MigrationInterface, QueryRunner} from "typeorm";
export class userStandupTable1616244512988 implements MigrationInterface {
    name = 'userStandupTable1616244512988'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd"`, undefined);
        await queryRunner.query(`CREATE TABLE "user_standup" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL, "slackMessage" jsonb NOT NULL, "userId" character varying, "standUpId" integer, CONSTRAINT "PK_7ddb953a04bc395a041470ce0ed" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP COLUMN "userId"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP COLUMN "standUpId"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD "userStandUpId" integer`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "team"."days" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "days" SET DEFAULT '{0,1,2,3,4}'::integer[]`, undefined);
        await queryRunner.query(`ALTER TABLE "user_standup" ADD CONSTRAINT "FK_3bd29a8ad38a0d86c297d0b6ce1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "user_standup" ADD CONSTRAINT "FK_71e37248d487009c154aa29c693" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_f821fefd4198919b7193f0ec01b" FOREIGN KEY ("userStandUpId") REFERENCES "user_standup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_f821fefd4198919b7193f0ec01b"`, undefined);
        await queryRunner.query(`ALTER TABLE "user_standup" DROP CONSTRAINT "FK_71e37248d487009c154aa29c693"`, undefined);
        await queryRunner.query(`ALTER TABLE "user_standup" DROP CONSTRAINT "FK_3bd29a8ad38a0d86c297d0b6ce1"`, undefined);
        await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "days" SET DEFAULT '{0,1,2,3,4}'`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "team"."days" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP COLUMN "userStandUpId"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD "standUpId" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD "userId" character varying`, undefined);
        await queryRunner.query(`DROP TABLE "user_standup"`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
