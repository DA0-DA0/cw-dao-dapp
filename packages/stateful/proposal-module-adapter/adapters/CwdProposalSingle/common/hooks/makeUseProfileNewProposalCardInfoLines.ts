import {
  AttachMoney,
  ChangeCircleOutlined,
  FlagOutlined,
  MultilineChart,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValue } from 'recoil'

import { Cw20BaseSelectors } from '@dao-dao/state'
import { ProfileNewProposalCardInfoLine } from '@dao-dao/stateless'
import {
  DepositInfoSelector,
  DepositRefundPolicy,
  IProposalModuleAdapterCommonOptions,
} from '@dao-dao/types'
import {
  convertMicroDenomToDenomWithDecimals,
  nativeTokenDecimals,
  nativeTokenLabel,
} from '@dao-dao/utils'

import { configSelector } from '../../contracts/CwdProposalSingle.common.recoil'
import { useProcessTQ } from './useProcessTQ'

export const makeUseProfileNewProposalCardInfoLines =
  ({
    options,
    depositInfoSelector,
  }: {
    options: IProposalModuleAdapterCommonOptions
    depositInfoSelector: DepositInfoSelector
  }) =>
  (): ProfileNewProposalCardInfoLine[] => {
    const { t } = useTranslation()

    const config = useRecoilValue(
      configSelector({
        contractAddress: options.proposalModule.address,
      })
    )
    const depositInfo = useRecoilValue(depositInfoSelector)

    const processTQ = useProcessTQ()
    const { threshold, quorum } = processTQ(config.threshold)

    const cw20DepositTokenInfo = useRecoilValue(
      depositInfo?.denom && 'cw20' in depositInfo.denom
        ? Cw20BaseSelectors.tokenInfoSelector({
            contractAddress: depositInfo.denom.cw20,
            params: [],
          })
        : constSelector(undefined)
    )
    const depositDecimals = depositInfo?.denom
      ? 'cw20' in depositInfo.denom && cw20DepositTokenInfo
        ? cw20DepositTokenInfo.decimals
        : 'native' in depositInfo.denom
        ? nativeTokenDecimals(depositInfo.denom.native) ?? 0
        : 0
      : 0
    const depositSymbol = depositInfo?.denom
      ? 'cw20' in depositInfo.denom && cw20DepositTokenInfo
        ? cw20DepositTokenInfo.symbol
        : 'native' in depositInfo.denom
        ? nativeTokenLabel(depositInfo.denom.native)
        : undefined
      : undefined

    const proposalDeposit = depositInfo?.amount
      ? convertMicroDenomToDenomWithDecimals(
          depositInfo.amount,
          depositDecimals
        )
      : 0

    return [
      {
        Icon: MultilineChart,
        label: t('title.passingThreshold'),
        value: threshold.display,
      },
      ...(quorum
        ? [
            {
              Icon: FlagOutlined,
              label: t('title.quorum'),
              value: quorum.display,
            },
          ]
        : []),
      {
        Icon: AttachMoney,
        label: t('title.deposit'),
        value:
          proposalDeposit > 0
            ? proposalDeposit.toLocaleString(undefined, {
                maximumFractionDigits: depositDecimals,
              }) +
              ' $' +
              depositSymbol
            : t('info.none'),
      },
      ...(depositInfo && proposalDeposit > 0
        ? [
            {
              Icon: ChangeCircleOutlined,
              label: t('title.depositRefunds'),
              value: t(`depositRefundPolicy.${depositInfo.refund_policy}`),
              valueClassName:
                depositInfo.refund_policy !== DepositRefundPolicy.Always
                  ? '!border-component-badge-error'
                  : undefined,
            },
          ]
        : []),
    ]
  }
