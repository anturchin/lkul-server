const axios = require('axios');
const {JIRA_SERVICEDESK_COMPONENTS, JIRA_SERVICEDESK_HOST, JIRA_SERVICEDESK_ID, JIRA_SERVICEDESK_LOGIN, JIRA_SERVICEDESK_MAPPING, JIRA_SERVICEDESK_REQUEST_TYPE_GROUPS, JIRA_SERVICEDESK_TOKEN} = require('../config').jira;
const FormData = require('form-data');

module.exports = class Ticket {

    static async return(data) {
        const value = async (item) => ({
            ...item,
        });
        if (!Array.isArray(data)) {
            return value(data);
        }
        const rows = [];
        const result = await Promise.all(data.map(value));
        result.forEach((row) => {
            rows.push(row);
        });
        return rows;
    }

    static getConfig() {

        const basic = Buffer.from(
            `${JIRA_SERVICEDESK_LOGIN}:${JIRA_SERVICEDESK_TOKEN}`
        ).toString('base64');

        return {
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/json',
            },
            host: JIRA_SERVICEDESK_HOST,
            serviceDeskId: JIRA_SERVICEDESK_ID,
            components: JIRA_SERVICEDESK_COMPONENTS,
            mapping: JIRA_SERVICEDESK_MAPPING,
            groups: JIRA_SERVICEDESK_REQUEST_TYPE_GROUPS,
        };
    }

    static async getTicketRequestTypes() {
        const config = this.getConfig();

        const groups = [];

        try {
            config.groups.forEach((group) => {
                groups.push(group.toString());
            });
        } catch (error) {
            console.error('JIRA-ServiceDesk: error parsing JIRA_SERVICEDESK_REQUEST_TYPE_GROUPS');
            console.error(error);
        }

        const result = await axios.get(
            `${config.host}/servicedeskapi/servicedesk/${config.serviceDeskId}/requesttype/`,
            {
                headers: config.headers,
            }
        );

        return result.data.values
            .filter((value) => groups.find((group) => value.groupIds.includes(group)))
            .map((value) => ({
                id: parseInt(value.id, 10),
                name: value.name,
            }));
    }

    static async sendToServiceDesk(ticket, consumer) {
        const config = this.getConfig();

        const components = config.components.map(c => ({id: String(c)}));

        // const params = ticket.params;
        const customFields = {
            customfield_10600: Number(consumer.inn),
            customfield_10602: consumer.cons_name,
            customfield_10500: consumer.cons_number,
            customfield_10501: consumer.cons_org,
        };

        if (consumer.kpp)
            customFields.customfield_10601 = Number(consumer.kpp);


        const data = {
            serviceDeskId: config.serviceDeskId,
            requestTypeId: '280',
            raiseOnBehalfOf: ticket.email,
            requestFieldValues: {
                summary: ticket.summary,
                description: ticket.description,
                components,
                ...customFields,
            },
        };
        console.log(`${config.host}/servicedeskapi/request`, JSON.stringify(data), config.headers);
        const result = await axios.post(
            `${config.host}/servicedeskapi/request`,
            data,
            {
                headers: config.headers,
            }
        );

        const exId = parseInt(result.data.issueId, 10);
        const exKey = result.data.issueKey;

        console.log(`JIRA-ServiceDesk: ${exKey} saved!`);

        if (ticket.attachments.length > 0) {
            const form = new FormData();
            await Promise.all(
                ticket.attachments.map(async (attachment) => {
                    const { filename, buffer } = attachment;
                    form.append('file', buffer, { filename });
                })
            );
            await axios.post(
                `${config.host}/api/2/issue/${exKey}/attachments`,
                form,
                {
                    headers: {
                        ...config.headers,
                        ...form.getHeaders(),
                        'X-Atlassian-Token': 'nocheck',
                    },
                }
            );
        }
        // TODO: db update

        return { exId, exKey };
    }
};
