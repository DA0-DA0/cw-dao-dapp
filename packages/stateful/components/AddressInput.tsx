import { useQueries, useQueryClient } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useMemo } from 'react'
import { FieldValues, Path, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import { indexerQueries, profileQueries } from '@dao-dao/state/query'
import {
  AddressInput as StatelessAddressInput,
  useChain,
} from '@dao-dao/stateless'
import { AddressInputProps, Entity, EntityType } from '@dao-dao/types'
import {
  POLYTONE_CONFIG_PER_CHAIN,
  getAccountAddress,
  isValidBech32Address,
  makeCombineQueryResultsIntoLoadingData,
} from '@dao-dao/utils'

import { useQueryLoadingDataWithError } from '../hooks'
import { entityQueries } from '../queries/entity'
import { EntityDisplay } from './EntityDisplay'

export const AddressInput = <
  FV extends FieldValues,
  FieldName extends Path<FV>,
>(
  props: AddressInputProps<FV, FieldName>
) => {
  const currentChain = useChain()
  const { t } = useTranslation()

  // Null if not within a FormProvider.
  const formContext = useFormContext<FV>()
  const watch = props.watch || formContext?.watch
  const formValue = (
    props.fieldName ? watch?.(props.fieldName) : props.value
  ) as string | undefined

  const hasFormValue =
    formValue &&
    formValue.length >= 3 &&
    // Don't search name if it's an address.
    !isValidBech32Address(formValue, currentChain.bech32Prefix)

  const searchProfilesLoading = useQueryLoadingDataWithError(
    profileQueries.searchByNamePrefix(
      hasFormValue && props.type !== 'contract'
        ? {
            chainId: currentChain.chainId,
            namePrefix: formValue,
          }
        : undefined
    )
  )

  // Search DAOs on current chains and all polytone-connected chains so we can
  // find polytone accounts.
  const searchedDaos = useQueries({
    queries:
      hasFormValue && props.type !== 'wallet'
        ? [
            // Current chain.
            currentChain.chainId,
            // Chains that have polytone connections with the current chain.
            ...POLYTONE_CONFIG_PER_CHAIN.filter(([, destChains]) =>
              Object.keys(destChains).includes(currentChain.chainId)
            ).map(([chainId]) => chainId),
          ].map((chainId) =>
            indexerQueries.searchDaos({
              chainId,
              query: formValue,
              limit: 5,
            })
          )
        : [],
    combine: makeCombineQueryResultsIntoLoadingData({
      firstLoad: 'none',
      transform: (results) => results.flatMap((r) => r.hits),
    }),
  })

  const queryClient = useQueryClient()
  const loadingEntities = useQueries({
    queries: [
      ...(!searchProfilesLoading.loading && !searchProfilesLoading.errored
        ? searchProfilesLoading.data.map(({ address }) =>
            entityQueries.info(queryClient, {
              chainId: currentChain.chainId,
              address,
            })
          )
        : []),
      ...(!searchedDaos.loading
        ? searchedDaos.data.flatMap(({ chainId, id: address }) =>
            entityQueries.info(queryClient, {
              chainId,
              address,
            })
          )
        : []),
    ],
    combine: makeCombineQueryResultsIntoLoadingData<Entity>({
      firstLoad: 'none',
      transform: (entities) =>
        // Only show entities that are on the current chain or are DAOs with
        // accounts (polytone probably) on the current chain.
        entities.filter(
          (entity) =>
            entity.chainId === currentChain.chainId ||
            (entity.type === EntityType.Dao &&
              getAccountAddress({
                accounts: entity.daoInfo.accounts,
                chainId: currentChain.chainId,
              }))
        ),
    }),
  })

  // Use Fuse to search combined profiles and DAOs by name so that is most
  // relevant (as opposed to just sticking DAOs after profiles).
  const fuse = useMemo(
    () =>
      new Fuse(loadingEntities.loading ? [] : loadingEntities.data, {
        keys: ['name'],
      }),
    // Only reinstantiate fuse when entities deeply changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useDeepCompareMemoize([loadingEntities])
  )
  const searchedEntities = useMemo(
    () => (hasFormValue ? fuse.search(formValue).map(({ item }) => item) : []),
    [formValue, fuse, hasFormValue]
  )

  return (
    <StatelessAddressInput<FV, FieldName>
      {...props}
      EntityDisplay={props.EntityDisplay || EntityDisplay}
      autoComplete="off"
      autofillEntities={
        hasFormValue
          ? {
              entities: searchedEntities,
              loading:
                (props.type !== 'contract' &&
                  (searchProfilesLoading.loading ||
                    (!searchProfilesLoading.errored &&
                      searchProfilesLoading.updating))) ||
                (props.type !== 'wallet' &&
                  (searchedDaos.loading || searchedDaos.updating)) ||
                loadingEntities.loading ||
                !!loadingEntities.updating,
            }
          : undefined
      }
      placeholder={
        props.placeholder ||
        t('form.addressInputPlaceholder', { context: props.type || 'any' })
      }
    />
  )
}
