import 'ui/globals.css'
import 'styles/app.css'
import { useState, useEffect } from 'react'
import { Suspense } from 'react'

import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'

import { RecoilRoot } from 'recoil'

import { DEFAULT_THEME_NAME, ThemeProvider } from 'ui'

import ErrorBoundary from 'components/ErrorBoundary'
import { HomepageLayout } from 'components/HomepageLayout'
import SidebarLayout from 'components/Layout'
import LoadingScreen from 'components/LoadingScreen'
import Notifications from 'components/Notifications'

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()

  const [theme, setTheme] = useState(DEFAULT_THEME_NAME)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => setLoaded(true), [])
  useEffect(() => {
    setTheme((theme) => {
      const savedTheme = localStorage.getItem('theme')
      const themeToUse = savedTheme ? savedTheme : theme
      document.documentElement.setAttribute('data-theme', themeToUse)
      return themeToUse
    })
  }, [])

  function updateTheme(themeName: string) {
    document.documentElement.setAttribute('data-theme', themeName)
    setTheme(themeName)
    localStorage.setItem('theme', themeName)
  }

  const Layout = router.pathname === '/' ? HomepageLayout : SidebarLayout

  return (
    <RecoilRoot>
      <ErrorBoundary title="An unexpected error occured.">
        <Suspense fallback={<LoadingScreen />}>
          <ThemeProvider updateTheme={updateTheme} theme={theme}>
            {loaded && (
              <Layout>
                <Component {...pageProps} />
                <Notifications />
              </Layout>
            )}
          </ThemeProvider>
        </Suspense>
      </ErrorBoundary>
    </RecoilRoot>
  )
}
export default MyApp
