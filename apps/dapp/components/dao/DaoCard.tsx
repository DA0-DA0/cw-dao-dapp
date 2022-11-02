// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.

import { useWallet } from '@noahsaso/cosmodal'
import { useEffect } from 'react'

import { usePinnedDaos } from '@dao-dao/state'
import { LinkWrapper, daoCardInfoLazyDataSelector } from '@dao-dao/stateful'
import {
  DaoCard as StatelessDaoCard,
  useCachedLoadable,
} from '@dao-dao/stateless'
import { DaoCardInfo } from '@dao-dao/types/components/DaoCard'
import { CHAIN_ID, loadableToLoadingData } from '@dao-dao/utils'

export const DaoCard = (props: DaoCardInfo) => {
  const { address: walletAddress } = useWallet()
  const { isPinned: isDaoPinned, setPinned, setUnpinned } = usePinnedDaos()

  const lazyDataLoadable = useCachedLoadable(
    daoCardInfoLazyDataSelector({
      coreAddress: props.coreAddress,
      chainId: props.chainId,
      walletAddress,
    })
  )

  //! Loadable errors.
  useEffect(() => {
    if (lazyDataLoadable.state === 'hasError') {
      console.error(lazyDataLoadable.contents)
    }
  }, [lazyDataLoadable.contents, lazyDataLoadable.state])

  return (
    <StatelessDaoCard
      {...props}
      LinkWrapper={LinkWrapper}
      hidePin={
        // Don't allow pinning if on different chain. This prevents pinning
        // featured mainnet DAOs on testnet.
        props.chainId !== CHAIN_ID
      }
      lazyData={loadableToLoadingData(lazyDataLoadable, {
        isMember: false,
        tokenBalance: NaN,
        proposalCount: NaN,
      })}
      onPin={() =>
        isDaoPinned(props.coreAddress)
          ? setUnpinned(props.coreAddress)
          : setPinned(props.coreAddress)
      }
      pinned={isDaoPinned(props.coreAddress)}
    />
  )
}
