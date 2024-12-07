import { GavelRounded, Visibility, VisibilityOff } from '@mui/icons-material'
import clsx from 'clsx'
import {
  ComponentType,
  Dispatch,
  Fragment,
  SetStateAction,
  useMemo,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  CosmosMessageDisplay,
  InputErrorMessage,
  Loader,
  MarkdownRenderer,
  ProposalContentDisplay,
  SegmentedControls,
  SwitchCard,
  TextAreaInput,
  TextInput,
  TokenAmountDisplay,
} from '@dao-dao/stateless'
import {
  Entity,
  GenericTokenWithUsdPrice,
  LoadingData,
  LoadingDataWithError,
  SingleChoiceNewProposalData,
  StatefulEntityDisplayProps,
  StatefulProposalListProps,
} from '@dao-dao/types'
import { Boolean } from '@dao-dao/types/contracts/DaoVotingCw721Staked'
import { decodedMessagesString, validateRequired } from '@dao-dao/utils'

import { CompleteRatings, SurveyWithMetadata } from '../../../../types'

export type ProposalCreationFormData = {
  type: 'new' | 'existing' | 'none'
  newProposal: Omit<SingleChoiceNewProposalData, 'msgs'>
  existing: string
}

export type CompleteProps = {
  /**
   * The active survey.
   */
  status: SurveyWithMetadata
  /**
   * The complete survey ratings to derive the final distribution form. If
   * undefined, info has not yet been loaded.
   */
  completeRatings: CompleteRatings | undefined
  /**
   * Whether or not the ratings are loading.
   */
  loadingRatings: boolean
  /**
   * Function to load the ratings.
   */
  loadRatings: () => void
  /**
   * Whether or not the current wallet can complete.
   */
  canComplete: LoadingDataWithError<boolean>
  /**
   * Callback to submit form data.
   */
  onComplete: (data: ProposalCreationFormData) => Promise<void>
  /**
   * Whether or not the form is being submitted.
   */
  completing: Boolean
  /**
   * The prices for tokens distributed in this survey.
   */
  tokenPrices: GenericTokenWithUsdPrice[]
  /**
   * The currently connected wallet address.
   */
  walletAddress: string
  /**
   * The entity for the wallet.
   */
  entity: LoadingData<Entity>
  /**
   * Whether or not to weight the ratings by voting power.
   */
  weightByVotingPower: boolean
  /**
   * Change the weight by voting power setting.
   */
  setWeightByVotingPower: Dispatch<SetStateAction<boolean>>
  /**
   * Stateful entity display component.
   */
  EntityDisplay: ComponentType<StatefulEntityDisplayProps>
  /**
   * Stateful proposal list component.
   */
  ProposalList: ComponentType<StatefulProposalListProps>
}

export const Complete = ({ canComplete, ...props }: CompleteProps) => {
  const { t } = useTranslation()

  return (
    <div className="grow flex flex-col gap-6">
      <p className="hero-text max-w-prose break-words">
        {props.status.survey.name}
      </p>

      {/* Match style of submit and rate forms with markdown instructions at the top under the title. */}
      <MarkdownRenderer
        className="-mt-2"
        markdown={t('info.compensationCycleClosedAwaitingCompletion', {
          context:
            canComplete.loading || canComplete.errored || !canComplete.data
              ? 'notMember'
              : 'member',
        })}
      />

      {props.completeRatings ? (
        <InnerComplete
          {...props}
          completeRatings={
            // Type-assertion.
            props.completeRatings
          }
        />
      ) : (
        !canComplete.loading &&
        (canComplete.errored ? (
          <p className="primary-text text-text-interactive-error">
            {t('error.failedToLoadMembershipRefreshPage')}
          </p>
        ) : (
          canComplete.data && (
            <Button
              className="self-start"
              loading={props.loadingRatings}
              onClick={props.loadRatings}
              variant="primary"
            >
              {t('button.viewResults')}
            </Button>
          )
        ))
      )}
    </div>
  )
}

