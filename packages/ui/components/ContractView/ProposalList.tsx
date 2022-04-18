import { FC } from 'react'

import Link from 'next/link'

import { ProposalResponse } from '@dao-dao/types/contracts/cw3-dao'

import { getProposalEnd, zeroPad } from '@dao-dao/utils'

import { ProposalStatus } from '../ProposalStatus'

export interface ProposalLineProps {
  proposal: ProposalResponse
  proposalViewUrl: string
}

export const ProposalLine: FC<ProposalLineProps> = ({
  proposal,
  proposalViewUrl,
}) => (
  <Link href={proposalViewUrl}>
    <a>
      <div className="grid grid-cols-6 items-center p-4 my-1 text-sm bg-primary rounded-lg">
        <div className="flex flex-row flex-wrap col-span-2 gap-4 items-center">
          <p className="font-mono caption-text"># {zeroPad(proposal.id, 6)}</p>
          <ProposalStatus status={proposal.status} />
        </div>
        <p className="col-span-3 truncate link-text">{proposal.title}</p>
        <p className="body-text truncate">
          {getProposalEnd(proposal.expires, proposal.status)}
        </p>
      </div>
    </a>
  </Link>
)
