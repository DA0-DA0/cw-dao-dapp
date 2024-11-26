import { ComponentType } from 'react'

import { HugeDecimal } from '@dao-dao/math'

import { RegistrationResponse } from '../contracts/DaoVoteDelegation'
import { DelegateWithEntity, DelegationWithEntity } from '../delegation'
import { LoadingDataWithError } from '../misc'
import { TransProps } from './Trans'

export type DelegationForm = {
  delegate: string
  percent: string
}

export type StatelessDaoVoteDelegationCardProps = {
  /**
   * Optional container class name.
   */
  className?: string
  /**
   * Total voting power in the DAO.
   */
  totalVotingPower: LoadingDataWithError<HugeDecimal>
  /**
   * Delegates.
   */
  delegates: LoadingDataWithError<DelegateWithEntity[]>
  /**
   * Delegations.
   */
  delegations: LoadingDataWithError<DelegationWithEntity[]>
  /**
   * The current wallet's delegate registration info.
   */
  registration: LoadingDataWithError<RegistrationResponse>
  /**
   * Whether or not the delegate registration/unregistration is loading.
   */
  loadingRegistration: boolean
  /**
   * Function to register/unregister as a delegate.
   */
  updateRegistration: (register: boolean) => Promise<void>
  /**
   * Whether or not delegation is loading.
   */
  loadingDelegate: boolean
  /**
   * Function to delegate.
   */
  delegate: (data: DelegationForm) => Promise<void>
  /**
   * Whether or not undelegation is loading.
   */
  loadingUndelegate: boolean
  /**
   * Function to undelegate.
   */
  undelegate: (delegate: string) => Promise<void>
  /**
   * Stateful Trans component.
   */
  Trans: ComponentType<TransProps>
}

export type StatefulDaoVoteDelegationCardProps = Omit<
  StatelessDaoVoteDelegationCardProps,
  | 'totalVotingPower'
  | 'delegates'
  | 'delegations'
  | 'registration'
  | 'loadingRegistration'
  | 'updateRegistration'
  | 'loadingDelegate'
  | 'delegate'
  | 'loadingUndelegate'
  | 'undelegate'
  | 'Trans'
>