export const InnerComplete = ({
  status: { survey },
  completeRatings,
  onComplete,
  completing,
  tokenPrices,
  walletAddress,
  entity,
  weightByVotingPower,
  setWeightByVotingPower,
  EntityDisplay,
  ProposalList,
}: Omit<CompleteProps, 'completeRatings' | 'canComplete'> & {
  completeRatings: CompleteRatings
}) => {
  const { t } = useTranslation()

  // Map token denom to price info.
  const tokenMap = useMemo(
    () =>
      tokenPrices.reduce(
        (acc, tokenInfo) => ({
          ...acc,
          [tokenInfo.token.denomOrAddress]: tokenInfo,
        }),
        {} as Record<string, GenericTokenWithUsdPrice>
      ),
    [tokenPrices]
  )

  // Markdown table of ratings by each rater for each contributor and attribute.
  const ratingMarkdownTables = completeRatings
    ? '## Ratings\n\n' +
      survey.attributes
        .map(({ name }, attributeIndex) =>
          [
            // Attribute Title
            '### ' + name,
            // Table Header
            [
              '',
              'Contributor',
              ...completeRatings.ratings.map(({ rater }) => rater.address),
              '',
            ]
              .join(' | ')
              .trim(),
            // Table Header Divider
            ['', '---', ...completeRatings.ratings.map(() => '---'), '']
              .join(' | ')
              .trim(),
            // Table Rows, per-contributor ratings.
            ...completeRatings.contributions.map((contribution) =>
              [
                '',
                // Contributor.
                contribution.contributor.address,
                // Rating by each rater for this contributor.
                ...completeRatings.ratings.map(({ contributions }) => {
                  const rating = contributions.find(
                    ({ id }) => id === contribution.id
                  )?.attributes[attributeIndex]

                  return typeof rating === 'number' ? rating : ''
                }),
                '',
              ]
                .join(' | ')
                .trim()
            ),
          ].join('\n')
        )
        .join('\n\n')
    : undefined

  const [showPreview, setShowPreview] = useState(false)
  const {
    watch,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalCreationFormData>({
    defaultValues: {
      type: 'new',
      newProposal: {
        title: '',
        description: ratingMarkdownTables,
      },
      existing: '',
    },
  })
  const formData = watch()
  const type = formData.type
  const proposalTitle = formData.newProposal.title
  const proposalDescription = formData.newProposal.description

  return (
    <div className="flex flex-col gap-8">
      <p className="header-text -mb-4">{t('title.results')}</p>

      {survey.attributes.map(({ name }, attributeIndex) => (
        <div key={attributeIndex} className="space-y-4">
          <p className="primary-text">{name}</p>

          <div
            className="grid-rows-auto grid items-stretch justify-items-stretch"
            // Column for contributor and each rater.
            style={{
              gridTemplateColumns: `minmax(0,1fr) ${completeRatings.ratings
                .map(() => 'auto')
                .join(' ')}`,
            }}
          >
            {/* Row for titles, which are mostly rater names. */}
            <p className="rounded-tl-md bg-background-primary p-4">
              {t('title.contributor')}
            </p>
            {completeRatings.ratings.map(({ rater }, ratingIndex) => (
              <EntityDisplay
                key={rater.publicKey}
                address={rater.address}
                className={clsx(
                  'justify-self-end border-l border-border-secondary bg-background-primary p-4',
                  ratingIndex === completeRatings.ratings.length - 1 &&
                    'rounded-tr-md'
                )}
              />
            ))}

            {/* Row for each contributor. */}
            {completeRatings.contributions.map(
              (contribution, contributionIndex) => {
                // Every other row.
                const backgroundClassName =
                  // eslint-disable-next-line i18next/no-literal-string
                  contributionIndex % 2 !== 0 && 'bg-background-tertiary'

                return (
                  <Fragment key={contribution.id}>
                    <EntityDisplay
                      address={contribution.contributor.address}
                      className={clsx(
                        'p-4',
                        backgroundClassName,
                        contributionIndex ===
                          completeRatings.contributions.length - 1 &&
                          'rounded-bl-md'
                      )}
                    />

                    {completeRatings.ratings.map(
                      ({ rater, contributions }, ratingIndex) => {
                        const rating = contributions.find(
                          ({ id }) => id === contribution.id
                        )?.attributes[attributeIndex]

                        return (
                          <div
                            key={rater.publicKey}
                            className={clsx(
                              'flex flex-col items-end justify-center border-l border-border-secondary p-4',
                              backgroundClassName,
                              ratingIndex ===
                                completeRatings.ratings.length - 1 &&
                                contributionIndex ===
                                  completeRatings.contributions.length - 1 &&
                                'rounded-br-md'
                            )}
                          >
                            {typeof rating === 'number' ? (
                              <p className="font-mono">{rating}</p>
                            ) : // Nothing if abstained.
                            null}
                          </div>
                        )
                      }
                    )}
                  </Fragment>
                )
              }
            )}
          </div>
        </div>
      ))}

      <p className="body-text text-text-secondary -mb-6">
        {t('info.howCompleteCycle')}
      </p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onComplete)}>
        <SegmentedControls<ProposalCreationFormData['type']>
          className="self-start mb-2"
          onSelect={(type) => setValue('type', type)}
          selected={type}
          tabs={[
            {
              label: t('title.newProposal'),
              value: 'new',
            },
            {
              label: t('title.existingProposal'),
              value: 'existing',
            },
            {
              label: t('title.noProposal'),
              value: 'none',
            },
          ]}
        />

        {type === 'new' ? (
          <>
            {/* Proposal title and description. */}
            <div className="rounded-lg bg-background-tertiary">
              <div className="flex flex-row items-center justify-between gap-6 border-b border-border-secondary py-4 px-6">
                <p className="primary-text text-text-body">{t('form.title')}</p>

                <div className="flex grow flex-col">
                  <TextInput
                    error={errors.newProposal?.title}
                    fieldName="newProposal.title"
                    placeholder={t('form.proposalsTitlePlaceholder')}
                    register={register}
                    validation={[validateRequired]}
                  />
                  <InputErrorMessage error={errors.newProposal?.title} />
                </div>
              </div>
              <div className="flex flex-col gap-4 p-6 pt-5">
                <p className="primary-text text-text-body">
                  {t('form.description')}
                </p>

                <div className="flex flex-col">
                  <TextAreaInput
                    error={errors.newProposal?.description}
                    fieldName="newProposal.description"
                    placeholder={t('form.proposalsDescriptionPlaceholder')}
                    register={register}
                    rows={5}
                    validation={[validateRequired]}
                  />
                  <InputErrorMessage error={errors.newProposal?.description} />
                </div>
              </div>
            </div>

            <SwitchCard
              containerClassName="self-start mt-2"
              enabled={weightByVotingPower}
              label={t('form.weightByVotingPower')}
              onClick={() => setWeightByVotingPower((w) => !w)}
              sizing="md"
              tooltip={t('form.weightByVotingPowerTooltip')}
              tooltipIconSize="sm"
            />

            {/* Contributor results grid. */}
            <div
              className="grid-rows-auto -mb-2 grid items-stretch justify-items-stretch overflow-x-auto pb-4"
              // Column for contributor and each rater.
              style={{
                gridTemplateColumns: `1fr ${survey.attributes
                  .map(() => 'auto')
                  .join(' ')} auto`,
              }}
            >
              {/* Row for titles, which are mostly attribute names. */}
              <p className="rounded-tl-md bg-background-primary p-4">
                {t('title.contributor')}
              </p>
              {survey.attributes.map(({ name }, attributeIndex) => (
                <p
                  key={attributeIndex}
                  className="border-l border-border-secondary bg-background-primary p-4 text-right"
                >
                  {name}
                </p>
              ))}
              <p className="rounded-tr-md border-l border-border-secondary bg-background-primary p-4 text-right">
                {t('title.compensation')}
              </p>

              {/* Row for each contributor. */}
              {completeRatings.contributions.map(
                ({ id, contributor, compensation }, contributionIndex) => {
                  // Every other row.
                  const backgroundClassName =
                    // eslint-disable-next-line i18next/no-literal-string
                    contributionIndex % 2 !== 0 && 'bg-background-tertiary'

                  const tokens = compensation.compensationPerAttribute
                    .flatMap(({ cw20Tokens, nativeTokens }) => [
                      ...nativeTokens,
                      ...cw20Tokens,
                    ])
                    .reduce(
                      (acc, { denomOrAddress, amount }) => ({
                        ...acc,
                        [denomOrAddress]: (
                          acc[denomOrAddress] ?? HugeDecimal.zero
                        ).plus(amount),
                      }),
                      {} as Record<string, HugeDecimal>
                    )
                  const totalUsdc = Object.entries(tokens)
                    .map(([denomOrAddress, amount]) =>
                      amount
                        .times(tokenMap[denomOrAddress]?.usdPrice ?? 0)
                        .toHumanReadableNumber(
                          tokenMap[denomOrAddress]?.token.decimals ?? 0
                        )
                    )
                    .reduce((acc, amount) => acc + amount, 0)

                  return (
                    <Fragment key={id}>
                      {/* Profile display */}
                      <EntityDisplay
                        address={contributor.address}
                        className={clsx(
                          'p-4',
                          backgroundClassName,
                          contributionIndex ===
                            completeRatings.contributions.length - 1 &&
                            'rounded-bl-md'
                        )}
                      />

                      {/* Attribute averages */}
                      {survey.attributes.map((_, attributeIndex) => (
                        <p
                          key={attributeIndex}
                          className={clsx(
                            'flex flex-col items-end justify-center border-l border-border-secondary p-4 font-mono',
                            backgroundClassName
                          )}
                        >
                          {compensation.compensationPerAttribute[
                            attributeIndex
                          ].averageRating.toLocaleString(undefined, {
                            maximumSignificantDigits: 4,
                          })}
                        </p>
                      ))}

                      {/* Total compensation */}
                      <div
                        className={clsx(
                          'flex flex-col items-end justify-center gap-1 border-l border-border-secondary p-4',
                          backgroundClassName,
                          contributionIndex ===
                            completeRatings.contributions.length - 1 &&
                            'rounded-br-md'
                        )}
                      >
                        {Object.entries(tokens).map(
                          ([denomOrAddress, amount], index) => (
                            <TokenAmountDisplay
                              key={index}
                              amount={amount}
                              className="text-right"
                              dateFetched={tokenMap[denomOrAddress]?.timestamp}
                              decimals={
                                tokenMap[denomOrAddress]?.token.decimals ?? 0
                              }
                              iconUrl={tokenMap[denomOrAddress]?.token.imageUrl}
                              symbol={
                                tokenMap[denomOrAddress]?.token.symbol ??
                                denomOrAddress
                              }
                            />
                          )
                        )}

                        <div className="mt-2">
                          <TokenAmountDisplay
                            amount={totalUsdc}
                            className="caption-text text-right"
                            dateFetched={tokenPrices[0]?.timestamp}
                            estimatedUsdValue
                            prefix="= "
                          />
                        </div>
                      </div>
                    </Fragment>
                  )
                }
              )}
            </div>

            <div className="flex flex-row items-center justify-end gap-2">
              <Button
                disabled={completing}
                onClick={() => setShowPreview((p) => !p)}
                size="lg"
                type="button"
                variant="secondary"
              >
                {showPreview ? (
                  <>
                    {t('button.hidePreview')}
                    <VisibilityOff className="!h-5 !w-5" />
                  </>
                ) : (
                  <>
                    {t('button.preview')}
                    <Visibility className="!h-5 !w-5" />
                  </>
                )}
              </Button>

              <Button loading={completing} size="lg" type="submit">
                <p>{t('button.publishProposal')}</p>
                <GavelRounded className="!h-4 !w-4" />
              </Button>
            </div>

            {showPreview && (
              <div className="mt-4 rounded-md border border-border-secondary p-6">
                <ProposalContentDisplay
                  EntityDisplay={EntityDisplay}
                  createdAt={new Date()}
                  creator={{
                    address: walletAddress,
                    entity,
                  }}
                  description={proposalDescription}
                  innerContentDisplay={
                    <CosmosMessageDisplay
                      value={decodedMessagesString(completeRatings.cosmosMsgs)}
                    />
                  }
                  title={proposalTitle}
                />
              </div>
            )}
          </>
        ) : type === 'existing' ? (
          <>
            <div className="flex flex-row justify-between gap-4 items-center">
              <p className="body-text text-text-secondary">
                {t('info.selectExistingProposalBelow')}
              </p>

              {completing && <Loader fill={false} size={20} />}
            </div>

            <ProposalList
              hideVetoable
              onClick={
                completing
                  ? () => {}
                  : ({ proposalId }) => {
                      setValue('existing', proposalId)
                      onComplete({
                        ...formData,
                        existing: proposalId,
                      })
                    }
              }
            />
          </>
        ) : (
          <>
            <Button
              className="self-start"
              loading={completing}
              size="lg"
              type="submit"
            >
              {t('button.complete')}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
