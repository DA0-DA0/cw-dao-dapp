import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { Event, StargateClient } from '@cosmjs/stargate'
import {
  Comet38Client,
  HttpBatchClient,
  HttpBatchClientOptions,
  Tendermint34Client,
  Tendermint37Client,
  connectComet,
} from '@cosmjs/tendermint-rpc'

import {
  OmniFlix,
  bitsong,
  cosmos,
  cosmwasm,
  feemarket,
  ibc,
  interchain_security,
  juno,
  kujira,
  neutron,
  noble,
  osmosis,
} from '@dao-dao/types/protobuf'

import { getLcdForChainId, getRpcForChainId, isSecretNetwork } from './chain'
import { retry } from './misc'
import { SecretCosmWasmClient } from './secret'

type HandleConnect<T, P> = (chainId: string, ...args: P[]) => Promise<T>
type ChainClientRouterOptions<T, P> = {
  /**
   * The connection handler that returns the client for a given chain ID.
   */
  handleConnect: HandleConnect<T, P>
}

/*
 * This is a client wrapper that preserves singletons of connected clients for
 * many chains.
 *
 * @example
 * ```
 * export const stargateClientRouter = new ChainClientRouter({
 *   handleConnect: (chainId: string) => StargateClient.connect(
 *     getRpcForChainId(chainId)
 *   ),
 * })
 *
 * const client = await stargateClientRouter.connect(CHAIN_ID);
 *
 * const queryResponse = await client.queryContractSmart(...);
 * ```
 */
class ChainClientRouter<T, P> {
  private readonly handleConnect: HandleConnect<T, P>
  private instances: Record<string, T> = {}

  constructor({ handleConnect }: ChainClientRouterOptions<T, P>) {
    this.handleConnect = handleConnect
  }

  /*
   * Connect to the chain and return the client or return an existing instance
   * of the client.
   */
  async connect(chainId: string, ...args: P[]): Promise<T> {
    if (!this.instances[chainId]) {
      const instance = await this.handleConnect(chainId, ...args)
      this.instances[chainId] = instance
    }

    return this.instances[chainId]
  }
}

const httpBatchClientOptions: Partial<HttpBatchClientOptions> = {
  // Some RPCs set a batch size limit of 10.
  batchSizeLimit: 10,
}

/**
 * Router for connecting to CosmWasmClient for the appropriate chain.
 *
 * Uses SecretCosmWasmClient for Secret Network mainnet and testnet.
 *
 * Defaults to CosmWasmClient for all other chains.
 */
export const cosmWasmClientRouter = new ChainClientRouter({
  handleConnect: async (chainId: string) =>
    retry(10, async (attempt) => {
      const rpc = getRpcForChainId(chainId, attempt - 1)

      const httpClient = new HttpBatchClient(rpc, httpBatchClientOptions)
      const tmClient = await (
        (
          await connectComet(rpc)
        ).constructor as
          | typeof Tendermint34Client
          | typeof Tendermint37Client
          | typeof Comet38Client
      ).create(httpClient)

      return isSecretNetwork(chainId)
        ? await SecretCosmWasmClient.secretCreate(tmClient, {
            chainId,
            url: getLcdForChainId(chainId, attempt - 1),
          })
        : await CosmWasmClient.create(tmClient)
    }),
})

/**
 * Router for connecting to SecretCosmWasmClient.
 */
export const secretCosmWasmClientRouter = new ChainClientRouter({
  handleConnect: async (chainId: string) =>
    retry(10, async (attempt) => {
      const rpc = getRpcForChainId(chainId, attempt - 1)

      const httpClient = new HttpBatchClient(rpc, httpBatchClientOptions)
      const tmClient = await (
        (
          await connectComet(rpc)
        ).constructor as
          | typeof Tendermint34Client
          | typeof Tendermint37Client
          | typeof Comet38Client
      ).create(httpClient)

      return await SecretCosmWasmClient.secretCreate(tmClient, {
        chainId,
        url: getLcdForChainId(chainId, attempt - 1),
      })
    }),
})

/*
 * Router for connecting to `StargateClient`.
 */
export const stargateClientRouter = new ChainClientRouter({
  handleConnect: async (chainId: string) =>
    retry(10, async (attempt) => {
      const rpc = getRpcForChainId(chainId, attempt - 1)

      const httpClient = new HttpBatchClient(rpc)
      const tmClient = await (
        (
          await connectComet(rpc)
        ).constructor as
          | typeof Tendermint34Client
          | typeof Tendermint37Client
          | typeof Comet38Client
      ).create(httpClient)

      return await StargateClient.create(tmClient)
    }),
})

/*
 * Factory function to make routers that connect to an RPC client with specific
 * protobufs loaded.
 */
