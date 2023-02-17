import {Injectable} from '@nestjs/common';
import {createActionRuleSet, createLogMatcherForActions, getTxCanonicalMsgs} from '@terra-rebels/log-finder-ruleset';
import {isTxError} from '@terra-rebels/terra.js';
import axios from 'axios';
import config from 'src/config';

type OffsetParam = string | undefined;

export interface Received {
    limit: number;
    next: number;
    txs: Item[];
}

type Item = any;

const LIMIT = 3;

@Injectable()
export class TxHistoryService {
    private fetchFCD(account: string, offset: OffsetParam) {
        const url = config.endpoints.fcd + '/v1/txs';

        return axios
            .get(url, {
                params: {account, offset},
            })
            .then((r) => r.data);
    }

    getAccountTxHistory(account: string, offset: OffsetParam) {
        return this.fetchFCD(account, offset).then(this.parser);
    }

    private parse = (item: Item) => {
        const {txhash, timestamp, tx, raw_log} = item;
        const {fee, memo} = tx.value;
        const success = !isTxError(item);

        /* log-finder-ruleset */
        const ruleset = createActionRuleSet('classic');
        const logMatcher = createLogMatcherForActions(ruleset);
        const getCanonicalMsgs = (tx: Tx) => {
            const matchedMsg = getTxCanonicalMsgs(JSON.stringify(tx), logMatcher);
            return matchedMsg
                ? matchedMsg
                    .map((matchedLog) => matchedLog.map(({transformed}) => transformed))
                    .flat(2)
                : [];
        };

        const msgs = getCanonicalMsgs(item)
            .filter((item) => item)
            .map((item) => {
                if (!item) throw new Error();
                const {payload, ...rest} = item;
                return rest;
            });

        const collapsed = Math.max(msgs.length - LIMIT, 0);

        return Object.assign(
            {
                txhash,
                timestamp: new Date(timestamp).getTime(),
                success,
                msgs: msgs.slice(0, LIMIT),
                fee: fee.amount,
            },
            collapsed && {collapsed},
            memo && {memo},
            !success && {raw_log},
        );
    };

    private parser = ({txs, ...response}: Received) => {
        return {...response, list: txs.map(this.parse)};
    };
}
