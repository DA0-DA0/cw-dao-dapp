import { describe, expect, it } from 'vitest'

import {
  CwVestingSlashRegistration,
  CwVestingStakeEvent,
  ValidatorSlash,
  VestingValidatorSlash,
} from '@dao-dao/types'

import {
  getSlashedStakedUnstaking,
  getVestingValidatorSlashes,
} from './vesting'

const UNBONDING_DURATION_SECONDS = 1000
const VALIDATOR1 = 'validator1'
const VALIDATOR2 = 'validator2'

const makeDelegation = ({
  block = 1,
  validator = VALIDATOR1,
  amount = 100,
}: {
  block?: number
  validator?: string
  amount?: number
} = {}): CwVestingStakeEvent => ({
  blockHeight: block.toString(),
  blockTimeUnixMs: block.toString(),
  type: 'delegate',
  validator,
  amount: amount.toString(),
})

const makeUndelegation = ({
  block = 1,
  validator = VALIDATOR1,
  amount = 100,
}: {
  block?: number
  validator?: string
  amount?: number
} = {}): CwVestingStakeEvent => ({
  blockHeight: block.toString(),
  blockTimeUnixMs: block.toString(),
  type: 'undelegate',
  validator,
  amount: amount.toString(),
})

const makeRedelegation = ({
  block = 1,
  fromValidator = VALIDATOR1,
  toValidator = VALIDATOR2,
  amount = 100,
}: {
  block?: number
  fromValidator?: string
  toValidator?: string
  amount?: number
} = {}): CwVestingStakeEvent => ({
  blockHeight: block.toString(),
  blockTimeUnixMs: block.toString(),
  type: 'redelegate',
  fromValidator,
  toValidator,
  amount: amount.toString(),
})

const makeSlashRegistration = ({
  validator = VALIDATOR1,
  timeMs = 1,
  amount = 100,
  duringUnbonding = false,
}: {
  validator?: string
  timeMs?: number
  amount?: number
  duringUnbonding?: boolean
} = {}): CwVestingSlashRegistration => ({
  validator,
  // Milliseconds to nanoseconds.
  time: (timeMs * 1e6).toString(),
  amount: amount.toString(),
  duringUnbonding,
})

const makeSlash = ({
  registeredBlock = 2,
  infractionBlock = 1,
  slashFactor = 0.1,
  amountSlashed = 100,
}: {
  registeredBlock?: number
  infractionBlock?: number
  slashFactor?: number
  amountSlashed?: number
} = {}): ValidatorSlash => ({
  registeredBlockHeight: registeredBlock.toString(),
  registeredBlockTimeUnixMs: registeredBlock.toString(),
  infractionBlockHeight: infractionBlock.toString(),
  slashFactor: slashFactor.toString(),
  amountSlashed: amountSlashed.toString(),
  effectiveFraction: slashFactor.toString(),
  stakedTokensBurned: amountSlashed.toString(),
})

const makeVestingValidatorSlash = ({
  timeMs = 2,
  amount = 100,
  unregisteredAmount = 0,
  duringUnbonding = false,
}: Partial<VestingValidatorSlash> = {}): VestingValidatorSlash => ({
  timeMs,
  amount,
  unregisteredAmount,
  duringUnbonding,
})

