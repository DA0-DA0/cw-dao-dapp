import cloneDeep from 'lodash.clonedeep'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CreateDaoContext, DaoInfoCard } from '@dao-dao/types'
import {
  decodeJsonFromBase64,
  objectMatchesStructure,
  processError,
} from '@dao-dao/utils'

import { CosmosMessageDisplay } from '../../../CosmosMessageDisplay'
import { Checkbox } from '../../../inputs/Checkbox'
import { DaoInfoCards } from '../../DaoInfoCards'

export const CreateDaoReview = ({
  form: { watch },
  commonVotingConfig,
  creator,
  proposalModuleDaoCreationAdapters,
  instantiateMsg,
  instantiateMsgError,
}: CreateDaoContext) => {
  const { t } = useTranslation()

  const newDao = watch()
  const {
    creator: { data: creatorData },
    proposalModuleAdapters,
    votingConfig,
  } = newDao

  const togglePreviewRef = useRef<HTMLDivElement>(null)
  const [decodeModuleMessages, setDecodeModuleMessages] = useState(true)
  const [showingPreview, setShowingPreview] = useState(false)

  let previewJson: string | undefined
  let previewError: string | undefined
  try {
    if (instantiateMsgError) {
      throw new Error(instantiateMsgError)
    } else if (!instantiateMsg) {
      throw new Error(t('error.daoCreationIncomplete'))
    }

    const msg: any = cloneDeep(instantiateMsg)
    // Convert encoded module instantiation messages back to readable JSON.
    if (decodeModuleMessages) {
      msg.proposal_modules_instantiate_info.forEach((info: any) => {
        const msg = decodeJsonFromBase64(info.msg)

        // Convert encoded pre_propose_info message back to readable JSON.
        if (
          objectMatchesStructure(msg, {
            pre_propose_info: {
              module_may_propose: {
                info: {
                  msg: {},
                },
              },
            },
          })
        ) {
          msg.pre_propose_info.module_may_propose.info.msg =
            decodeJsonFromBase64(
              msg.pre_propose_info.module_may_propose.info.msg
            )
        }

        info.msg = msg
      })

      msg.voting_module_instantiate_info.msg = decodeJsonFromBase64(
        msg.voting_module_instantiate_info.msg
      )
      // Convert encoded token_info.factory message back to readable JSON.
      if (
        objectMatchesStructure(msg.voting_module_instantiate_info.msg, {
          token_info: {
            factory: {},
          },
        })
      ) {
        msg.voting_module_instantiate_info.msg.token_info.factory =
          decodeJsonFromBase64(
            msg.voting_module_instantiate_info.msg.token_info.factory
          )

        msg.voting_module_instantiate_info.msg.token_info.factory.execute.msg =
          decodeJsonFromBase64(
            msg.voting_module_instantiate_info.msg.token_info.factory.execute
              .msg
          )
      }
    }
    // Pretty print output.
    previewJson = JSON.stringify(msg, undefined, 2)
  } catch (err) {
    console.error(err)
    previewError = processError(err, {
      forceCapture: false,
    })
  }

  const togglePreview = () => setShowingPreview((s) => !s)

  const reviewCards: DaoInfoCard[] = [
    ...creator.votingConfig.items
      .concat(creator.votingConfig.advancedItems ?? [])
      .flatMap(
        ({
          onlyDisplayCondition,
          Icon,
          nameI18nKey,
          tooltipI18nKey,
          Review,
        }): DaoInfoCard | [] =>
          // If has display condition, check it. Otherwise display.
          (onlyDisplayCondition?.(newDao) ?? true)
            ? {
                Icon,
                label: t(nameI18nKey),
                value: <Review data={creatorData} newDao={newDao} />,
                tooltip:
                  tooltipI18nKey &&
                  t(
                    typeof tooltipI18nKey === 'string'
                      ? tooltipI18nKey
                      : tooltipI18nKey(creatorData)
                  ),
              }
            : []
      ),
    ...proposalModuleDaoCreationAdapters.flatMap(
      ({ extraVotingConfig: { items = [], advancedItems = [] } = {} }, index) =>
        items
          .concat(advancedItems ?? [])
          .flatMap(
            ({
              onlyDisplayCondition,
              Icon,
              nameI18nKey,
              tooltipI18nKey,
              Review,
            }): DaoInfoCard | [] =>
              // If has display condition, check it. Otherwise display.
              (onlyDisplayCondition?.(newDao) ?? true)
                ? {
                    Icon,
                    label: t(nameI18nKey),
                    value: (
                      <Review
                        data={proposalModuleAdapters[index].data}
                        newDao={newDao}
                      />
                    ),
                    tooltip:
                      tooltipI18nKey &&
                      t(
                        typeof tooltipI18nKey === 'string'
                          ? tooltipI18nKey
                          : tooltipI18nKey(proposalModuleAdapters[index].data)
                      ),
                  }
                : []
          )
    ),
    ...[
      ...commonVotingConfig.items,
      ...commonVotingConfig.advancedItems,
    ].flatMap(
      ({ onlyDisplayCondition, Icon, nameI18nKey, tooltipI18nKey, Review }) =>
        // If has display condition, check it. Otherwise display.
        (onlyDisplayCondition?.(newDao) ?? true)
          ? {
              Icon,
              label: t(nameI18nKey),
              value: <Review data={votingConfig} newDao={newDao} />,
              tooltip:
                tooltipI18nKey &&
                t(
                  typeof tooltipI18nKey === 'string'
                    ? tooltipI18nKey
                    : tooltipI18nKey(votingConfig)
                ),
            }
          : []
    ),
  ]

  return (
    <>
      <p className="header-text mt-4 mb-6 text-text-body md:my-8">
        {t('title.governanceConfiguration')}
      </p>

      <creator.governanceConfig.Review data={creatorData} newDao={newDao} />

      <p className="header-text mt-8 mb-6 text-text-body">
        {t('title.votingConfiguration')}
      </p>

      <DaoInfoCards cards={reviewCards} wrap />

      <div
        className="mt-8 flex flex-row flex-wrap items-center gap-6"
        ref={togglePreviewRef}
      >
        <div className="flex flex-row items-center gap-2">
          <Checkbox checked={showingPreview} onClick={togglePreview} />
          <p className="body-text cursor-pointer" onClick={togglePreview}>
            {t('button.showInstantiateMessage')}
          </p>
        </div>

        {showingPreview && (
          <div className="flex flex-row items-center gap-2">
            <Checkbox
              checked={decodeModuleMessages}
              onClick={() => setDecodeModuleMessages((d) => !d)}
            />

            <p
              className="body-text cursor-pointer"
              onClick={() => setDecodeModuleMessages((d) => !d)}
            >
              {t('button.withDecodedModuleMessages')}
            </p>
          </div>
        )}
      </div>

      {showingPreview && !!previewJson && (
        <div className="mt-4">
          <CosmosMessageDisplay value={previewJson} />
        </div>
      )}
      {!!previewError && (
        <p className="mt-4 text-text-interactive-error">{previewError}</p>
      )}
    </>
  )
}
