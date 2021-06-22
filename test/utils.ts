import {createProviders} from "../src/services/providers";
import {ReflectiveInjector} from "injection-js";
import {TeamRepository} from "../src/repository/team.repository";
import {Channel, Question, SlackWorkspace, Team, Timezone, User} from "../src/entity";
import {TEAM_STATUS_ACTIVATED} from "../src/entity/team";
import {EntityManager} from "@mikro-orm/postgresql";

const {providers} = createProviders({} as any, {} as any); // TODO

/*loggerProvider.useFactory = () => {
  const logger = createLogger()
  const transport = new TransportStream({
    log: (info) => {
      this.logs = this.logs ?? [];
      this.logs.push(info);
    },
  });

  (transport as any).reset = function() {
    this.logs = [];
  }

  logger.add(transport);
  (logger as any).transport = transport;
  return logger;
}*/

export const testInjector = ReflectiveInjector.resolveAndCreate(providers);
export const testConnection: any = {}; // TODO

export const generateTeam = () => {
  const team = new Team();
  team.name = 'team';
  team.status = TEAM_STATUS_ACTIVATED;
  team.duration = 20;
  return team
}

const random = (): string => Math.random().toString().substr(-8);

export const generateWorkspace = () => {
  const workspace = new SlackWorkspace();
  workspace.name = 'test space'
  workspace.domain = 'test-space'
  workspace.id = `space-${random()}`
  workspace.accessToken = 'xhxd-1022'
  workspace.slackData = {} as any
  return workspace;
}

export const generateChannel = () => {
  const channel = new Channel();
  const id = random();
  channel.id = 'channel-id-' + id
  channel.name = 'Channel #' + id
  channel.nameNormalized = channel.name
  return channel;
}

export const createQuestion = (text: string) => {
  const q = new Question();
  q.text = text;
  return q;
}

export const simpleFixture = async (manager: EntityManager|any) => {
  const workspace = generateWorkspace();
  await manager.getRepository(SlackWorkspace).save(workspace);

  const user = manager.getRepository(User).create();
  user.id = random();
  user.name = 'Alex';
  user.workspace = workspace;
  await manager.getRepository(User).save(user);

  const channel = generateChannel()
  await manager.getRepository(Channel).save(channel)

  let team = generateTeam();
  team.timezone = await manager.getRepository(Timezone).findOne({name : 'Europe/Moscow'});
  team.start = '13:05';
  team.reportChannel = channel;
  team.workspace = workspace;
  team.users.add(user);
  team.createdBy = user;
  team.questions.add(...[
    createQuestion('What did you do yesterday?'),
    createQuestion('What you do today?'),
    createQuestion('Problem?')
  ]);
  team.questions.getItems().map((q, index) => q.index = index); // recalculate question index
  await manager.getRepository(Team).save(team);
  team = await manager.getCustomRepository(TeamRepository).findActiveById(team.id);

  return {workspace, user, channel, team};
}
