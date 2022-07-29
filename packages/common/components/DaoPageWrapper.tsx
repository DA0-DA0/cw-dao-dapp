import { NextSeo } from 'next-seo'
import {
  ComponentType,
  PropsWithChildren,
  createContext,
  useContext,
} from 'react'

import {
  DaoNotFound,
  Loader as DefaultLoader,
  Logo as DefaultLogo,
  PageLoader as DefaultPageLoader,
  LoaderProps,
  LogoProps,
  SuspenseLoader,
} from '@dao-dao/ui'
import { ProposalModule } from '@dao-dao/utils'
import { VotingModuleAdapterProvider } from '@dao-dao/voting-module-adapter'

import { WalletProvider } from './WalletProvider'

export interface DaoInfo {
  coreAddress: string
  votingModuleAddress: string
  votingModuleContractName: string
  proposalModules: ProposalModule[]
  name: string
  description: string
  imageUrl: string | null
}

const DaoInfoContext = createContext<DaoInfo | null>(null)

export const useDaoInfoContext = () => {
  const context = useContext(DaoInfoContext)
  if (!context) {
    throw new Error(
      'useDaoInfoContext can only be used in a descendant of DaoInfoContext.Provider.'
    )
  }

  return context
}

export type DaoPageWrapperProps = PropsWithChildren<{
  url?: string | null
  title: string
  description: string
  info?: DaoInfo
  Logo?: ComponentType<LogoProps>
  Loader?: ComponentType<LoaderProps>
  PageLoader?: ComponentType<LoaderProps>
}>

export interface DaoProposalPageWrapperProps extends DaoPageWrapperProps {
  proposalId: string | undefined
}

export const DaoPageWrapper = ({
  url,
  title,
  description,
  info,
  children,
  Logo = DefaultLogo,
  Loader = DefaultLoader,
  PageLoader = DefaultPageLoader,
}: DaoPageWrapperProps) => (
  <>
    <NextSeo
      description={description}
      openGraph={{
        ...(!!url && { url }),
        type: 'website',
        title,
        description,
        ...(!!info?.imageUrl && { images: [{ url: info.imageUrl }] }),
      }}
      title={title}
    />

    <SuspenseLoader fallback={<PageLoader />}>
      {info ? (
        // Add a unique key here to tell React to re-render everything when the
        // `coreAddress` is changed, since for some insane reason, Next.js does
        // not reset state when navigating between dynamic rotues. Even though
        // the `info` value passed below changes, somehow no re-render occurs...
        // unless the `key` prop is unique. See the issue below for more people
        // compaining about this to no avail.
        // https://github.com/vercel/next.js/issues/9992
        <DaoInfoContext.Provider key={info.coreAddress} value={info}>
          <VotingModuleAdapterProvider
            contractName={info.votingModuleContractName}
            options={{
              votingModuleAddress: info.votingModuleAddress,
              coreAddress: info.coreAddress,
              Logo,
              Loader,
            }}
          >
            {children}
          </VotingModuleAdapterProvider>
        </DaoInfoContext.Provider>
      ) : (
        <DaoNotFound />
      )}
    </SuspenseLoader>
  </>
)

export interface SdaDaoPageWrapperProps extends DaoPageWrapperProps {
  Header: ComponentType
  Loader: ComponentType<LoaderProps>
  PageLoader: ComponentType<LoaderProps>
  Logo: ComponentType<LogoProps>
}

export const SdaDaoPageWrapper = ({
  Header,
  Loader,
  PageLoader,
  Logo,
  children,
  ...props
}: SdaDaoPageWrapperProps) => (
  <DaoPageWrapper
    {...props}
    Loader={Loader}
    Logo={Logo}
    PageLoader={PageLoader}
  >
    <WalletProvider Loader={Loader}>
      <Header />

      <SuspenseLoader
        // Make room at top for Header.
        fallback={<PageLoader className="!min-h-[calc(100vh-5rem)]" />}
      >
        <div className="p-4 mx-auto sm:p-8 max-w-page">{children}</div>
      </SuspenseLoader>
    </WalletProvider>
  </DaoPageWrapper>
)
