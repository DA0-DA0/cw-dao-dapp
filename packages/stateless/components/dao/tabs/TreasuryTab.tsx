import { CopyAll } from '@mui/icons-material'
import { ComponentType, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  AccountType,
  ButtonLinkProps,
  ChainId,
  DaoFiatDepositModalProps,
  IconButtonLinkProps,
  LoadingData,
  LoadingDataWithError,
  LoadingNfts,
  LoadingTokens,
  TokenCardInfo,
  TreasuryHistoryGraphProps,
  ValenceAccount,
} from '@dao-dao/types'
import {
  NEUTRON_GOVERNANCE_DAO,
  getDisplayNameForChainId,
  serializeTokenSource,
} from '@dao-dao/utils'

import { useDao, useSupportedChainContext } from '../../../contexts'
import { useButtonPopupSorter, useTokenSortOptions } from '../../../hooks'
import { ErrorPage } from '../../error'
import { AccountSelector } from '../../inputs'
import { LineLoaders } from '../../LineLoader'
import { NftSection } from '../../nft/NftSection'
import { ButtonPopup } from '../../popup'
import { StatusCard } from '../../StatusCard'
import { TokenLineHeader } from '../../token'
import { Tooltip, TooltipInfoIcon } from '../../tooltip'
import { ValenceAccountsSection } from '../../ValenceAccountsSection'

export type TreasuryTabProps<T extends TokenCardInfo, N extends object> = {
  connected: boolean
  tokens: LoadingTokens<T>
  nfts: LoadingData<LoadingNfts<N & { key: string }>>
  /**
   * Create cross-chain account proposal prefill URL. If undefined, this means
   * the action cannot be used, most likely because all accounts are already
   * created.
   */
  createCrossChainAccountHref: string | undefined
  /**
   * Configure rebalancer proposal prefill URL. If undefined, this means the
   * action cannot be used.
   */
  configureRebalancerHref: string | undefined
  FiatDepositModal: ComponentType<DaoFiatDepositModalProps>
  TreasuryHistoryGraph: ComponentType<TreasuryHistoryGraphProps>
  TokenLine: ComponentType<T>
  NftCard: ComponentType<N>
  ButtonLink: ComponentType<ButtonLinkProps>
  IconButtonLink: ComponentType<IconButtonLinkProps>
}

