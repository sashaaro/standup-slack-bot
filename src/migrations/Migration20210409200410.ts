import { Migration } from '@mikro-orm/migrations';

export class Migration20210409200410 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "team" drop constraint if exists "team_days_check";');
    this.addSql('alter table "team" alter column "days" type integer[] using ("days"::integer[]);');

    this.addSql('create table "team_snapshot_users" ("team_snapshot_id" int4 not null, "user_id" varchar(255) not null);');
    this.addSql('alter table "team_snapshot_users" add constraint "team_snapshot_users_pkey" primary key ("team_snapshot_id", "user_id");');

    this.addSql('create table "team_users" ("team_id" int4 not null, "user_id" varchar(255) not null);');
    this.addSql('alter table "team_users" add constraint "team_users_pkey" primary key ("team_id", "user_id");');

    this.addSql('alter table "team_snapshot_users" add constraint "team_snapshot_users_team_snapshot_id_foreign" foreign key ("team_snapshot_id") references "team_snapshot" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "team_snapshot_users" add constraint "team_snapshot_users_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');

    this.addSql('alter table "team_users" add constraint "team_users_team_id_foreign" foreign key ("team_id") references "team" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "team_users" add constraint "team_users_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;');
  }

}
