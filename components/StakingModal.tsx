import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { Duration } from '@dao-dao/types/contracts/cw3-dao'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from '@heroicons/react/outline'
import { useSigningClient } from 'contexts/cosmwasm'
import { secondsToHms } from 'pages/dao/create'
import {
  ChangeEventHandler,
  Dispatch,
  MouseEventHandler,
  ReactNode,
  SetStateAction,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { SetterOrUpdater, useRecoilValue, useSetRecoilState } from 'recoil'
import { daoSelector, unstakingDuration } from 'selectors/daos'
import {
  walletStakedTokenBalance,
  walletTokenBalance,
  walletTokenBalanceUpdateCountAtom,
} from 'selectors/treasury'
import { cleanChainError } from 'util/cleanChainError'
import {
  convertDenomToMicroDenom,
  convertMicroDenomToDenom,
} from 'util/conversion'
import { defaultExecuteFee } from 'util/fee'

export enum StakingMode {
  Stake,
  Unstake,
  Claim,
}

function stakingModeString(mode: StakingMode) {
  switch (mode) {
    case StakingMode.Stake:
      return 'stake'
    case StakingMode.Unstake:
      return 'unstake'
    case StakingMode.Claim:
      return 'claim'
    default:
      return 'internal error'
  }
}

function ModeButton({
  onClick,
  active,
  children,
}: {
  onClick: MouseEventHandler<HTMLButtonElement>
  active: boolean
  children: ReactNode
}) {
  return (
    <button
      className={
        'btn btn-sm rounded-md bg-base-300 text-primary normal-case border-none font-normal' +
        (!active ? ' bg-transparent hover:bg-base-300' : ' hover:bg-base-200')
      }
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function AmountSelector({
  onIncrease,
  onDecrease,
  onChange,
  amount,
  max,
}: {
  onIncrease: MouseEventHandler<HTMLButtonElement>
  onDecrease: MouseEventHandler<HTMLButtonElement>
  onChange: ChangeEventHandler<HTMLInputElement>
  amount: string
  max: number
}) {
  return (
    <div className="form-control mt-2">
      <div className="relative">
        <button
          className={
            'absolute top-0 left-0 rounded-r-none btn btn-primary bg-base-300 hover:bg-base-200 border-none text-primary' +
            (Number(amount) <= 1 ? ' btn-disabled' : '')
          }
          onClick={onDecrease}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <input
          type="number"
          className="appearance-none w-full pr-16 pl-16 input input-primary input-bordered bg-base-300 border-none"
          value={amount}
          onChange={onChange}
        />
        <button
          className={
            'absolute top-0 right-0 rounded-l-none btn btn-primary bg-base-300 hover:bg-base-200 border-none text-primary' +
            (Number(amount) + 1 >= max ? ' btn-disabled' : '')
          }
          onClick={onIncrease}
        >
          <ChevronRightIcon className="w-4 h-4" />{' '}
        </button>
      </div>
    </div>
  )
}

function PercentSelector({
  max,
  amount,
  setAmount,
}: {
  max: number
  amount: number
  setAmount: Dispatch<SetStateAction<string>>
}) {
  const active = (p: number) => max * p == amount
  const getClassName = (p: number) =>
    'btn btn-sm rounded-md bg-base-300 border-none text-primary hover:bg-base-200 font-normal' +
    (active(p) ? '' : ' bg-transparent')
  const getOnClick = (p: number) => () => {
    setAmount(
      (p * max)
        .toLocaleString(undefined, { maximumFractionDigits: 6 })
        .replace(',', '')
    )
  }

  return (
    <div className="grid grid-cols-5 gap-1">
      <button className={getClassName(0.1)} onClick={getOnClick(0.1)}>
        10%
      </button>
      <button className={getClassName(0.25)} onClick={getOnClick(0.25)}>
        25%
      </button>
      <button className={getClassName(0.5)} onClick={getOnClick(0.5)}>
        50%
      </button>
      <button className={getClassName(0.75)} onClick={getOnClick(0.75)}>
        75%
      </button>
      <button className={getClassName(1)} onClick={getOnClick(1)}>
        100%
      </button>
    </div>
  )
}

function durationIsNonZero(d: Duration) {
  if ('height' in d) {
    return d.height !== 0
  }
  return d.time !== 0
}

export function humanReadableDuration(d: Duration) {
  if ('height' in d) {
    return `${d.height} blocks`
  }
  return `${secondsToHms(d.time.toString())}`
}

function executeUnstakeAction(
  denomAmount: string,
  stakingAddress: string,
  signingClient: SigningCosmWasmClient | null,
  walletAddress: string,
  setLoading: SetterOrUpdater<boolean>,
  onDone: Function
) {
  if (!signingClient) {
    toast.error('Please connect your wallet')
  }
  const amount = convertDenomToMicroDenom(denomAmount)
  setLoading(true)
  signingClient
    ?.execute(
      walletAddress,
      stakingAddress,
      {
        unstake: {
          amount,
        },
      },
      defaultExecuteFee
    )
    .catch((err) => {
      toast.error(cleanChainError(err.message))
    })
    .finally(() => {
      setLoading(false)
      toast.success(`Unstaked ${denomAmount} tokens`)
      onDone()
    })
}

function executeStakeAction(
  denomAmount: string,
  tokenAddress: string,
  stakingAddress: string,
  signingClient: SigningCosmWasmClient | null,
  walletAddress: string,
  setLoading: SetterOrUpdater<boolean>,
  onDone: Function
) {
  if (!signingClient) {
    toast.error('Please connect your wallet')
  }
  const amount = convertDenomToMicroDenom(denomAmount)
  setLoading(true)
  signingClient
    ?.execute(
      walletAddress,
      tokenAddress,
      {
        send: {
          owner: walletAddress,
          contract: stakingAddress,
          amount: amount,
          msg: btoa('{"stake": {}}'),
        },
      },
      defaultExecuteFee
    )
    .catch((err) => {
      toast.error(cleanChainError(err.message))
    })
    .finally(() => {
      setLoading(false)
      toast.success(`Staked ${denomAmount} tokens`)
      onDone()
    })
}

function executeClaimAction(
  denomAmount: number,
  stakingAddress: string,
  signingClient: SigningCosmWasmClient | null,
  walletAddress: string,
  setLoading: SetterOrUpdater<boolean>,
  onDone: Function
) {
  if (!signingClient) {
    toast.error('Please connect your wallet')
  }
  setLoading(true)
  signingClient
    ?.execute(
      walletAddress,
      stakingAddress,
      {
        claim: {},
      },
      defaultExecuteFee
    )
    .catch((err) => {
      toast.error(cleanChainError(err.message))
    })
    .finally(() => {
      setLoading(false)
      toast.success(`Claimed ${denomAmount} tokens`)
      onDone()
    })
}

export function StakingModal({
  defaultMode,
  contractAddress,
  tokenSymbol,
  claimAmount,
  onClose,
  beforeExecute,
  afterExecute,
}: {
  defaultMode: StakingMode
  contractAddress: string
  tokenSymbol: string
  claimAmount: number
  onClose: MouseEventHandler<HTMLButtonElement>
  beforeExecute: Function
  afterExecute: Function
}) {
  const [mode, setMode] = useState(defaultMode)
  const [amount, setAmount] = useState('0')

  const { signingClient, walletAddress } = useSigningClient()
  const [loading, setLoading] = useState(false)

  const daoInfo = useRecoilValue(daoSelector(contractAddress))
  const govTokenBalance = convertMicroDenomToDenom(
    useRecoilValue(walletTokenBalance(daoInfo?.gov_token)).amount
  )
  const stakedGovTokenBalance = convertMicroDenomToDenom(
    useRecoilValue(walletStakedTokenBalance(daoInfo?.staking_contract)).amount
  )
  const unstakeDuration = useRecoilValue(
    unstakingDuration(daoInfo.staking_contract)
  )
  const setWalletTokenBalanceUpdateCount = useSetRecoilState(
    walletTokenBalanceUpdateCountAtom(walletAddress)
  )

  const maxTx = Number(
    mode === StakingMode.Stake ? govTokenBalance : stakedGovTokenBalance
  )
  const canClaim = claimAmount !== 0

  const invalidAmount = (): string => {
    if (amount === '') {
      return 'Unspecified amount'
    }
    if (Number(amount) > maxTx || Number(amount) <= 0) {
      return `Invalid amount`
    }
    return ''
  }
  const walletDisconnected = (): string => {
    if (!signingClient || !walletAddress) {
      return 'Please connect your wallet'
    }
    return ''
  }

  const error = invalidAmount() || walletDisconnected()
  const ready = !error

  const ActionButton = ({ ready }: { ready: boolean }) => {
    return (
      <button
        className={
          'btn btn-sm rounded-md bg-primary text-primary-content normal-case border-none font-normal hover:bg-primary-focus' +
          (!ready ? ' btn-disabled' : '') +
          (loading ? ' loading' : '')
        }
        onClick={() => {
          beforeExecute()
          if (mode === StakingMode.Stake) {
            executeStakeAction(
              amount,
              daoInfo.gov_token,
              daoInfo.staking_contract,
              signingClient,
              walletAddress,
              setLoading,
              () => {
                setAmount('0')
                // New staking balances will not appear until the next block has been added.
                setTimeout(() => {
                  setWalletTokenBalanceUpdateCount((p) => p + 1)
                  afterExecute()
                }, 6000)
              }
            )
          } else if (mode === StakingMode.Unstake) {
            executeUnstakeAction(
              amount,
              daoInfo.staking_contract,
              signingClient,
              walletAddress,
              setLoading,
              () => {
                setAmount('0')
                // New staking balances will not appear until the next block has been added.
                setTimeout(() => {
                  setWalletTokenBalanceUpdateCount((p) => p + 1)
                  afterExecute()
                }, 6500)
              }
            )
          } else if (mode === StakingMode.Claim) {
            executeClaimAction(
              convertMicroDenomToDenom(claimAmount),
              daoInfo.staking_contract,
              signingClient,
              walletAddress,
              setLoading,
              () => {
                setTimeout(() => {
                  setWalletTokenBalanceUpdateCount((p) => p + 1)
                  afterExecute()
                }, 6500)
              }
            )
          }
        }}
      >
        <span className="capitalize mr-1">{stakingModeString(mode)}</span>{' '}
        tokens
      </button>
    )
  }

  return (
    <div className="bg-base-100 fixed bottom-0 right-0 m-3 border border-base-300 rounded-lg shadow max-w-sm">
      <div className="py-3 px-6 mt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Manage staking</h1>
          <button
            className="hover:bg-base-300 rounded-full p-1"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 mb-2">
          <ModeButton
            onClick={() => setMode(StakingMode.Stake)}
            active={mode === StakingMode.Stake}
          >
            Staking
          </ModeButton>
          <ModeButton
            onClick={() => setMode(StakingMode.Unstake)}
            active={mode === StakingMode.Unstake}
          >
            Unstaking
          </ModeButton>
          {canClaim && (
            <ModeButton
              onClick={() => setMode(StakingMode.Claim)}
              active={mode === StakingMode.Claim}
            >
              Claiming
            </ModeButton>
          )}
        </div>
      </div>
      <hr />
      {mode !== StakingMode.Claim && (
        <>
          <div className="py-3 px-6 flex flex-col mt-3">
            <h2 className="font-medium mb-3">Choose your token amount</h2>
            <AmountSelector
              amount={amount}
              onIncrease={() => setAmount((a) => (Number(a) + 1).toString())}
              onDecrease={() => setAmount((a) => (Number(a) - 1).toString())}
              onChange={(e) => setAmount(e?.target?.value)}
              max={maxTx}
            />
            {Number(amount) > maxTx && (
              <span className="text-xs text-error mt-1 ml-1">
                Can{"'"}t {stakingModeString(mode)} more ${tokenSymbol} than you
                own
              </span>
            )}
            <span className="text-xs text-secondary font-mono mt-2">
              Max available {maxTx} ${tokenSymbol}
            </span>
            <div className="mt-3">
              <PercentSelector
                amount={Number(amount)}
                setAmount={setAmount}
                max={maxTx}
              />
            </div>
          </div>
          {mode === StakingMode.Unstake && durationIsNonZero(unstakeDuration) && (
            <>
              <hr className="mt-3" />
              <div className="py-3 px-6 mt-3">
                <h2 className="font-medium text-md">
                  Unstaking period: {humanReadableDuration(unstakeDuration)}
                </h2>
                <p className="text-sm mt-3">
                  There will be {humanReadableDuration(unstakeDuration)} between
                  the time you decide to unstake your tokens and the time you
                  can redeem them.
                </p>
              </div>
            </>
          )}
          <div className="px-3 py-6 text-right">
            <div
              className={!ready ? 'tooltip tooltip-left' : ''}
              data-tip={error}
            >
              <ActionButton ready={ready} />
            </div>
          </div>
        </>
      )}
      {mode === StakingMode.Claim && (
        <>
          <div className="py-3 px-6 flex flex-col mt-3">
            <h2 className="font-medium">
              {convertMicroDenomToDenom(claimAmount)} ${tokenSymbol} avaliable
            </h2>
            <p className="text-sm mt-3 mb-3">
              Claim them to increase your voting power.
            </p>
            <div className="px-3 py-6 text-right">
              <div
                className={walletDisconnected() ? 'tooltip tooltip-left' : ''}
                data-tip={walletDisconnected()}
              >
                <ActionButton ready={!walletDisconnected()} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
