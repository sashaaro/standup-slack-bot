import {MigrationInterface, QueryRunner} from "typeorm";
export class snapshots1615651241556 implements MigrationInterface {
    name = 'snapshots1615651241556'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option" ADD "index" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" ADD "index" integer NOT NULL`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "question_option_snapshot" DROP COLUMN "index"`, undefined);
        await queryRunner.query(`ALTER TABLE "question_option" DROP COLUMN "index"`, undefined);
    }
}