const makeProtoRpcClientRouter = <T, K extends keyof T>(
  protoBundle: {
    ClientFactory: {
      createRPCQueryClient: ({
        rpcEndpoint,
      }: {
        rpcEndpoint: string
      }) => Promise<T>
    }
  },
  key: K
): ChainClientRouter<T[K], never> =>
  new ChainClientRouter({
    handleConnect: async (chainId: string) =>
      retry(
        10,
        async (attempt) =>
          (
            await protoBundle.ClientFactory.createRPCQueryClient({
              rpcEndpoint: getRpcForChainId(chainId, attempt - 1),
            })
          )[key]
      ),
  })

/*
 * Router for connecting to an RPC client with Cosmos protobufs.
 */
export const cosmosProtoRpcClientRouter = makeProtoRpcClientRouter(
  cosmos,
  'cosmos'
)

/*
 * Router for connecting to an RPC client with IBC protobufs.
 */
export const ibcProtoRpcClientRouter = makeProtoRpcClientRouter(ibc, 'ibc')

/*
 * Router for connecting to an RPC client with interchain security protobufs.
 */
export const interchainSecurityProtoRpcClientRouter = makeProtoRpcClientRouter(
  interchain_security,
  'interchain_security'
)

/*
 * Router for connecting to an RPC client with CosmWasm protobufs.
 */
export const cosmwasmProtoRpcClientRouter = makeProtoRpcClientRouter(
  cosmwasm,
  'cosmwasm'
)

/*
 * Router for connecting to an RPC client with Osmosis protobufs.
 */
export const osmosisProtoRpcClientRouter = makeProtoRpcClientRouter(
  osmosis,
  'osmosis'
)

/*
 * Router for connecting to an RPC client with Noble protobufs.
 */
export const nobleProtoRpcClientRouter = makeProtoRpcClientRouter(
  noble,
  'noble'
)

/*
 * Router for connecting to an RPC client with Neutron protobufs.
 */
export const neutronProtoRpcClientRouter = makeProtoRpcClientRouter(
  neutron,
  'neutron'
)

/*
 * Router for connecting to an RPC client with Juno protobufs.
 */
export const junoProtoRpcClientRouter = makeProtoRpcClientRouter(juno, 'juno')

/*
 * Router for connecting to an RPC client with Kujira protobufs.
 */
export const kujiraProtoRpcClientRouter = makeProtoRpcClientRouter(
  kujira,
  'kujira'
)

/*
 * Router for connecting to an RPC client with OmniFlix protobufs.
 */
export const omniflixProtoRpcClientRouter = makeProtoRpcClientRouter(
  OmniFlix,
  'OmniFlix'
)

/*
 * Router for connecting to an RPC client with feemarket protobufs.
 */
export const feemarketProtoRpcClientRouter = makeProtoRpcClientRouter(
  feemarket,
  'feemarket'
)

/*
 * Router for connecting to an RPC client with BitSong protobufs.
 */
export const bitsongProtoRpcClientRouter = new ChainClientRouter({
  handleConnect: async (chainId: string) =>
    retry(
      10,
      async (attempt) =>
        (
          await bitsong.ClientFactory.createRPCQueryClient({
            rpcEndpoint: getRpcForChainId(chainId, attempt - 1),
          })
        ).bitsong
    ),
})

/**
 * Get CosmWasmClient for the appropriate chain.
 *
 * Uses SecretCosmWasmClient for Secret Network mainnet and testnet.
 *
 * Defaults to CosmWasmClient for all other chains.
 */
export const getCosmWasmClientForChainId = async (
  chainId: string
): Promise<CosmWasmClient> =>
  isSecretNetwork(chainId)
    ? await secretCosmWasmClientRouter.connect(chainId)
    : await cosmWasmClientRouter.connect(chainId)

/**
 * In response events from a transaction with a wasm event, gets the attribute
 * key for a given contract address.
 */
export const findWasmAttributeValue = (
  chainId: string,
  events: readonly Event[],
  contractAddress: string,
  attributeKey: string
): string | undefined => {
  const wasmEvent = events.find(
    ({ type, attributes }) =>
      type === 'wasm' &&
      attributes.some(
        ({ key, value }) =>
          key ===
            (isSecretNetwork(chainId)
              ? 'contract_address'
              : '_contract_address') && value === contractAddress
      ) &&
      attributes.some(({ key }) => key === attributeKey)
  )
  return wasmEvent?.attributes.find(({ key }) => key === attributeKey)!.value
}

/**
 * In response events from a transaction, gets the first attribute value for an
 * attribute key in the first event of a given type.
 */
export const findEventsAttributeValue = (
  events: readonly Event[],
  eventType: string,
  attributeKey: string
): string | undefined =>
  events.flatMap(
    ({ type, attributes }) =>
      (type === eventType &&
        attributes.find(({ key }) => key === attributeKey)) ||
      []
  )[0]?.value
