# VetoProposal

Veto a proposal in a DAO.

## Bulk import format

This is relevant when bulk importing actions, as described in [this
guide](https://github.com/DA0-DA0/dao-dao-ui/wiki/Bulk-importing-actions).

### Key

`vetoProposal`

### Data format

```json
{
  "chainId": "<CHAIN ID>",
  "coreAddress": "<DAO CORE ADDRESS>",
  "proposalModuleAddress": "<PROPOSAL MODULE ADDRESS>",
  "proposalNumber": <PROPOSAL NUMBER>
}
```
