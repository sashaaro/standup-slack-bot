import {MigrationInterface, QueryRunner} from "typeorm";
export class userProfileJsonb1616106170808 implements MigrationInterface {
    name = 'userProfileJsonb1616106170808'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD "profile" jsonb NOT NULL DEFAULT '{}'`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profile"`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ADD "profile" json NOT NULL DEFAULT '{}'`, undefined);
    }
}
