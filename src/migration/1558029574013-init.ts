import {MigrationInterface, QueryRunner} from "typeorm";

export class init1558029574013 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "team" ("id" character varying NOT NULL, "name" character varying NOT NULL, "domain" character varying NOT NULL, "slackData" text, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "name" character varying(500) NOT NULL, "im" character varying(10), "profile" json NOT NULL DEFAULT '{}', "teamId" character varying, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "timezone" ("id" integer NOT NULL, "utc_offset" interval NOT NULL, "label" character varying NOT NULL, CONSTRAINT "PK_2706edc3223dd1d219f9f6a11b1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "channel" ("id" character varying NOT NULL, "name" character varying NOT NULL, "isArchived" boolean NOT NULL DEFAULT false, "isEnabled" boolean NOT NULL DEFAULT false, "nameNormalized" character varying NOT NULL, "start" character varying NOT NULL DEFAULT '11:00', "duration" integer NOT NULL DEFAULT 30, "createdById" character varying, "teamId" character varying, "timezoneId" integer, CONSTRAINT "PK_590f33ee6ee7d76437acf362e39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "question" ("id" SERIAL NOT NULL, "index" integer NOT NULL, "text" character varying NOT NULL, "isEnabled" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL, "channelId" character varying, CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stand_up" ("id" SERIAL NOT NULL, "start" TIMESTAMP NOT NULL, "end" TIMESTAMP NOT NULL, "channelId" character varying, CONSTRAINT "PK_00077ae773e68bfe42c0f5451a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "answer_request" ("id" SERIAL NOT NULL, "answerMessage" character varying, "createdAt" TIMESTAMP NOT NULL, "answerCreatedAt" TIMESTAMP, "userId" character varying, "standUpId" integer, "questionId" integer, CONSTRAINT "PK_e95abf2917a2e6a78ecd8ec39cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_channels_channel" ("userId" character varying NOT NULL, "channelId" character varying NOT NULL, CONSTRAINT "PK_01cb58c2f493472e335712d76c7" PRIMARY KEY ("userId", "channelId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9c701cabd952769d5c75844343" ON "user_channels_channel" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab9fe5d9528e30e09b462c345d" ON "user_channels_channel" ("channelId") `);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_1e89f1fd137dc7fea7242377e25" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_b2207f24c9461a9e053f2d2e090" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_1401e6454f1c5b030c5080d0842" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "channel" ADD CONSTRAINT "FK_aee33f32c6ba4979ac7b12a802c" FOREIGN KEY ("timezoneId") REFERENCES "timezone"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "question" ADD CONSTRAINT "FK_4ae050836fe0a9897502e851fe8" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stand_up" ADD CONSTRAINT "FK_3b8c544c4434f61481865002502" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd" FOREIGN KEY ("standUpId") REFERENCES "stand_up"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_request" ADD CONSTRAINT "FK_72c8029ce793661de4cbc5093a7" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_channels_channel" ADD CONSTRAINT "FK_9c701cabd952769d5c75844343c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_channels_channel" ADD CONSTRAINT "FK_ab9fe5d9528e30e09b462c345d2" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user_channels_channel" DROP CONSTRAINT "FK_ab9fe5d9528e30e09b462c345d2"`);
        await queryRunner.query(`ALTER TABLE "user_channels_channel" DROP CONSTRAINT "FK_9c701cabd952769d5c75844343c"`);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_72c8029ce793661de4cbc5093a7"`);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_7daa632484b0b8ae9cf2edaa7fd"`);
        await queryRunner.query(`ALTER TABLE "answer_request" DROP CONSTRAINT "FK_2d3ccf6de45f8f96399229009d2"`);
        await queryRunner.query(`ALTER TABLE "stand_up" DROP CONSTRAINT "FK_3b8c544c4434f61481865002502"`);
        await queryRunner.query(`ALTER TABLE "question" DROP CONSTRAINT "FK_4ae050836fe0a9897502e851fe8"`);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_aee33f32c6ba4979ac7b12a802c"`);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_1401e6454f1c5b030c5080d0842"`);
        await queryRunner.query(`ALTER TABLE "channel" DROP CONSTRAINT "FK_b2207f24c9461a9e053f2d2e090"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_1e89f1fd137dc7fea7242377e25"`);
        await queryRunner.query(`DROP INDEX "IDX_ab9fe5d9528e30e09b462c345d"`);
        await queryRunner.query(`DROP INDEX "IDX_9c701cabd952769d5c75844343"`);
        await queryRunner.query(`DROP TABLE "user_channels_channel"`);
        await queryRunner.query(`DROP TABLE "answer_request"`);
        await queryRunner.query(`DROP TABLE "stand_up"`);
        await queryRunner.query(`DROP TABLE "question"`);
        await queryRunner.query(`DROP TABLE "channel"`);
        await queryRunner.query(`DROP TABLE "timezone"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "team"`);
    }

}
