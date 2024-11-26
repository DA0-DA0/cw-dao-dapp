import { ComponentType } from 'react'

import { HugeDecimal } from '@dao-dao/math'

import { Entity } from '../entity'
import { LoadingData } from '../misc'
import { GenericToken } from '../token'
import { ButtonLinkProps } from './Buttonifier'

export type DaoMemberCardProps = {
  address: string
  balanceLabel: string
  balance: LoadingData<{
    amount: number | HugeDecimal
    token?: GenericToken
  }>
  votingPowerPercent: LoadingData<number>
  loadingEntity: LoadingData<Entity>
  ButtonLink: ComponentType<ButtonLinkProps>
}

export type StatefulDaoMemberCardProps = Omit<
  DaoMemberCardProps,
  'loadingEntity' | 'ButtonLink'
>
