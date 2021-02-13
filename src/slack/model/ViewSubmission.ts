export interface ViewSubmission {
    type: 'view_submission',
    team: { id: 'TK074QB08', domain: 'botenza' },
    user: {
        id: 'UJZM51SN8',
        username: 'sashaaro',
        name: 'sashaaro',
        team_id: 'TK074QB08'
    },
    api_app_id: 'AV2BXNNE6',
    token: 'NQAH1WEQQswLRF4vC8kgacEi',
    trigger_id: '1734296976631.646242827008.a87984f0e3889740a458bcebf7ab5d99',
    view: {
        id: 'V01N76Q5U7N',
        team_id: 'TK074QB08',
        type: 'modal',
        blocks: [],
        private_metadata: '{"standup":15}',
        callback_id: 'send_answers',
        state: { values: [] },
        hash: '1613207717.0PdqYx3i',
        title: { type: 'plain_text', text: 'Standup #мой стендамп', emoji: true },
        clear_on_close: false,
        notify_on_close: false,
        close: { type: 'plain_text', text: 'Cancel', emoji: true },
        submit: { type: 'plain_text', text: 'Submit', emoji: true },
        previous_view_id: null,
        root_view_id: 'V01N76Q5U7N',
        app_id: 'AV2BXNNE6',
        external_id: '',
        app_installed_team_id: 'TK074QB08',
        bot_id: 'B0103D11RD4'
    },
    response_urls: [],
    is_enterprise_install: false,
    enterprise: null
}


export interface SlackAction {
    type: 'block_actions',
    user: {
        id: 'UJZM51SN8',
        username: 'sashaaro',
        name: 'sashaaro',
        team_id: 'TK074QB08'
    },
    api_app_id: 'AV2BXNNE6',
    token: 'NQAH1WEQQswLRF4vC8kgacEi',
    container: {
        type: 'message',
        message_ts: '1613213885.002000',
        channel_id: 'DV3NH4V27',
        is_ephemeral: false
    },
    trigger_id: '1772974256384.646242827008.97fea6d9187e8e1e0422ff4d5271d7f7',
    team: { id: 'TK074QB08', domain: 'botenza' },
    enterprise: null,
    is_enterprise_install: false,
    channel: { id: 'DV3NH4V27', name: 'directmessage' },
    message: {
        bot_id: 'B0103D11RD4',
        type: 'message',
        text: "It's time to start your daily standup мой стендамп",
        user: 'UV3NH4TEF',
        ts: '1613213885.002000',
        team: 'TK074QB08',
        blocks: []
    },
    response_url: 'https://hooks.slack.com/actions/TK074QB08/1734359975847/xMC3Jskr7TMGbSfow31r2Plw',
    actions: [
        {
            action_id: string,
            block_id: 'HXt8',
            text: [],
            value: string,
            style: 'primary',
            type: 'button',
            action_ts: '1613214411.418141'
        }
    ]
}