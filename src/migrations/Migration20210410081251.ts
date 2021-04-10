import { Migration } from '@mikro-orm/migrations';

export class Migration20210410081251 extends Migration {

  async up(): Promise<void> {
    this.addSql('CREATE SEQUENCE answer_request_id_seq as integer;');
    this.addSql('ALTER TABLE answer_request ALTER COLUMN id SET DEFAULT nextval(\'answer_request_id_seq\'); \n');

    this.addSql('alter table "team" drop constraint if exists "team_days_check";');
    this.addSql('alter table "team" alter column "days" type integer[] using ("days"::integer[]);');

    this.addSql('alter table "answer_request" drop constraint if exists "answer_request_id_check";');
    this.addSql('alter table "answer_request" alter column "id" type serial primary key using ("id"::serial primary key);');

    this.addSql('alter table "answer_request" drop constraint if exists "answer_request_option_id_check";');
    this.addSql('alter table "answer_request" alter column "option_id" type int4 using ("option_id"::int4);');
    this.addSql('alter table "answer_request" alter column "option_id" drop not null;');

    this.addSql('create table "user_team_snapshots" ("user_id" varchar(255) not null, "team_snapshot_id" int4 not null);');
    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_pkey" primary key ("user_id", "team_snapshot_id");');

    this.addSql('create table "user_teams" ("user_id" varchar(255) not null, "team_id" int4 not null);');
    this.addSql('alter table "user_teams" add constraint "user_teams_pkey" primary key ("user_id", "team_id");');

    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "user_team_snapshots" add constraint "user_team_snapshots_team_snapshot_id_foreign" foreign key ("team_snapshot_id") references "team_snapshot" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "user_teams" add constraint "user_teams_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "user_teams" add constraint "user_teams_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;');
  }

}
