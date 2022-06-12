import type { GetStaticProps } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import {
  FunctionComponent,
  PropsWithChildren,
  createContext,
  useContext,
} from 'react'

import {
  Cw20StakedBalanceVotingQueryClient,
  Cw4VotingQueryClient,
  CwCoreQueryClient,
} from '@dao-dao/state'
import { ConfigResponse } from '@dao-dao/state/clients/cw-core'
import { InfoResponse as Cw20StakedBalanceVotingInfoResponse } from '@dao-dao/state/clients/cw20-staked-balance-voting'
import { InfoResponse as Cw4VotingInfoResponse } from '@dao-dao/state/clients/cw4-voting'
import {
  CHAIN_RPC_ENDPOINT,
  CI,
  VotingModuleType,
  cosmWasmClientRouter,
  parseVotingModuleContractName,
  validateContractAddress,
} from '@dao-dao/utils'

import { OrgNotFound } from './org/NotFound'

interface OrgInfo {
  coreAddress: string
  votingModuleType: VotingModuleType
  // cw4-voting
  cw4GroupAddress: string | null
  // cw20-staked-balance-voting
  governanceTokenAddress: string | null
  stakingContractAddress: string | null
  name: string
  description: string
  imageUrl: string | null
}
const DefaultOrgInfo: OrgInfo = {
  coreAddress: '',
  votingModuleType: VotingModuleType.Cw4Voting,
  cw4GroupAddress: '',
  governanceTokenAddress: '',
  stakingContractAddress: '',
  name: '',
  description: '',
  imageUrl: null,
}
const OrgInfoContext = createContext<OrgInfo | null>(null)
export const useOrgInfoContext = () => {
  const context = useContext(OrgInfoContext)
  if (!context) {
    throw new Error(
      'useOrgInfoContext can only be used in a descendant of OrgInfoContext.'
    )
  }

  return context
}

export type OrgPageWrapperProps = PropsWithChildren<{
  url?: string
  title: string
  description: string
  info?: OrgInfo
}>

export const OrgPageWrapper: FunctionComponent<OrgPageWrapperProps> = ({
  url,
  title,
  description,
  info,
  children,
}) => {
  const { isFallback, isReady } = useRouter()

  return (
    <>
      <NextSeo
        description={description}
        openGraph={{
          ...(!!url && { url }),
          type: 'website',
          title,
          description,
          ...(!!info?.imageUrl && { images: [{ url: info.imageUrl }] }),
        }}
        title={title}
      />

      {/* We only know an org is not found if info is still empty when
       * when the page is ready and not a fallback page.
       */}
      {!info && !isFallback && isReady ? (
        <OrgNotFound />
      ) : (
        <OrgInfoContext.Provider value={info || DefaultOrgInfo}>
          {children}
        </OrgInfoContext.Provider>
      )}
    </>
  )
}

interface GetStaticPropsMakerProps {
  leadingTitle?: string
  followingTitle?: string
  overrideTitle?: string
  overrideDescription?: string
  overrideImageUrl?: string
  getAdditionalProps?: (
    config: ConfigResponse
  ) => Record<string, any> | Promise<Record<string, any>> | null | undefined
}
type GetStaticPropsMaker = (
  props?: GetStaticPropsMakerProps
) => GetStaticProps<OrgPageWrapperProps>

// Computes OrgPageWrapperProps for the org with optional alterations.
export const makeGetOrgStaticProps: GetStaticPropsMaker =
  ({
    leadingTitle,
    followingTitle,
    overrideTitle,
    overrideDescription,
    overrideImageUrl,
    getAdditionalProps,
  } = {}) =>
  async ({ params: { address } = { address: undefined } }) => {
    // Don't query chain if running in CI.
    if (CI) {
      return { notFound: true }
    }

    // If invalid address, display not found.
    if (
      typeof address !== 'string' ||
      !address ||
      validateContractAddress(address) !== true
    ) {
      // Excluding `info` will render OrgNotFound.
      return {
        props: {
          title: 'Org not found',
          description: '',
        },
      }
    }

    try {
      const cwClient = await cosmWasmClientRouter.connect(CHAIN_RPC_ENDPOINT)
      const coreClient = new CwCoreQueryClient(cwClient, address)

      const config = await coreClient.config()

      const votingModuleAddress = await coreClient.votingModule()
      const {
        info: { contract: votingModuleContractName },
      }: Cw4VotingInfoResponse | Cw20StakedBalanceVotingInfoResponse =
        await cwClient.queryContractSmart(votingModuleAddress, { info: {} })

      const votingModuleType = parseVotingModuleContractName(
        votingModuleContractName
      )
      if (!votingModuleType) {
        throw new Error('Failed to determine voting module type.')
      }

      let cw4GroupAddress: string | null = null
      let governanceTokenAddress: string | null = null
      let stakingContractAddress: string | null = null
      if (votingModuleType === VotingModuleType.Cw4Voting) {
        const votingModuleClient = new Cw4VotingQueryClient(
          cwClient,
          votingModuleAddress
        )
        cw4GroupAddress = await votingModuleClient.groupContract()
      } else if (
        votingModuleType === VotingModuleType.Cw20StakedBalanceVoting
      ) {
        const votingModuleClient = new Cw20StakedBalanceVotingQueryClient(
          cwClient,
          votingModuleAddress
        )
        governanceTokenAddress = await votingModuleClient.tokenContract()
        stakingContractAddress = await votingModuleClient.stakingContract()
      }

      return {
        props: {
          title:
            overrideTitle ??
            [leadingTitle?.trim(), config.name.trim(), followingTitle?.trim()]
              .filter(Boolean)
              .join(' | '),
          description: overrideDescription ?? config.description,
          info: {
            coreAddress: address,
            votingModuleType,
            cw4GroupAddress,
            governanceTokenAddress,
            stakingContractAddress,
            name: config.name,
            description: config.description,
            imageUrl: overrideImageUrl ?? config.image_url ?? null,
          },
          ...(await getAdditionalProps?.(config)),
        },
        // Regenerate the page at most once per second.
        // Should serve cached copy and update after a refresh.
        revalidate: 1,
      }
    } catch (error) {
      console.error(error)

      if (
        error instanceof Error &&
        (error.message.includes('not found') ||
          error.message.includes('Error parsing into type') ||
          error.message.includes('unknown variant'))
      ) {
        // Excluding `info` will render OrgNotFound.
        return {
          props: {
            title: 'Org not found',
            description: '',
          },
        }
      }

      // Throw error to trigger 500.
      throw error
    }
  }
