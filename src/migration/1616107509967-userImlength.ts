import {MigrationInterface, QueryRunner} from "typeorm";
export class userImlength1616107509967 implements MigrationInterface {
    name = 'userImlength1616107509967'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "im"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD "im" character varying(20)`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "im"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD "im" character varying(10)`, undefined);
    }
}
