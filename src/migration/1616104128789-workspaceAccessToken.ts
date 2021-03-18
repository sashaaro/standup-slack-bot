import {MigrationInterface, QueryRunner} from "typeorm";
export class workspaceAccessToken1616104128789 implements MigrationInterface {
    name = 'workspaceAccessToken1616104128789'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slack_workspace" ADD "accessToken" character varying not null`, undefined);
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slack_workspace" DROP COLUMN "accessToken"`, undefined);
    }
}
