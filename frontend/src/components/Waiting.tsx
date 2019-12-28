import React, { Suspense } from 'react'
import { view } from 'react-easy-state'
import LoaderSpinner from '/components/LoaderSpinner'

function WaitingComponent<P extends object>(Component: React.ComponentType<P>) {
  return view((props: P) => (
    <Suspense fallback={<LoaderSpinner size="sm" />}>
      <Component {...props} />
    </Suspense>
  ))
}

export default WaitingComponent
