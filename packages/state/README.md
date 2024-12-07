# @dao-dao/state

State retrieval and management for the DAO DAO UI.

## Layout

| Location                   | Summary                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`clients`](./clients)     | Object-oriented clients for interacting with DAOs.                                                                                       |
| [`contracts`](./contracts) | Smart contract query and execute clients auto-generated with [@cosmwasm/ts-codegen](https://www.npmjs.com/package/@cosmwasm/ts-codegen). |
| [`graphql`](./graphql)     | GraphQL-related state, such as the Stargaze API.                                                                                         |
| [`indexer`](./indexer)     | Functions for accessing the DAO DAO indexer.                                                                                             |
| [`query`](./query)         | [React Query](https://tanstack.com/query/latest/docs/framework/react/overview)-related client and queries.                               |
| [`recoil`](./recoil)       | [Recoil](https://recoiljs.org/) atoms and selectors for loading and caching state.                                                       |
