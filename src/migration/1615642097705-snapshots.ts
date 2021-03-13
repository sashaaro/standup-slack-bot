import {MigrationInterface, QueryRunner} from "typeorm";
export class snapshots1615642097705 implements MigrationInterface {
    name = 'snapshots1615642097705'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_d4a613927ba1eb8e59632015cff"`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" DROP CONSTRAINT "FK_03f4c4962f4bb49af472fa73387"`, undefined);
        await queryRunner.query(`CREATE TABLE "team_snapshot" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL, "originTeamId" integer NOT NULL, CONSTRAINT "PK_f5089c370796880047326aee9e3" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "question_option_snapshot" ("id" SERIAL NOT NULL, "text" character varying NOT NULL, "questionId" integer NOT NULL, CONSTRAINT "PK_7c86eca58a38dbd55e8134475a3" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP COLUMN "standUpId"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP COLUMN "createdAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD "teamId" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_fc65efbcfebde907582a3518ecc"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ALTER COLUMN "originQuestionId" SET NOT NULL`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "question_snapshot"."originQuestionId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" ALTER COLUMN "teamId" SET NOT NULL`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "stand_up"."teamId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_fc65efbcfebde907582a3518ecc" FOREIGN KEY ("originQuestionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_98983d12cff530855434efc7615" FOREIGN KEY ("teamId") REFERENCES "team_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "team_snapshot" ADD CONSTRAINT "FK_0b34d2634ec725b769c04070871" FOREIGN KEY ("originTeamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" ADD CONSTRAINT "FK_03f4c4962f4bb49af472fa73387" FOREIGN KEY ("teamId") REFERENCES "team_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD CONSTRAINT "FK_64355dca5db001fbc45aa41326c" FOREIGN KEY ("questionId") REFERENCES "question_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP CONSTRAINT "FK_64355dca5db001fbc45aa41326c"`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" DROP CONSTRAINT "FK_03f4c4962f4bb49af472fa73387"`, undefined);
        await queryRunner.query(`ALTER TABLE "team_snapshot" DROP CONSTRAINT "FK_0b34d2634ec725b769c04070871"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_98983d12cff530855434efc7615"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_fc65efbcfebde907582a3518ecc"`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "stand_up"."teamId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" ALTER COLUMN "teamId" DROP NOT NULL`, undefined);
        await queryRunner.query(`COMMENT ON COLUMN "question_snapshot"."originQuestionId" IS NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ALTER COLUMN "originQuestionId" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_fc65efbcfebde907582a3518ecc" FOREIGN KEY ("originQuestionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP COLUMN "teamId"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD "createdAt" TIMESTAMP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD "standUpId" integer`, undefined);
        await queryRunner.query(`DROP TABLE "question_option_snapshot"`, undefined);
        await queryRunner.query(`DROP TABLE "team_snapshot"`, undefined);
        await queryRunner.query(`ALTER TABLE "stand_up" ADD CONSTRAINT "FK_03f4c4962f4bb49af472fa73387" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_d4a613927ba1eb8e59632015cff" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
