import {
  CwVestingStakeEvent,
  CwVestingStakeHistory,
  ValidatorSlash,
  VestingValidatorSlash,
  VestingValidatorWithSlashes,
} from '@dao-dao/types'

// Get the slashed staked and unstaking amounts for a validator based on
// a slash event.
export const getSlashedStakedUnstaking = (
  stakeEvents: CwVestingStakeEvent[],
  unbondingDurationSeconds: number,
  validator: string,
  validatorSlashes: ValidatorSlash[],
  {
    infractionBlockHeight,
    registeredBlockHeight,
    registeredBlockTimeUnixMs,
    slashFactor,
    effectiveFraction,
  }: ValidatorSlash
): { staked: number; unstaking: number } => {
  // Slashes before the current slash.
  const previousSlashes = validatorSlashes.filter(
    (slash) =>
      Number(slash.registeredBlockHeight) < Number(registeredBlockHeight)
  )

  // Combine stake events and slashes, and sort ascending by block height,
  // so they are applied in order of occurrence.
  const stakeEventsAndSlashes = [...stakeEvents, ...previousSlashes].sort(
    (a, b) => {
      const aBlockHeight =
        'registeredBlockHeight' in a ? a.registeredBlockHeight : a.blockHeight
      const bBlockHeight =
        'registeredBlockHeight' in b ? b.registeredBlockHeight : b.blockHeight
      return Number(aBlockHeight) - Number(bBlockHeight)
    }
  )

  // Total staked
  const staked = stakeEventsAndSlashes.reduce((acc, event) => {
    // Apply past slash.
    if ('registeredBlockHeight' in event) {
      return acc * (1 - Number(event.effectiveFraction))
      // Apply stake event.
    } else {
      return Number(event.blockTimeUnixMs) <= Number(registeredBlockTimeUnixMs)
        ? (event.type === 'delegate' && event.validator === validator) ||
          (event.type === 'redelegate' && event.toValidator === validator)
          ? // Add stakes that occur before the slash was registered.
            acc + Number(event.amount)
          : (event.type === 'undelegate' && event.validator === validator) ||
              (event.type === 'redelegate' && event.fromValidator === validator)
            ? // Subtract unstakes that start before the slash was registered.
              acc - Number(event.amount)
            : acc
        : acc
    }
  }, 0)

  // Total undelegating/redelegating. These do not take into account past
  // slashes because slashes are applied to the initial balance of an
  // undelegation or redelegation, not the current balance.
  const unstaking = stakeEvents.reduce(
    (acc, event) =>
      // Add those that start after the infraction but before the slash was
      // registered and have not yet finished by the time the slash was
      // registered.
      Number(event.blockHeight) >= Number(infractionBlockHeight) &&
      Number(event.blockHeight) <= Number(registeredBlockHeight) &&
      Number(event.blockTimeUnixMs) + unbondingDurationSeconds * 1000 >
        Number(registeredBlockTimeUnixMs) &&
      ((event.type === 'undelegate' && event.validator === validator) ||
        (event.type === 'redelegate' && event.fromValidator === validator))
        ? acc + Number(event.amount)
        : acc,
    0
  )

  // Calculate the amount slashed of the staked and unstaking amounts. The
  // Cosmos SDK truncates the slashed amount after the slash fraction is
  // applied, so we do the same here. Staked tokens use the `effectiveFraction`,
  // whereas unstaking tokens use the `slashFactor`.
  return {
    staked: Math.trunc(staked * Number(effectiveFraction)),
    unstaking: Math.trunc(unstaking * Number(slashFactor)),
  }
}

// Get the slash events for a vesting contract, calculating actual slash and
// un/registered slash amounts.
export const getVestingValidatorSlashes = (
  stakeHistory: CwVestingStakeHistory,
  unbondingDurationSeconds: number,
  validatorSlashes: {
    validator: string
    slashes: ValidatorSlash[]
  }[]
): VestingValidatorWithSlashes[] =>
  // For each validator slash, get the total amount staked and unstaking at the
  // time of the slash and then compute the slashed amount using the slash
  // factor.
  validatorSlashes.flatMap(
    ({
      validator: validatorOperatorAddress,
      slashes: _slashes,
    }): VestingValidatorWithSlashes => {
      const slashes = _slashes.flatMap((slash): VestingValidatorSlash[] => {
        const slashed = getSlashedStakedUnstaking(
          stakeHistory.stakeEvents,
          unbondingDurationSeconds,
          validatorOperatorAddress,
          _slashes,
          slash
        )

        // Actual amount slashed.
        const { staked: stakedSlashed, unstaking: unstakingSlashed } = slashed
        if (stakedSlashed === 0 && unstakingSlashed === 0) {
          return []
        }

        // Registered slashes.
        const registeredSlashes =
          stakeHistory.slashRegistrations.filter(
            (registration) =>
              registration.validator === validatorOperatorAddress &&
              registration.time ===
                // milliseconds to nanoseconds
                BigInt(Number(slash.registeredBlockTimeUnixMs) * 1e6).toString()
          ) ?? []
        const registeredStaked = registeredSlashes.reduce(
          (acc, slash) =>
            acc + (!slash.duringUnbonding ? Number(slash.amount) : 0),
          0
        )
        const registeredUnstaking = registeredSlashes.reduce(
          (acc, slash) =>
            acc + (slash.duringUnbonding ? Number(slash.amount) : 0),
          0
        )

        const unregisteredStaked = stakedSlashed - registeredStaked
        const unregisteredUnstaking = unstakingSlashed - registeredUnstaking

        return [
          ...(stakedSlashed > 0
            ? [
                {
                  timeMs: Number(slash.registeredBlockTimeUnixMs),
                  amount: stakedSlashed,
                  unregisteredAmount: unregisteredStaked,
                  duringUnbonding: false,
                },
              ]
            : []),
          ...(unstakingSlashed > 0
            ? [
                {
                  timeMs: Number(slash.registeredBlockTimeUnixMs),
                  amount: unstakingSlashed,
                  unregisteredAmount: unregisteredUnstaking,
                  duringUnbonding: true,
                },
              ]
            : []),
        ]
      })

      return {
        validatorOperatorAddress,
        slashes,
      }
    }
  )
