import { ProposalStatus } from '@terra-rebels/terra.proto/cosmos/gov/v1beta1/gov';
import { WeightedVoteOption, ValAddress } from '@terra-rebels/terra.js';

export type ProposalStatusMap = Map<number, ProposalStatus>;

export interface ValidatorVote {
  options: WeightedVoteOption.Data[];
  proposal_id: string;
}

export interface ProposalVoteHistory {
  voter: ValAddress;
  options: WeightedVoteOption.Data[];
}
