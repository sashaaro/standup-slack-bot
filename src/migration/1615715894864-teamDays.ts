import {MigrationInterface, QueryRunner} from "typeorm";
export class teamDays1615715894864 implements MigrationInterface {
    name = 'teamDays1615715894864'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team" ADD "days" integer array NOT NULL DEFAULT '{0,1,2,3,4}'::integer[]`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team" DROP COLUMN "days"`, undefined);
    }
}