describe('getSlashedStakedUnstaking', () => {
  // 1 slash, no stake events
  it('returns 0 when no events', () => {
    const slash = makeSlash()

    expect(
      getSlashedStakedUnstaking(
        [],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 0,
      unstaking: 0,
    })
  })

  // 1. delegate
  // 2. infraction
  // 3. slash infraction at 2
  it('returns delegated slash', () => {
    const slash = makeSlash({
      registeredBlock: 3,
      infractionBlock: 2,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 10,
      unstaking: 0,
    })
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate
  // 4. slash infraction at 2
  it('returns undelegating slash', () => {
    const slash = makeSlash({
      registeredBlock: 3,
      infractionBlock: 2,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 3,
            amount: 100,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 0,
      unstaking: 10,
    })
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate some
  // 4. slash infraction at 2
  it('returns delegated and undelegating slash', () => {
    const slash = makeSlash({
      registeredBlock: 3,
      infractionBlock: 2,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 3,
            amount: 30,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 7,
      unstaking: 3,
    })
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate some
  // 4. redelegate some
  // 5. slash infraction at 2
  it('returns delegated and undelegating slash with a redelegation', () => {
    const slash = makeSlash({
      registeredBlock: 4,
      infractionBlock: 2,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 3,
            amount: 30,
          }),
          makeRedelegation({
            block: 4,
            amount: 10,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 6,
      unstaking: 4,
    })
  })

  // 1. delegate
  // 2. undelegate some
  // 3. redelegate the rest
  // 4. infraction
  // 5. slash infraction at 4
  it('returns no slash if undelegate and redelegate before slash', () => {
    const slash = makeSlash({
      registeredBlock: 5,
      infractionBlock: 4,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 2,
            amount: 30,
          }),
          makeRedelegation({
            block: 3,
            amount: 70,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 0,
      unstaking: 0,
    })
  })

  // 1. delegate
  // 2. undelegate some
  // 3. redelegate the rest
  // 4. infraction after undelegation and redelegation are finished
  // 5. slash infraction at 4
  it('returns no slash if undelegate and redelegate finish before slash', () => {
    const slash = makeSlash({
      registeredBlock: UNBONDING_DURATION_SECONDS * 1000 * 2,
      infractionBlock: 2,
      slashFactor: 0.1,
    })

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 3,
            amount: 30,
          }),
          makeRedelegation({
            block: 4,
            amount: 70,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [slash],
        slash
      )
    ).toEqual({
      staked: 0,
      unstaking: 0,
    })
  })

  // 1. delegate
  // 2. infraction
  // 3. infraction
  // 4. undelegate some
  // 5. redelegate some
  // 6. slash infraction at 2 of 10%
  // 7. delegate more
  // 8. slash infraction at 3 of 50%
  it('returns delegated and undelegating slashes taking into account previous slashes', () => {
    const slash = makeSlash({
      registeredBlock: 8,
      infractionBlock: 3,
      slashFactor: 0.5,
    })

    // First 60 delegated and 40 un/re-delegating get slashed 10%, bringing them
    // to 54 and 36. Then, 200 delegated makes it 254 delegated and 36
    // un/re-delegating, which get slashed 50%. The total delegated slashed due
    // to the second slash is 254 * 0.5 = 127, and the total unstaking slashed
    // is 40 * 0.5 = 20 (since unstaking slashes use the initial balance, not
    // taking into account other slashes).

    expect(
      getSlashedStakedUnstaking(
        [
          makeDelegation({
            block: 1,
            amount: 100,
          }),
          makeUndelegation({
            block: 4,
            amount: 30,
          }),
          makeRedelegation({
            block: 5,
            amount: 10,
          }),
          makeDelegation({
            block: 7,
            amount: 200,
          }),
        ],
        UNBONDING_DURATION_SECONDS,
        VALIDATOR1,
        [
          makeSlash({
            registeredBlock: 6,
            infractionBlock: 2,
            slashFactor: 0.1,
          }),
          slash,
        ],
        slash
      )
    ).toEqual({
      staked: 127,
      unstaking: 20,
    })
  })
})

describe('getVestingValidatorSlashes', () => {
  // no stake events, no slashes
  it('returns empty array when no events nor slashes', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        []
      )
    ).toEqual([])
  })

  // 1 delegation, no slashes
  it('returns empty array when no slashes', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [makeDelegation()],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        []
      )
    ).toEqual([])
  })

  // 1. delegate
  // 2. infraction
  // 3. slash infraction at 2
  it('returns an unregistered delegated slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 10,
            duringUnbonding: false,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate
  // 4. slash infraction at 2
  it('returns an unregistered undelegating slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 3,
              amount: 100,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 10,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. redelegate
  // 4. slash infraction at 2
  it('returns an unregistered undelegating slash from a redelegation', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeRedelegation({
              block: 3,
              amount: 100,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 10,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate some
  // 4. slash infraction at 2
  it('returns unregistered delegated and undelegating slashes', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 3,
              amount: 20,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 8,
            unregisteredAmount: 8,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 2,
            unregisteredAmount: 2,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. redelegate some
  // 4. slash infraction at 2
  it('returns unregistered delegated and undelegating slashes from redelegation', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeRedelegation({
              block: 3,
              amount: 20,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 8,
            unregisteredAmount: 8,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 2,
            unregisteredAmount: 2,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. slash infraction at 2
  // 4. register slash
  it('returns a registered delegated slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
          ],
          slashRegistrations: [
            makeSlashRegistration({
              timeMs: 3,
              amount: 10,
              duringUnbonding: false,
            }),
          ],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 0,
            duringUnbonding: false,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate
  // 4. slash infraction at 2
  // 5. register slash
  it('returns a registered undelegating slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 3,
              amount: 100,
            }),
          ],
          slashRegistrations: [
            makeSlashRegistration({
              timeMs: 3,
              amount: 10,
              duringUnbonding: true,
            }),
          ],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 0,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate some
  // 4. slash infraction at 2
  // 5. register slash
  it('returns registered delegated and undelegating slashes', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 3,
              amount: 20,
            }),
          ],
          slashRegistrations: [
            makeSlashRegistration({
              timeMs: 3,
              amount: 8,
              duringUnbonding: false,
            }),
            makeSlashRegistration({
              timeMs: 3,
              amount: 2,
              duringUnbonding: true,
            }),
          ],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 8,
            unregisteredAmount: 0,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 2,
            unregisteredAmount: 0,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. redelegate
  // 4. slash infraction at 2
  // 5. register slash
  it('returns a registered undelegating slash from a redelegation', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeRedelegation({
              block: 3,
              amount: 100,
            }),
          ],
          slashRegistrations: [
            makeSlashRegistration({
              timeMs: 3,
              amount: 10,
              duringUnbonding: true,
            }),
          ],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 10,
            unregisteredAmount: 0,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. undelegate some
  // 4. slash infraction at 2
  // 5. register slash
  it('returns registered delegated and undelegating slashes from a redelegation', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeRedelegation({
              block: 3,
              amount: 20,
            }),
          ],
          slashRegistrations: [
            makeSlashRegistration({
              timeMs: 3,
              amount: 8,
              duringUnbonding: false,
            }),
            makeSlashRegistration({
              timeMs: 3,
              amount: 2,
              duringUnbonding: true,
            }),
          ],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 3,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 8,
            unregisteredAmount: 0,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 3,
            amount: 2,
            unregisteredAmount: 0,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })

  // 1. delegate
  // 2. undelegate some
  // 3. redelegate the rest
  // 4. infraction
  // 5. slash infraction at 4
  it('returns no slash if undelegate and redelegate before slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 2,
              amount: 40,
            }),
            makeRedelegation({
              block: 3,
              amount: 60,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 5,
                infractionBlock: 4,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [],
      },
    ])
  })

  // 1. delegate
  // 2. undelegate some
  // 3. redelegate the rest
  // 4. infraction after undelegation and redelegation are finished
  // 5. slash infraction at 4
  it('returns no slash if undelegate and redelegate finish before slash', () => {
    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 3,
              amount: 40,
            }),
            makeRedelegation({
              block: 4,
              amount: 60,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: UNBONDING_DURATION_SECONDS * 1000 * 2,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [],
      },
    ])
  })

  // 1. delegate
  // 2. infraction
  // 3. infraction
  // 4. undelegate some
  // 5. redelegate some
  // 6. slash infraction at 2 of 10%
  // 7. delegate more
  // 8. slash infraction at 3 of 50%
  it('returns delegated and undelegating unregistered slashes taking into account previous slashes', () => {
    // First 60 delegated and 40 un/re-delegating get slashed 10%, bringing them
    // to 54 and 36. Then, 200 delegated makes it 254 delegated and 36
    // un/re-delegating, which get slashed 50%. The total slashed due to the
    // first slash is 6 delegated and 4 undelegating. The total slashed due to
    // the second second slash is 127 delegated and 20 undelegating (since
    // slashes on undelegations only take into account initial balance
    // unstaking, not current balance unstaking).

    expect(
      getVestingValidatorSlashes(
        {
          stakeEvents: [
            makeDelegation({
              block: 1,
              amount: 100,
            }),
            makeUndelegation({
              block: 4,
              amount: 30,
            }),
            makeRedelegation({
              block: 5,
              amount: 10,
            }),
            makeDelegation({
              block: 7,
              amount: 200,
            }),
          ],
          slashRegistrations: [],
        },
        UNBONDING_DURATION_SECONDS,
        [
          {
            validator: VALIDATOR1,
            slashes: [
              makeSlash({
                registeredBlock: 6,
                infractionBlock: 2,
                slashFactor: 0.1,
              }),
              makeSlash({
                registeredBlock: 8,
                infractionBlock: 3,
                slashFactor: 0.5,
              }),
            ],
          },
        ]
      )
    ).toEqual([
      {
        validatorOperatorAddress: VALIDATOR1,
        slashes: [
          makeVestingValidatorSlash({
            timeMs: 6,
            amount: 6,
            unregisteredAmount: 6,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 6,
            amount: 4,
            unregisteredAmount: 4,
            duringUnbonding: true,
          }),
          makeVestingValidatorSlash({
            timeMs: 8,
            amount: 127,
            unregisteredAmount: 127,
            duringUnbonding: false,
          }),
          makeVestingValidatorSlash({
            timeMs: 8,
            amount: 20,
            unregisteredAmount: 20,
            duringUnbonding: true,
          }),
        ],
      },
    ])
  })
})
