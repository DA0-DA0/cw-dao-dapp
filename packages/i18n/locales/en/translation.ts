// elsehow 13331
const en = {

  // words - mere words
  On: 'On',
  Off: 'Off',
  None: 'None',
  Back: 'Back',
  Continue: 'Continue',
  Review: 'Review',
  // 'Remaining' as in: 'Remaining: 5 hours'
  'Remaining (time)': 'Remaining',
  // 'ok.' 'understood.' 'alright.'
  'Got it': 'Got it',
  // 'warning!' 'danger!' 'pay attention!'
  'Watch out!': 'Watch out!',
  // acknowledge that you have understood the danger.
  'I understand': 'I accept the danger',

  // DAO vocabulary
  Members: 'Members',
  Addresses: 'Addresses',
  Treasury: 'Treasury',
  Info: 'Info',
  'Voting weight': 'Voting weight',

  'Voting duration': 'Voting duration',
  'Voting duration description': 'The amount of time that a proposal will remain open for voting. After this time elapses, the proposal will either pass or fail.',

  'Proposal deposit': 'Proposal deposit',
  'Proposal deposit description': 'The number of governance tokens that must be deposited in order to create a proposal. Setting this high may deter spam, but setting it too high may limit broad participation.',

  Staking: 'Staking',
  'Unstaking period': 'Unstaking period',
  'Unstaking period description': "In order to vote, members must stake their tokens with the DAO. Members who would like to leave the DAO or trade their governance tokens must first unstake them. This setting configures how long members have to wait after unstaking their tokens for those tokens to become available. The longer you set this duration, the more sure you can be that people who register their tokens are keen to participate in your DAO's governance.",

  'Passing threshold': 'Passing threshold',
  'Passing threshold description': "The percentage of votes that must be 'yes' in order for a proposal to pass. For example, with a 50% passing threshold, half of the voting power must be in favor of a proposal to pass it.",

  Quorum: 'Quorum',
  'Quorum description': 'The minumum percentage of voting power that must vote on a proposal for it to be considered. For example, in the US House of Representatives, 218 members must be present for a vote. If you have an org with many inactive members, setting this value too high may make it difficult to pass proposals.',


  'Proposal deposit refund': 'Refund failed proposals',
  'Proposal deposit refund description': 'Should a failed proposal have its deposit refunded to the proposer? (Proposals that pass will always have their deposit returned). Turning this on, particularly when proposal deposits are high, may encourage members to deliberate with other members before creating a proposal.',

  'Governance token': 'Governance token',
  Majority: 'Majority',
  'Vote status': 'Vote status',
  'Ratio of votes': 'Ratio of votes',
  Yes: 'Yes',
  No: 'No',
  Abstain: 'Abstain',
  Passing: 'Passing',
  Failing: 'Failing',
  Turnout: 'Turnout',
  Reached: 'Reached',
  'Not met': 'Not met',
  Claim: 'Claim',
  Unclaimed: 'Unclaimed',
  Manage: 'Manage',
  // TODO - refactor
  // TODO - not zero
  DAO_zero: 'DAO',
  DAO_other: 'DAOs',
  Proposals: 'Proposals',
  // TODO redo numbers
  proposal_zero: '{{count}} proposals',
  proposal_one: '{{count}} proposal',
  proposal_other: '{{count}} proposals',
  // TODO redo numbers
  Message_one: 'Message',
  Message_other: 'Messages',

  // Descriptions of DAO mechanics
  // think: what the words above mean, and how they fit together.
  'All abstain clarification': 'All abstain', // TODO  change to 'All abstain' as the key
  'All abstain clarification (long)': 'When all abstain, a proposal will fail',

  // Components of a DAO
  //
  // NOTE: Make sure these terms harmonize
  // with the terms we use for DAOs.
  // See DAO vocabulary, above.
  'DAO name': 'DAO name',
  // these are
  'Governance details': 'Governance details',

  // DAO DAO UI
  //
  //
  // Names for UI ideas
  'Favorited': 'Favorited',
  'Favorite': 'Favorite',

  // Names for UI states
  'Dark theme': 'Dark theme',
  'Light theme': 'Light theme',
  // Names for UI places
  Documentation: 'Documentation',
  Feedback: 'Feedback',
  // Names for UI actions
  // (think: names for things you can use the UI *do*)
  'Explore DAOs': 'Explore all DAOs',
  // TODO DRY
  'Create a DAO': 'Create a DAO',
  'Create a DAO (long)':
    "You're not a member of any DAOs. Why not create one?",
  'Create DAO': 'Create DAO',
  // TODO DRY
  Search: 'Search',
  'Search for a DAO': 'Search for a DAO', // TODO placeholder?


  // DAO creation steps
  'Choose a structure': 'Choose a structure',
  'Describe the DAO': 'Describe the DAO',
  'Configure voting': 'Configure voting',
  'Configure voting description': 'Add members, configure voting thresholds, and (optionally) use governance tokens to determine voting share.',
  'Review and submit': 'Review and submit',

  // Choosing a DAO's structure
  'Simple DAO': 'Simple DAO',
  'Simple DAO description': 'Small organization with a few members who are likely to stick around. Members can be added and removed by a vote of existing members.',
  'Gov token DAO': 'Token-based DAO',
  'Gov token DAO description': 'Fluid organization with many members who leave and join frequently. Members can join and leave by exchanging governance shares.',

  // Configuring a DAO's description
  'DAO name placeholder': "DAO's name...",
  'DAO description placeholder': "DAO's description...",
  'Add an image': 'Add an image',
  'Image URL': 'Image URL',
  'Image URL tooltip': 'A link to the image that you would like to use to represent your governance contract. For example, https://moonphase.is/image.svg',

  // Configuring a DAO's membership and voting system
  // configure voting
  'Member address placeholder': "Member's address",
  'Add member': 'Add member',
  Tier: 'Tier',
  'Tier name': 'Tier name',
  'Tier description': 'The "class" of member. For example: "Core developers," "friends and family." These names are only for your reference.',
  'Add tier': 'Add tier',
  'Advanced configuration warning': 'This is an advanced feature. Threshold and quorum can interact in counterintuitive ways. If you configure them without fully understanding how they work, you may end up locking your org, making it impossible to pass proposals.',



  // Viewing your relation to a DAO
  'You are a member': "You're a member",
  // TODO staking/tokens you hold


  // Connect a wallet
  //
  // NOTE: We need to communicate with users about wallets because
  // wallets are poorly designed, poorly supported by major browsers,
  // and poorly understood, in that order. I recommend literal
  // translations here, even if they're clunky.
  'Need wallet to continue': "You'll need wallet to continue",
  'Need wallet to continue (long)':
    'Your wallet is your digital identity on the blockchain. Having one lets you interact with web3 applications like DAO DAO.\nWe recommend the Keplr wallet',
  'Install Keplr': 'Install Keplr',
  'Configure wallet to continue': 'Configure your wallet to continue',
  'Configure wallet to continue (long)':
    "You have Keplr installed, but it doesn't seem like you've set up a wallet. To continue, open the Keplr extension and set up a wallet.\nTo open the Keplr extension press the puzzle icon in the top right of your browser and then press the Keplr button. Once you've done that, a new page will open where you'll be able to create a new account. Configure your wallet to continue",



  // DAO DAO landing page
  'short tagline': '$t(DAO_other) for everyone.',
  'long tagline':
    'Simple, capable, and free $t(DAO_zero) tooling. Built with love, by DAO DAO, on Juno.',
  'Enter the app': 'Enter the app',
  'Create DAOs ': 'Create DAOs.',
  'Create DAO tagline':
    'Create and grow a DAO for your community with a simple user interface. No command line required.',
  'Propose and vote': 'Propose and vote',
  'Propose and vote tagline':
    'Proposals can do anything you can do on chain. They pass when the community votes on them.',
  'IBC enabled': 'IBC enabled',
  'IBC enabled tagline':
    'DAOs can manage IBC assets, instantiate smart contracts, and manage entire protocols.',
  'Powered by Juno': 'Powered by Juno',
  'Connect wallet': 'Connect wallet',
  'Home page': 'Home',



  success: {
    voteCast: 'Vote successfully cast.',
    proposalExecuted: 'Executed successfully',
  },

  error: {
    loadingData: 'Failed to load data.',
    DAONotFound: 'DAO not found.',
    proposalNotfound: 'Proposal not found.',
    noVotingPower: 'You have not given anyone voting power. Add some members to your DAO.',
    noMembers: "You haven't added any members to your DAO",
    noGovTokenInfo: "You didn't give enough information about your governance token.",
    noGovTokenAddr: "You didn't provide an address for your governance token.",
  },
}

export default en