export const TreasuryTab = <T extends TokenCardInfo, N extends object>({
  connected,
  tokens,
  nfts,
  createCrossChainAccountHref,
  configureRebalancerHref,
  FiatDepositModal,
  TreasuryHistoryGraph,
  TokenLine,
  NftCard,
  ButtonLink,
  IconButtonLink,
}: TreasuryTabProps<T, N>) => {
  const { t } = useTranslation()
  const {
    chain: { chainId: currentChainId },
    config: { noIndexer },
  } = useSupportedChainContext()
  const { chainId: daoChainId, coreAddress, accounts } = useDao()

  // Combine chain tokens into loadable, lazily. Load all that are ready.
  const { nonValenceTokens, valenceTokens } = useMemo((): {
    nonValenceTokens: LoadingDataWithError<T[]>
    valenceTokens: LoadingDataWithError<T[]>
  } => {
    const chainTokens = Object.values(tokens)
    const allTokens: LoadingDataWithError<T[]> = chainTokens.every(
      (l) => l?.loading
    )
      ? {
          loading: true,
          errored: false,
        }
      : chainTokens.every((l) => l?.errored)
        ? {
            loading: false,
            errored: true,
            // First error.
            error:
              // Type-check, will always be defined.
              (chainTokens[0]?.errored && chainTokens[0].error) || new Error(),
          }
        : {
            loading: false,
            errored: false,
            updating: chainTokens.some(
              (l) => l && !l.loading && !l.errored && l.updating
            ),
            data: chainTokens.flatMap((l) =>
              l && !l.loading && !l.errored ? l.data : []
            ),
          }

    return {
      nonValenceTokens:
        allTokens.loading || allTokens.errored
          ? allTokens
          : {
              // Filter out any valence account tokens.
              ...allTokens,
              data: allTokens.data.filter(
                ({ owner }) => owner.type !== AccountType.Valence
              ),
            },
      valenceTokens:
        allTokens.loading || allTokens.errored
          ? allTokens
          : {
              // Keep only valence account tokens.
              ...allTokens,
              data: allTokens.data.filter(
                ({ owner }) => owner.type === AccountType.Valence
              ),
            },
    }
  }, [tokens])

  // Combine chain tokens into loadable, lazily. Load all that are ready.
  const allNfts = useMemo((): LoadingDataWithError<N[]> => {
    if (nfts.loading) {
      return {
        loading: true,
        errored: false,
      }
    }

    const chainNfts = Object.values(nfts.data)

    return chainNfts.every((l) => l?.loading)
      ? {
          loading: true,
          errored: false,
        }
      : chainNfts.every((l) => l?.errored)
        ? {
            loading: false,
            errored: true,
            // First error.
            error:
              // Type-check, will always be defined.
              (chainNfts[0]?.errored && chainNfts[0].error) || new Error(),
          }
        : {
            loading: false,
            errored: false,
            updating: chainNfts.some(
              (l) => l && (l.loading || (!l.errored && l.updating))
            ),
            data: chainNfts.flatMap((l) =>
              l && !l.loading && !l.errored ? l.data : []
            ),
          }
  }, [nfts])

  const [depositFiatChainId, setDepositFiatChainId] = useState<
    string | undefined
  >()

  // Maps serialized token source to color.
  const [tokenSourceColorMap, setTokenSourceColorMap] = useState<
    Record<string, string>
  >({})

  const tokenSortOptions = useTokenSortOptions()
  const {
    sortedData: sortedTokens,
    buttonPopupProps: sortTokenButtonPopupProps,
  } = useButtonPopupSorter({
    data:
      nonValenceTokens.loading || nonValenceTokens.errored
        ? undefined
        : nonValenceTokens.data,
    options: tokenSortOptions,
  })

  const valenceAccounts = accounts.filter(
    (a): a is ValenceAccount => a.type === AccountType.Valence
  )

  return (
    <>
      {/* header min-height of 3.5rem standardized across all tabs */}
      <div className="mb-6 flex min-h-[3.5rem] flex-row items-center justify-between gap-8 border-b border-border-secondary pb-6">
        <p className="title-text text-text-body">{t('title.treasury')}</p>

        <AccountSelector
          accounts={accounts}
          onSelect={({ chainId, address }) => {
            navigator.clipboard.writeText(address)
            toast.success(
              t('info.copiedChainAddress', {
                chain: getDisplayNameForChainId(chainId),
              })
            )
          }}
          trigger={{
            type: 'button',
            props: {
              className: 'self-start',
              variant: 'primary',
              contentContainerClassName: '!gap-1',
              children: (
                <>
                  <CopyAll className="!h-4 !w-4" />
                  {t('button.copyAddress')}
                </>
              ),
            },
          }}
        />
      </div>

      {
        // Don't show the treasury history graph if the DAO's chain doesn't
        // support indexing or for the Neutron DAO for performance reasons.
        !(
          noIndexer ||
          (daoChainId === ChainId.NeutronMainnet &&
            coreAddress === NEUTRON_GOVERNANCE_DAO)
        ) && (
          <TreasuryHistoryGraph
            address={coreAddress}
            chainId={daoChainId}
            className="mb-8 hidden rounded-md bg-background-tertiary p-6 sm:flex"
            graphClassName="max-h-[20rem]"
            header={
              <div className="flex flex-row items-center justify-center gap-1">
                <p className="title-text">{t('title.treasuryValue')}</p>

                <TooltipInfoIcon
                  size="sm"
                  title={t('info.treasuryValueTooltip')}
                />
              </div>
            }
            registerTokenColors={setTokenSourceColorMap}
          />
        )
      }

      <div className="mb-6 flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="title-text">{t('title.tokens')}</p>

        <ButtonPopup position="left" {...sortTokenButtonPopupProps} />
      </div>

      {nonValenceTokens.loading ? (
        <div className="space-y-1">
          <TokenLineHeader />
          <LineLoaders lines={7} type="token" />
        </div>
      ) : nonValenceTokens.errored ? (
        <ErrorPage error={nonValenceTokens.error} />
      ) : (
        <div className="space-y-1">
          <TokenLineHeader />

          {sortedTokens.map((props: T, index) => (
            <TokenLine
              {...props}
              key={
                props.token.chainId +
                props.owner.address +
                props.token.denomOrAddress
              }
              color={tokenSourceColorMap[serializeTokenSource(props.token)]}
              transparentBackground={index % 2 !== 0}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-row justify-end">
        <Tooltip
          title={
            createCrossChainAccountHref
              ? undefined
              : t('info.allCrossChainAccountsCreated')
          }
        >
          <ButtonLink
            disabled={!createCrossChainAccountHref}
            href={createCrossChainAccountHref}
            variant="secondary"
          >
            {t('button.createCrossChainAccount')}
          </ButtonLink>
        </Tooltip>
      </div>

      {/* Show chain token load errors. */}
      {Object.entries(tokens).flatMap(([chainId, l]) =>
        l && l.errored ? (
          <StatusCard
            key={chainId}
            className="mt-6"
            content={t('error.loadingChainTokens', {
              chain: getDisplayNameForChainId(chainId),
            })}
            style="warning"
          >
            <pre className="whitespace-pre-wrap text-xs text-text-interactive-error">
              {l.error instanceof Error ? l.error.message : l.error}
            </pre>
          </StatusCard>
        ) : (
          []
        )
      )}

      {valenceAccounts.length > 0 && (
        <ValenceAccountsSection
          ButtonLink={ButtonLink}
          IconButtonLink={IconButtonLink}
          TokenLine={TokenLine}
          TreasuryHistoryGraph={TreasuryHistoryGraph}
          accounts={valenceAccounts}
          className="mt-8"
          configureRebalancerHref={configureRebalancerHref}
          tokens={valenceTokens}
        />
      )}

      <NftSection NftCard={NftCard} className="mt-10" nfts={allNfts} />

      {connected && !!depositFiatChainId && (
        <FiatDepositModal
          accountType={
            depositFiatChainId === currentChainId
              ? AccountType.Base
              : AccountType.Polytone
          }
          chainId={depositFiatChainId}
          onClose={() => setDepositFiatChainId(undefined)}
          visible
        />
      )}
    </>
  )
}
