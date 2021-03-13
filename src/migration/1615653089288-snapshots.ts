import {MigrationInterface, QueryRunner} from "typeorm";
export class snapshots1615653089288 implements MigrationInterface {
    name = 'snapshots1615653089288'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP CONSTRAINT "FK_64355dca5db001fbc45aa41326c"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_98983d12cff530855434efc7615"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD CONSTRAINT "FK_64355dca5db001fbc45aa41326c" FOREIGN KEY ("questionId") REFERENCES "question_snapshot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_98983d12cff530855434efc7615" FOREIGN KEY ("teamId") REFERENCES "team_snapshot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_snapshot" DROP CONSTRAINT "FK_98983d12cff530855434efc7615"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP CONSTRAINT "FK_64355dca5db001fbc45aa41326c"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_snapshot" ADD CONSTRAINT "FK_98983d12cff530855434efc7615" FOREIGN KEY ("teamId") REFERENCES "team_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD CONSTRAINT "FK_64355dca5db001fbc45aa41326c" FOREIGN KEY ("questionId") REFERENCES "question_snapshot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }
}
